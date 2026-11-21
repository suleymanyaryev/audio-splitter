---
name: ffmpeg-session
description: How the app runs ffmpeg.wasm. Use when adding or changing an ffmpeg call (probe, decode, clip, cut), touching the source-file store's session or its cancel, or adding a worker entry.
---

One ffmpeg session per loaded file, owned by the `source-file` store. Read `docs/architecture.md` "The ffmpeg session" first; the reasons behind the numbers are in concept notes 02 (slices, the reload budget), 06 (seeking, why WAV) and 07 (stream copy, cut grain).

## The layers

- `@/shared/api/ffmpeg/ffmpeg.ts` wraps one worker with the source mounted read-only (WORKERFS). It already does three things for every call, so callers leave them alone:
  - the watchdog timeout (a hung call terminates the worker)
  - a fresh worker every 20 calls
  - `interrupt()`, which rejects the running call with "ffmpeg was stopped" and leaves the session usable
- `@/shared/api/ffmpeg/core-preloader.ts` downloads the ffmpeg core before any worker starts: one shared promise for the page, progress as a fraction of the wasm's size, a 30 s stall rule and no total limit. `openFfmpeg` awaits it (so the load watchdog never counts the network), passes its progress on, and stops waiting when its `signal` aborts (the store aborts it on Cancel or a newer load); a failure is a `CoreDownloadError`, which the store reports as the step "downloading ffmpeg". `preloadCoreWhenIdle()` (called from `main.ts`) starts it while the page waits for a file, never under Save-Data, and silently. The preloader also keeps the core in Cache Storage (`core-cache.ts` holds the cache name and the URL rule, shared with the service worker), and `src/app/sw.worker.ts` (built to `sw.js`, production only; its rules are in `core-request.ts`) answers the worker's requests for it from there. A change to the cache name or the URL rule goes in `core-cache.ts` alone; the service worker entry is wiring only (a change to it runs the full test suite). A new worker entry or call never fetches the core itself.
- `@/entities/source-file/api/` has one file per job: `probe.ts`, `decode-slice.ts`, `decode-clip.ts`, `cut-track.ts`. Each one:
  - builds its command line
  - passes its own timeout
  - takes the output file out
  - throws ffmpeg's last log line on failure

  A new job is a new file here; `decode-clip.ts` is the reference.

- `@/entities/source-file/model/source-file.ts` owns the session's lifetime. It opens the session when a load starts and keeps it open once the file is ready; `reset`, `cancel`, a failed load and a new load close it.

## Calls after the file is ready

- Every call goes through the store's `inSession` queue, as `clip` and `cutTrack` do. One worker runs one command, and the session's log belongs to one call.
- A call whose file was reset or replaced while it waited rejects with `FileReplacedError`. The caller treats that as a quiet "nothing to do" (it goes idle with no failure line), and shows any other error to the user. `widgets/split-zoom/model/audition.ts`'s `decode()` is the reference.
- To cancel cuts, set a cancelled flag first, then call `sourceFile.stopCuts()`. The stop rejects like a failure, and the flag is how the caller tells a cancel apart from a real failure. The reference is `widgets/track-strip/model/export-tracks.ts`.
- Handle large outputs one at a time: cut, write, drop the bytes, then the next cut.

## Command lines

- Every time on a command line goes through `roundToMillisecond` (`@/shared/lib/time/round-to-millisecond.ts`), so no float noise like `0.30000000000000004` reaches ffmpeg.
- Cutting by stream copy (`-c copy`) seeks differently per container: `.m4a` once before the input; `.mp3` and `.opus` 2 s early, then again after it. Follow `cut-track.ts` and note 07.

## Worker entries

A `*.worker.ts` or `*.worklet.ts` entry triggers the full test suite, because the import graph can't see it. Keep entries thin and put the logic in plain modules that specs import. The analysis builders in `@/shared/lib/audio/` carry their open bucket or window across slice borders, so a signal pushed whole or in slices gives the same result.

## Specs

Specs never run ffmpeg or download it: the session spec mocks `core-preloader.ts`, and the preloader's own spec uses a fake streaming `fetch` and `fake-cache-storage.ts`, a stand-in for `caches` that the request handler's spec uses too. They use `@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts`, which answers probe, decode, clip (`-f wav`) and cut (`-c copy`) by the shape of the command. Extend the fake when a new job has a new command shape. A real-browser check of the actual ffmpeg goes in `e2e/export.spec.ts` (dev server), and of the stored core and the service worker in `e2e/offline.spec.ts` (production build).
