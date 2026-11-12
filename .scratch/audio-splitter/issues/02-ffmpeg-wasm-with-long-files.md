# ffmpeg.wasm with long files in Chrome

Type: research
Status: resolved

## Question

The user chose ffmpeg.wasm for container work. What are its real limits and setup costs for a 1–3 h source file (roughly 100–700 MB) in desktop Chrome, inside a Vite + Vue 3 app?

Find, with sources:

- Current package names, versions and maintenance state (`@ffmpeg/ffmpeg`, `@ffmpeg/core`, `@ffmpeg/core-mt`, `@ffmpeg/util`), and which ffmpeg version the core wraps.
- Maximum input size and memory ceiling (wasm32 address space), and what happens near it.
- How to hand it a `File` without copying the whole file into memory: `writeFile` versus mounting with WORKERFS, and any limits of the mount (read-only, seeking).
- How large outputs leave it: reading many output files back, and whether outputs can be streamed out instead of held in memory.
- Single-thread versus multi-thread core: speed difference for audio work, and whether the multi-thread core needs cross-origin isolation headers (COOP/COEP) in Vite dev and in a static production host.
- Download size of the core, how it is loaded under Vite (CDN versus bundled, `toBlobURL`), and whether it can be self-hosted so that nothing is fetched from a third party at runtime.
- Whether it already runs in its own worker, and how progress and cancellation are exposed.
- Licence implications of the default core build for a personal, possibly public, static site.

Answer with a recommended setup and a list of facts the spike must verify by measurement.

## Answer

Researched on 2026-11-13. Three kinds of statement appear below and are kept apart:

- **Source** means a document or the published code says it; the URL follows.
- **Measured** means I ran it locally (details in "How the local checks were run" at the end). The only audio used was the project's real sample, `samples/sample1.m4a` (AAC-LC, 1 h 01 min, 89 MB), read in place and never copied or changed. Nothing was measured on a 3 h or 700 MB file.
- **Inference** means my own conclusion from the two above.

Some terms used throughout:

- **WebAssembly (wasm)** is a compact binary code format that browsers run at near-native speed. ffmpeg.wasm is the C program FFmpeg compiled to WebAssembly.
- **Emscripten** is the compiler toolchain that did that compilation. It also supplies a small JavaScript "glue" file and a virtual file system, because a browser page has no real disk.
- A **core** is the pair of files that is FFmpeg itself: `ffmpeg-core.js` (the glue) and `ffmpeg-core.wasm` (the program).
- A **Web Worker** is a background thread of a web page. Work done there does not freeze the user interface.
- The **wasm heap** is the single block of memory a WebAssembly program can use for its own data. A 32-bit WebAssembly program ("wasm32") can address at most 4 GB, and a given build may set a lower cap.
- **MEMFS** is Emscripten's default in-memory file system: every file is a byte array in RAM. **WORKERFS** is a second Emscripten file system that exposes a browser `File` to the program read-only, reading pieces from disk on demand.
- **Stream copy** (`-c copy`) means cutting audio by moving the already-compressed data into new files without decoding it. **Decoding** means turning compressed audio into raw samples (**PCM**), which is far larger.

### Recommended setup

1. **Packages, pinned to exact versions**: `@ffmpeg/ffmpeg@0.12.15` (the wrapper class, MIT) and `@ffmpeg/core@0.12.10` (the single-thread core, GPL-2.0-or-later). `@ffmpeg/util` is not needed: its two helpers either download from a CDN (`toBlobURL`) or read the whole file into memory (`fetchFile`), and this setup does neither. Pin exactly, because the project has had no release since January 2025.
2. **Use the single-thread core.** The audio decoders in this build cannot use threads, stream copy does no decoding at all, and the multi-thread core adds header requirements, a fixed 1 GB memory reservation and known instability for no gain here.
3. **Hand the `File` over by mounting it with WORKERFS**, not with `writeFile`. Create the mount directory first, mount under a fixed safe name, and write outputs somewhere else, because the mount is read-only:

   ```ts
   await ffmpeg.createDir('/in')
   await ffmpeg.mount(FFFSType.WORKERFS, { blobs: [{ name: 'source.m4a', data: file }] }, '/in')
   // input path is now /in/source.m4a; outputs go to /, which is MEMFS
   ```

   (`FFFSType` is exported by `@ffmpeg/ffmpeg`. Keep the file's real extension in the fixed name.)
4. **Bring outputs back one at a time and free them at once**: `readFile(path)` returns a `Uint8Array` whose memory is moved to the page, then call `deleteFile(path)` immediately, then turn the bytes into a `Blob` or write them to disk (delivery is ticket 08). There is no streaming output in the published API, so every output must fit in RAM. Keep each output small (one track, or one time slice of decoded audio), never one huge file.
5. **Treat a loaded worker as short-lived.** With the published core, repeated `exec` calls on one instance crash after a few dozen to roughly 160 calls. Give each `FFmpeg` instance a small budget of calls (start with 20), then `terminate()`, `load()` and mount again. Reloading measured 25–40 ms once the files were cached. Wrap every call in your own watchdog timer, because one failure mode is a call that never returns.
6. **Self-host the core through Vite**, so nothing is fetched from a third party:

   ```ts
   import { FFmpeg } from '@ffmpeg/ffmpeg'
   import coreURL from '@ffmpeg/core?url'
   import wasmURL from '@ffmpeg/core/wasm?url'

   const ffmpeg = new FFmpeg()
   await ffmpeg.load({ coreURL, wasmURL })
   ```

   Always pass both URLs: if `coreURL` is left out the wrapper downloads core 0.12.9 from `unpkg.com`. Add `optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] }` to `vite.config.ts` as upstream advises. Do not use `toBlobURL`; it exists to get around cross-origin limits of a CDN and it defeats the browser's cache of compiled WebAssembly.
7. **Headers**: none are required for the single-thread core. The static host only needs to serve `.wasm` as `Content-Type: application/wasm` and should compress it (32.2 MB raw, about 10.3 MB with gzip, about 7.2 MB with Brotli, a newer and stronger compression format that browsers accept).
8. **Progress and cancel**: compute progress yourself (tracks finished, or the `time` field of the `progress` event divided by the expected duration). Cancel with `terminate()`; the `AbortSignal` option does not stop the work.
9. **Licence**: publishing the default core on a public site means distributing a GPL program. Link to its exact source and licence text from the site, and keep the app's own code under a GPL-compatible licence (see the last finding).

### Findings

#### 1. Packages, versions, maintenance, wrapped FFmpeg version

| Package | Latest | Published | Licence | Role |
| --- | --- | --- | --- | --- |
| `@ffmpeg/ffmpeg` | 0.12.15 | 2025-01-07 | MIT | Wrapper class; starts the worker and talks to it |
| `@ffmpeg/core` | 0.12.10 | 2025-01-07 | GPL-2.0-or-later | Single-thread core |
| `@ffmpeg/core-mt` | 0.12.10 | 2025-04-28 | GPL-2.0-or-later | Multi-thread core |
| `@ffmpeg/util` | 0.12.2 | 2025-01-07 | MIT | `fetchFile`, `toBlobURL` helpers |
| `@ffmpeg/types` | 0.12.4 | 2025-01-06 | MIT | Types, pulled in by the wrapper |

- Source (versions, dates, licences): npm registry metadata, read with `npm view` on 2026-11-13. <https://www.npmjs.com/package/@ffmpeg/ffmpeg>, <https://www.npmjs.com/package/@ffmpeg/core>, <https://www.npmjs.com/package/@ffmpeg/core-mt>, <https://www.npmjs.com/package/@ffmpeg/util>
- The core wraps **FFmpeg n5.1.4**, built with Emscripten 3.1.40. Source: <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/Dockerfile> and <https://ffmpegwasm.netlify.app/docs/overview>. Measured: the loaded core prints `ffmpeg version 5.1.4 ... built with emcc 3.1.40`. FFmpeg 5.1 is a 2022 release line; the Dockerfile comment says the project "cannot upgrade to n6.0" because newer FFmpeg command-line code requires threads.
- The wrapper's built-in default is core **0.12.9 from unpkg.com**, not 0.12.10 and not local. Source: `CORE_VERSION` and `CORE_URL` in the published `dist/esm/const.js`; <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/ffmpeg/src/const.ts>
- Maintenance state, from the public GitHub API on 2026-11-13: the repository is not archived; the last release is `v12.15` of 2025-01-07; the last commit on `main` is a README edit of 2025-09-17; 459 issues and pull requests are open. Several fixes relevant to this project are open and unmerged pull requests from August–September 2026 (#943 stack pointer, #952 state reset and ffprobe exit code, #984 chunked file access). A collaborator wrote in June 2025 that the team is "pretty bandwidth limited". <https://github.com/ffmpegwasm/ffmpeg.wasm>, <https://github.com/ffmpegwasm/ffmpeg.wasm/releases>, <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/876>
- Inference: treat the library as stable but effectively frozen. Bugs found in the spike will have to be worked around, not waited out.
- The wrapper does not run in Node: under Node module resolution `@ffmpeg/ffmpeg` resolves to a stub whose constructor throws "ffmpeg.wasm does not support nodejs". Source: the `exports` map and `dist/esm/empty.mjs` in the published package; <https://ffmpegwasm.netlify.app/docs/faq>. Inference: Vitest specs cannot exercise the real library and need a seam to replace it (relevant to ticket 05).

#### 2. Maximum input size and memory ceiling

- Source: the FAQ says the maximum input file size is "2 GB, which is a hard limit in WebAssembly. Might become 4 GB in the future." <https://ffmpegwasm.netlify.app/docs/faq>. Inference: this describes the `writeFile` route, where the file must sit in memory. Users report inputs of 15 GB and 19 GB working through WORKERFS. <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/623>, <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/581>
- The single-thread core's wasm heap starts at 32 MB and may grow to **2 GB**. The multi-thread core's heap is a **fixed 1 GB** that cannot grow. Source: `-sINITIAL_MEMORY=32MB -sALLOW_MEMORY_GROWTH` (single) and `-sINITIAL_MEMORY=1024MB` (multi) in <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/build/ffmpeg-wasm.sh>. Measured: the memory limits written inside the two published `.wasm` files are 512 to 32768 pages (32 MB to 2048 MB) and 16384 to 16384 pages (1024 MB, shared). Browsers have allowed 4 GB since Chrome 83, but only for builds that opt in, and this one does not. <https://v8.dev/blog/4gb-wasm-memory>
- Files are **not** stored in the wasm heap. MEMFS keeps each file as a JavaScript byte array in the worker, and WORKERFS keeps nothing in memory. Source: the `MEMFS` and `WORKERFS` code in the published `ffmpeg-core.js`; <https://emscripten.org/docs/api_reference/Filesystem-API.html>. Inference: the 2 GB heap only has to hold FFmpeg's working buffers, which are small for audio; the real ceiling for this app is how much RAM the MEMFS outputs take.
- A MEMFS file grows by reallocating a 12.5 % larger array and copying the old one into it, and `readFile` makes one more full copy before handing the bytes to the page. Source: `expandFileStorage` and `FS.readFile` in the published `ffmpeg-core.js`. Measured: decoding the 1 h sample to one 650 MB PCM file succeeded, but the browser's memory peaked about 1.5 GB above its level before the run, roughly 2.4 times the output size.
- Measured in Chrome 157 on a 24 GB Mac: a single JavaScript buffer of 8 GB could be allocated and 16 GB could not, so the browser's own per-buffer limit is not the first wall. Not confirmed: the exact limit on other machines, and the largest MEMFS file that works in practice.
- What happens near the limits. Source: when the single-thread heap cannot grow past 2 GB, the glue code's `emscripten_resize_heap` returns `false`, so FFmpeg's memory request fails; in the multi-thread core the same function aborts the program. Both are in the published `ffmpeg-core.js`. Not confirmed: how that failure reaches the page. I did not hit either limit, and I did not measure an out-of-memory failure of a large MEMFS file or a tab crash. Measured for a different failure (finding 5): once the worker has thrown `RuntimeError: memory access out of bounds`, it rejects every later call until it is terminated and loaded again.
- Inference: a 700 MB, 3 h input is not a problem by itself when mounted. A single large **output** is. Decoding 3 h at 44.1 kHz mono 32-bit float would produce about 1.9 GB and should be assumed to fail; decode in time slices or at a reduced sample rate and bit depth (3 h of mono 8 kHz 16-bit PCM is about 173 MB). The decode design belongs to ticket 04.

#### 3. Handing over a `File`: `writeFile` versus WORKERFS

- `writeFile(path, bytes)` needs the whole file as a `Uint8Array` first. The array is moved (not copied) to the worker, and then MEMFS stores its own copy with `buffer.slice`, so for a moment two copies exist, and one stays for as long as the file does. Source: `writeFile` in <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/ffmpeg/src/classes.ts> and <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/ffmpeg/src/worker.ts>; the MEMFS `write` code in the published `ffmpeg-core.js`. Inference: a 700 MB file costs at least 700 MB of RAM for the whole session and about 1.4 GB briefly. Measured only at 89 MB, where memory rose by about 110 MB.
- WORKERFS "provides read-only access to `File` and `Blob` objects inside a worker without copying the entire data into memory and can potentially be used for huge files". Source: <https://emscripten.org/docs/api_reference/Filesystem-API.html>. It is compiled into both published cores (`-lworkerfs.js` in the build script; the glue registers exactly `MEMFS` and `WORKERFS`, so IDBFS and other file systems are not available). The wrapper exposes it as `ffmpeg.mount(fsType, options, mountPoint)` and `ffmpeg.unmount(mountPoint)`, available from `@ffmpeg/ffmpeg` 0.12.10 and core 0.12.4. Source: <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/581>, <https://ffmpegwasm.netlify.app/docs/getting-started/usage>. The usage page only links to the pull request; there is no fuller documentation.
- Mount options, from the published glue code: `files` is a list of `File` objects mounted under their own `name`; `blobs` is a list of `{ name, data }` and lets the app choose the name. Inference: prefer `blobs` with a fixed name, so that odd characters in a user's file name never reach an FFmpeg command line.
- Limits of the mount, from the same code and the issue tracker:
  - It is **read-only**: writing, creating, renaming and deleting inside it throw an error. Outputs must go to MEMFS. <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/757>
  - The mount point directory must exist first (`createDir`), otherwise `mount` fails with "ErrnoError: FS error". Same issue.
  - **Seeking works**: `llseek` is implemented, and each read takes a slice of the file with a synchronous reader (`FileReaderSync`), so only the requested bytes are loaded. Measured: the sample `.m4a` opened in 20 ms and cuts starting anywhere in the file took about 53 ms each.
  - It only works inside a worker (`FileReaderSync` does not exist on the main thread). The wrapper's worker satisfies this.
  - The mount disappears when the worker is terminated and must be made again. Measured: mounting takes under 1 ms.

#### 4. Getting large outputs back

- All outputs are written to MEMFS. The published API offers only whole-file calls: `readFile`, `deleteFile`, `listDir`, `rename`, `createDir`, `deleteDir`. Source: <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/ffmpeg/src/classes.ts>
- `readFile` builds a new array of the file's full size inside the worker and then **transfers** it to the page, which means ownership moves without another copy. The MEMFS copy remains until `deleteFile` is called. Source: `worker.ts` (the `trans.push(data.buffer)` line) and `FS.readFile` in the glue code.
- **Outputs cannot be streamed out** with the published packages. Chunked `open`/`read`/`write`/`close` calls exist only as unmerged pull requests. <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/984>, <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/834>. The author of the WORKERFS change confirms "the output is still written to MEMFS". <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/581>
- Inference: FFmpeg's `pipe:` output is listed among the core's protocols, but its standard output is routed through the text log callback, so it is not a usable binary channel. A custom worker script (the `classWorkerURL` load option) that calls the core's `FS.open`/`FS.read` directly could read in chunks; that is extra code to own and I did not try it. For audio tracks of a few to a few tens of megabytes it should not be needed.
- Measured with the sample: one command that wrote 20 stream-copied files (segment muxer, 89 MB in total) took 1.3 s, and reading all 20 back took 26 ms. Reading back one 650 MB file took 84 ms.
- Inference on shape: one command per track keeps only one track in memory at a time but uses up the call budget of finding 5; one command for all tracks holds the whole output (about the input size) in memory until it is read back. Which shape gives correct cut points per format is ticket 03.

#### 5. A loaded instance survives only a limited number of calls

This was not in the question but decides the design.

- Source: several open issues report `RuntimeError: memory access out of bounds` after tens of `exec` calls on one instance, including one about MP3 conversion. <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/563>, <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/704>, <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/820>
- Source: an open, unmerged pull request explains the cause. FFmpeg ends by calling `exit()`, Emscripten implements that by throwing, the wrapper swallows the exception, and nothing resets the stack pointer, so each call permanently uses up part of a stack that is only 64 KB in the published cores. <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/943>. The stack was raised to 5 MB on `main` on 2025-01-17, ten days after the last single-thread core release, so that change is not in `@ffmpeg/core@0.12.10`. <https://github.com/ffmpegwasm/ffmpeg.wasm/commit/b409e36475bc21f0451b5b1e1d126fa82871439a>
- Measured with core 0.12.10, each on a freshly loaded instance: after two probe calls, 159 stream-copy cuts of the sample succeeded and the next one failed; `exec(['-version'])` failed on the 75th call; `ffprobe(['-version'])` stopped answering on the 32nd, with no error. After the failure every call on that instance fails at once. `terminate()` followed by `load()` and a new mount restored it in 40 ms.
- Measured: settings leak from one call to the next on the same instance (after a `-h` call, later calls logged at debug level), and a successful `ffprobe()` returned exit code -1. The title of an open pull request names both ("reset ffmpeg state, fix ffprobe exit code"); I did not read its code. <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/952>
- Inference: budget calls per instance, reload well before the limit, pass every option explicitly on every call, do not trust the `ffprobe()` return code (read its output file), and put a watchdog around every call.

#### 6. Single-thread versus multi-thread core

- Source: the FAQ says the multi-thread core "can have around 2x speed" but is "more unstable" and "consume[s] a lot more memory and cpu". The only published benchmark is a video transcode: 128.8 s single-thread and 60.4 s multi-thread against 5.2 s native. <https://ffmpegwasm.netlify.app/docs/faq>, <https://ffmpegwasm.netlify.app/docs/performance>. No audio benchmark is published.
- Measured: the core itself reports "Threading capabilities: none" for the decoders `aac`, `mp3`, `mp3float`, `opus` and `libopus`. Stream copy does not decode at all. Inference: the multi-thread core cannot speed up this app's audio work.
- Measured speed of the single-thread core on the sample (12-core Mac, Chrome 157): a 3-minute stream-copy cut took about 53 ms; decoding the full 1 h 01 min to mono 8 kHz 16-bit PCM took 5.7 s; decoding it to mono 44.1 kHz float PCM took 3.5 s. Loading the core took about 0.1 s from a local server.
- The multi-thread core needs `SharedArrayBuffer`, memory shared between threads. A page may use it only when it is **cross-origin isolated**, which means its main document is served with the two response headers `Cross-Origin-Opener-Policy: same-origin` (COOP) and `Cross-Origin-Embedder-Policy: require-corp` (COEP). Source: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer>, <https://web.dev/articles/coop-coep> (last updated 2022), and the caution in <https://ffmpegwasm.netlify.app/docs/getting-started/usage>. Measured: without the headers, loading the multi-thread core fails with "ReferenceError: SharedArrayBuffer is not defined".
- In Vite dev the headers go in `server.headers`; upstream's Vue example does exactly that. <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/vue-vite-app/vite.config.ts>, <https://vite.dev/config/server-options.html>. In production the static host must be able to send custom headers. Not confirmed: which hosts can; I did not find a GitHub Pages statement either way.
- The **single-thread core needs no such headers**. Measured: it loaded and ran on a page where `crossOriginIsolated` was `false`.
- Other costs of the multi-thread core, from the build script: 1 GB of memory is reserved at load and cannot grow, and 32 thread workers are created up front. Measured: my two quick attempts to self-host it under Vite failed (the small thread-worker file was inlined as a `data:` URL in the build, and failed with "Cannot use import statement outside a module" in dev). I did not pursue it, so treat self-hosting of the multi-thread core as unproven.

#### 7. Download size, loading under Vite, self-hosting

- Sizes of `@ffmpeg/core@0.12.10`, measured from the npm package: `ffmpeg-core.wasm` is 32,232,419 bytes (10.2 to 10.4 MB with gzip depending on the tool, 7.2 MB with Brotli at its highest setting) and `ffmpeg-core.js` is 112 KB. The documentation's own button says "~31 MB". The multi-thread wasm is 32.7 MB.
- Upstream's examples load the core from a CDN and wrap each file with `toBlobURL`, which downloads it and re-labels it as a local `blob:` address "to bypass CORS issue"; the same comment says "urls with the same domain can be used directly". For Vite they say to use the `esm` build rather than `umd`. Source: <https://ffmpegwasm.netlify.app/docs/getting-started/usage>
- The installation page says the wrapper itself cannot be imported from a CDN because it starts a worker, and recommends hosting it yourself. <https://ffmpegwasm.netlify.app/docs/getting-started/installation>
- **Self-hosting works with no third-party request.** Vite's `?url` import returns the address of a file and copies the file into the build. Source: <https://vite.dev/guide/features.html> (documentation for Vite 8.3). Measured with Vite 8.3.8: `vite build` emitted `assets/ffmpeg-core-<hash>.js` and `assets/ffmpeg-core-<hash>.wasm`, byte-for-byte the size of the package files, plus the wrapper's worker as `assets/worker-<hash>.js` (2.6 KB); in the browser every request went to the app's own origin, in both `vite preview` and `vite dev`.
- Why the `esm` build: the wrapper starts its worker as a module worker and loads the core with a dynamic `import()`. The package's default `import` entry is already the `esm` file, so `@ffmpeg/core?url` picks the right one. Source: <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/packages/ffmpeg/src/worker.ts>
- Vite's dependency pre-bundling has broken the wrapper's worker in the past ("the code doesn't continue" after `load`); the fix reported there and used in upstream's example is `optimizeDeps.exclude`. <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/815>. Measured with Vite 8.3.8: loading worked in dev both with and without the exclusion. Inference: keep the exclusion; it costs nothing.
- Caching: the glue code compiles the wasm with `WebAssembly.instantiateStreaming(fetch(wasmURL))`. Chrome stores compiled WebAssembly for later visits only for this streaming route, and only when the server sends `Content-Type: application/wasm`. Source: <https://v8.dev/blog/wasm-code-caching> (2019). Inference: a same-origin URL gets this cache and a `blob:` URL made by `toBlobURL` does not, which is a second reason to avoid it.
- Hosting size: GitHub Pages allows sites up to 1 GB with a soft limit of 100 GB of traffic per month, so a 32 MB file fits. <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>

#### 8. Worker, progress, cancellation

- **It already runs in its own worker.** `load()` creates a module worker and every method is a message to it that returns a promise. Source: <https://ffmpegwasm.netlify.app/docs/overview>, `classes.ts`. Inside that worker `exec` runs to completion without yielding, so the worker cannot react to any other message while a command runs. Source: `worker.ts`.
- **Progress.** `ffmpeg.on('progress', ({ progress, time }) => ...)`. `time` is the output position in microseconds. `progress` is that position divided by the longest input duration. The documentation marks progress "experimental"; the code comment says it "only works when the duration of input and output file are the same", so not for a trimmed cut; and an open issue reports large negative values. Source: <https://ffmpegwasm.netlify.app/docs/getting-started/usage>, <https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/src/fftools/ffmpeg.c>, <https://github.com/ffmpegwasm/ffmpeg.wasm/issues/600>. Measured: for whole-file runs on the sample `progress` rose from 0.02 to 1 and `time` ended at 3,686,214,250 (the file is 3686.2 s), but a 5.7 s decode produced only 14 events. Inference: use `time` and your own known duration, or count finished tracks.
- **Logs.** `ffmpeg.on('log', ({ type, message }) => ...)` delivers FFmpeg's text output line by line; this is how duration and stream details are read after a probe.
- **Cancellation.** There are three mechanisms and only one really stops work:
  - `exec(args, timeout, { signal })` with an `AbortSignal` rejects the promise on the page but the worker keeps running the command. Source: `classes.ts`; users confirm in <https://github.com/ffmpegwasm/ffmpeg.wasm/pull/573>
  - The `timeout` argument (milliseconds) is checked inside FFmpeg's main loop and ends the command with exit code 1. Measured: a 500 ms timeout returned after 507 ms and left a partial output file in MEMFS.
  - `ffmpeg.terminate()` kills the worker. Measured: it returns immediately, the pending call rejects with "called FFmpeg.terminate()", and `load()` plus a new mount afterwards took about 25 ms. Everything in MEMFS and the mount are lost.

#### 9. Licence of the default core

- Source: FFmpeg is LGPL 2.1 or later, with optional parts under GPL 2 or later; "if those parts get used the GPL applies to all of FFmpeg". <https://www.ffmpeg.org/legal.html>
- The default core is built with `--enable-gpl --enable-libx264 --enable-libx265` (video encoders this app never uses), so the whole `ffmpeg-core.wasm` is GPL. Measured: that configuration line is printed by the loaded core; the npm licence field is `GPL-2.0-or-later`. The wrapper is MIT. <https://ffmpegwasm.netlify.app/docs/faq>
- Source: whoever makes a GPL binary available on a network server must make the exact corresponding source available as well; instructions pointing to another server or a version-control system are acceptable if they are clear and stay valid. <https://www.gnu.org/licenses/gpl-faq.html#AnonFTPAndSendSources>, <https://www.gnu.org/licenses/gpl-faq.html#SourceAndBinaryOnDifferentSites>. Those answers describe version 3 of the GPL; "2.0 or later" lets the distributor choose version 3.
- Inference (I am not a lawyer): serving the wasm from a public site is distribution, so the site should show a notice that it includes FFmpeg under the GPL, include or link the licence text, and link to the source that matches the binary: the ffmpeg.wasm repository at the release tag, which pins FFmpeg n5.1.4 and each library in its Dockerfile. A site used only by its owner distributes nothing.
- Whether the app's own code must also be GPL is not settled by any source I found. The GPL FAQ says programs that talk through "pipes, sockets and command-line arguments" are "normally separate programs", but that "this is a legal question, which ultimately judges will decide". <https://www.gnu.org/licenses/gpl-faq.html#MereAggregation>. The app passes command-line arguments and files to a separate worker, which leans towards "separate". Inference: for a personal project the cheap and safe choice is to publish the app's source under a GPL-compatible licence such as MIT or GPL.
- A way out that stays within ffmpeg.wasm: the documentation calls the core "a swappable component" and supports custom builds through Docker. A build without `--enable-gpl` and without the video libraries would be LGPL and much smaller. That is real build work and I did not try it. <https://ffmpegwasm.netlify.app/docs/overview>
- Not researched: patent licensing for the audio formats. The FFmpeg legal page says it cannot advise on it.

### For the spike to verify

Everything measured above came from one 89 MB, 1 h `.m4a` on one fast machine. The spike (ticket 06) should measure these on a real 3 h file of several hundred megabytes, in the project's own Vite setup:

1. A real file near 700 MB and 3 h mounts through WORKERFS, opens, and cuts correctly, for each of `.mp3`, `.m4a` and `.opus`; record the time to open and the time per cut. An `.m4a` whose index sits at the end of the file and an `.mp3` with variable bitrate are the cases most likely to behave differently.
2. Peak memory of the tab during a full split of that file, for both shapes: one command per track, and one command for all tracks. Read the figure from Chrome's Task Manager, not from the page.
3. The number of calls one instance survives before `memory access out of bounds`, for the real commands used on `.mp3` and `.opus` (I measured 159 only for `.m4a` stream copy), and therefore a safe call budget.
4. Memory stays flat across many `terminate()` and `load()` cycles, for example 60 in a row. One issue claims terminated workers keep their memory (#704); I did not measure this.
5. Decode speed for a full 3 h file per format, and the peak memory of the chosen decode shape (time slices or reduced sample rate). Confirm that no single decoded output needs more than a few hundred megabytes.
6. Decoding a real `.opus` file works at all. The 64 KB stack in the published core is known to break Opus encoding (#867); decoding was not tested.
7. The largest single MEMFS output that still succeeds on a typical laptop with 8 GB of RAM, and what the failure looks like to the page (rejected promise, hang, or crashed tab), so the app can show a useful message.
8. The `writeFile` route with a file of several hundred megabytes, only if a fallback from WORKERFS is wanted: time and peak memory.
9. Cold load time of the core over a real network from the chosen static host, with compression on, and warm load time on the second visit. Confirm in the Network panel that the host sends `Content-Type: application/wasm`, compresses the file, and that no request leaves the site's own origin.
10. The setup of recommendation 6 works in the project itself (Vite 8.2, `vue-tsc`, ESLint, Knip, the project's `base` path), in `pnpm dev` and in `pnpm build` plus `pnpm preview`.
11. What `progress` and `time` report during a trimmed cut (`-ss`/`-t`), to decide whether progress per command is usable or only progress per track.
12. What happens when the user's file is moved or changed on disk while it is mounted.

### How the local checks were run

- Package inspection: `npm pack` of the five packages into a scratch folder, then reading the published JavaScript, parsing the memory limits out of the `.wasm` files with a short Node script, and compressing the `.wasm` with `gzip` and `brotli`.
- Browser checks: a throwaway Vite 8.3.8 project in the session scratch folder with `@ffmpeg/ffmpeg@0.12.15` and `@ffmpeg/core@0.12.10`, driven by Playwright in headless Google Chrome 157 on macOS (12 cores, 24 GB RAM). The sample was given to a file input by path; outputs stayed in the browser's memory and were discarded.
- Memory figures are the summed resident memory of the browser's renderer processes sampled four times a second with `ps`. They are rough: good for comparing steps, not for absolute numbers.
- Nothing was installed into this project and no project file other than this ticket was changed.
