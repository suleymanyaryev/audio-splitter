# Spike: decode and split a real file

Type: prototype
Status: resolved
Blocked by: 01, 02, 03, 04

## Question

Do the two risky parts work on the user's real sample files in Chrome: getting analysis samples out of a 1–3 h source file without exhausting memory, and cutting it into tracks without re-encoding?

Build one rough, throwaway page (no tests, no comments, no design) that:

- Loads one of the user's sample files (location recorded in [Add sample files](01-add-sample-files.md)) through a file input and runs it through the setup recommended in [ffmpeg.wasm with long files in Chrome](02-ffmpeg-wasm-with-long-files.md).
- Decodes it by the top-ranked path from [Decoding a long file for analysis](04-decoding-a-long-file-for-analysis.md) and reports time taken and peak memory.
- Cuts it at three or four hand-typed timestamps using the command shape from [Stream-copy splitting per format](03-stream-copy-splitting-per-format.md) and saves the tracks.

Two facts from the resolved tickets shape the spike:

- The only real sample is `samples/sample1.m4a`, so the spike checks `.m4a` only. `.mp3` and `.opus` stay unverified.
- The ffmpeg.wasm core fails after repeated calls on one worker. Decoding in slices plus one call per track goes past that budget, so the spike must run the restart loop (a fresh worker about every 20 calls, a timeout on every call) across a full decode and a full export, and report whether it holds.

The user then listens to the cut tracks in their usual player and checks start, end, duration and seeking. Record every measurement the research tickets asked for. Gap detection is not part of the spike: it is low-risk and is learned slowly in the milestones.

Resolved when the measurements are recorded and the spike code is deleted.

## Comments

### 2026-11-13: spike measurements (ticket still open: the user's listening check is pending)

**How it was run.** A throwaway page (`spike.html`, `spike/main.ts`) served by the project's own Vite 8.3.8 config, with `@ffmpeg/ffmpeg@0.12.15` and `@ffmpeg/core@0.12.10` installed exactly and `optimizeDeps.exclude` added. A Node script drove it through Playwright in installed headless Google Chrome 157 on an Apple M4 Pro (12 cores, 24 GB). The sample went in through the page's file input. Memory is the summed resident memory of all Chrome processes, sampled 4 times a second with `ps`. These figures are rough: good for comparing steps, not as absolute numbers. "Peak +N MB" is the peak above the level just before the step, and that level already includes a loaded page. The 8 cut tracks were saved through a normal browser download and checked with native ffmpeg 8.1: each was decoded and matched sample for sample against a decode of the whole source. Only `samples/sample1.m4a` (AAC-LC, 44.1 kHz stereo, 1 h 01 min, 89 MB) was used.

**Setup (ticket 02's recommendation)**

- The core reports `ffmpeg version 5.1.4`. `load()` plus `createDir` plus the WORKERFS mount takes 55–95 ms from a local server.
- It works in `vite` dev and in `vite build` plus `vite preview`. The build emits `ffmpeg-core-<hash>.wasm` (32.2 MB, 10.4 MB gzip), `ffmpeg-core-<hash>.js` and `worker-<hash>.js`. Preview serves the wasm as `Content-Type: application/wasm`. During a load and a run, every request went to the page's own origin. The worker still contains the `unpkg.com` default URL as a string, but it is never fetched while `coreURL` and `wasmURL` are passed.
- Opening the file (a probe call that reads duration, rate and channels from the log) takes 90–380 ms.
- Not checked: `vue-tsc`, ESLint and Knip on the `?url` imports. The spike was kept outside `src/`, so that check falls to the first build milestone.

**Decode, first choice: slices of full-rate stereo `f32le`, hand-written downmix `(L+R)/2`, 50 ms loudness curve and peaks**

| Slice length | Calls | Total | ffmpeg `exec` | `readFile` | Hand-written analysis | Speed | Peak memory |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 60 s | 62 | 4.8 s | 4.2 s | 0.15 s | 0.50 s | 761× real time | +360 MB |
| 300 s | 13 | 4.4 s | 3.8 s | 0.17 s | 0.48 s | 835× real time | +769 MB |
| 600 s | 7 | 4.3 s | 3.7 s | 0.10 s | 0.48 s | 853× real time | +1182 MB |

- Slice borders are exact. Every slice length gave 162,562,048 frames, the same as one whole-file decode. Each `readFile` result could be viewed as a `Float32Array` without copying: offset 0 and a whole number of stereo frames, every time.
- Per-call start-up cost is small. 62 slices cost about 10 % more time than 13 slices. Memory depends on the slice length: 60 s slices use about half the peak memory of 300 s slices. After each run memory returned to within about 100–200 MB of the starting level.
- Extrapolated: 3 h of AAC would take about 13 s.

**Decode, fallback: one call over the whole file**

| Command | Time | Output | Peak memory |
| --- | --- | --- | --- |
| `-ac 1 -ar 8000 -f f32le` | 4.7 s | 118 MB | +329 MB |
| `-ac 1 -ar 8000 -f s16le` | 4.7 s | 59 MB | +195 MB |
| `-ac 1 -f f32le` (44.1 kHz) | 3.3 s | 650 MB | +1304 MB (2.0× the output) |
| stereo `-f f32le` (44.1 kHz), the largest-output test | 4.2 s | 1.30 GB | +3661 MB (2.8× the output), succeeded |

The resampler makes the fallback slower than the full-rate slices. On this 24 GB machine no output size failed, so the failure mode near the memory limit is still unseen.

**Loudness curves compared** (73,724 windows of 50 ms; windows below −90 dB left out; "deviation" means after removing the median offset)

| Comparison | Median offset | Mean deviation | 99th percentile | Max | Windows > 0.5 dB |
| --- | --- | --- | --- | --- | --- |
| hand `(L+R)/2` vs ffmpeg `-ac 1 f32le` | −3.0103 dB | 0.00006 dB | 0.0000001 dB | 1.90 dB | 3 |
| hand vs ffmpeg `-ac 1 -ar 8000 f32le` | −3.0103 dB | 0.006 dB | 0.029 dB | 1.91 dB | 12 |
| hand vs ffmpeg `-ac 1 -ar 8000 s16le` | 0.0000 dB | 0.006 dB | 0.029 dB | 1.91 dB | 12 |
| hand vs hand "every 5th sample" (8.82 kHz) | 0.0000 dB | 0.005 dB | 0.024 dB | 0.24 dB | 0 |

- The 3.01 dB downmix difference that ticket 04 predicted holds in the wasm core for `f32le`. With `s16le` the difference is 0.
- The sliced curve and the whole-file curve are identical except for 6 windows, and the worst one (1.9 dB) sits at a slice border. The decoder restarting at each border leaves a trace in at most a window or two. Tests must not expect sliced and whole-file decodes to be equal there.
- Reducing to about 8 kHz changes the curve by at most 0.03 dB in 99 % of windows, as ticket 04 predicted.

**Restart loop and call budget**

- Full decode plus full export on one `Runner` with a budget of 20 calls and a watchdog on every call: 300 s slices took 22 calls with 1 reload, 60 s slices took 71 calls with 3 reloads. There were 0 failures and 0 watchdog timeouts.
- With no reload, one loaded core failed with `RuntimeError: memory access out of bounds` on the 159th 5-second slice-decode call and on the 161st cut call (the full real cut command, with tags and `+faststart`). A budget of 20 leaves an 8× margin.
- 120 `terminate()` + `load()` + mount cycles in a row took 55–77 ms each. Memory rose by about 50 MB over the first 60 and by about 5 MB over the next 60: it stays flat (no sign of issue #704).

**Export (ticket 03's `.m4a` command shape, input seeking, tags, `+faststart`), cut at 7 points into 8 tracks**

- All 8 tracks took 0.64–0.83 s in total, 25–170 ms each, with peak memory about +220–240 MB.
- `+faststart` costs no measurable time: 725 vs 722 ms in dev, 748 vs 825 ms in preview.

| Track | Reported duration | Decoded − reported | Start error | First samples that differ from the source | End late by | Tags | `moov` first |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 231.572 s | +0.6 ms | 0 | 0 ms | 22.6 ms | Track 1, 1/8 | yes |
| 2 | 645.561 s | −0.4 ms | 0 | 19.2 ms | 10.6 ms | Track 2, 2/8 | yes |
| 3 | 536.368 s | +0.3 ms | 0 | 7.3 ms | 18.3 ms | Track 3, 3/8 | yes |
| 4 | 645.557 s | −0.7 ms | 0 | 15.1 ms | 6.3 ms | Track 4, 4/8 | yes |
| 5 | 536.713 s | −0.7 ms | 0 | 3.3 ms | 12.3 ms | Track 5, 5/8 | yes |
| 6 | 645.620 s | −0.1 ms | 0 | 9.8 ms | 19.9 ms | Track 6, 6/8 | yes |
| 7 | 308.056 s | −0.2 ms | 0 | 16.9 ms | 5.8 ms | Track 7, 7/8 | yes |
| 8 | 136.864 s | +0.2 ms | 0 | 1.5 ms | (ends with the file) | Track 8, 8/8 | yes |

This is identical to ticket 03's native measurement: every track starts on the requested sample, ends 6–23 ms late (at most one AAC frame), and only the first frame differs from the source.

**Progress events**

A 300 s cut and a 300 s slice decode each fired only 2–3 `progress` events: one at the start and one or two at the end. For the cut, `time` was 300.005 s of output and `progress` was 0.08 (that time divided by the whole file's duration). Progress inside a single call is useless, so progress is counted per call ("slice 7 of 13", "track 3 of 8").

**WebCodecs**

`AudioDecoder.isConfigSupported` returns `true` for `mp3`, `mp4a.40.2` and `opus` in Chrome 157.

**Not measured, and why**

- `.mp3` and `.opus`: there is no real file (decode, slice borders, call budget, MP3 seek cost, Opus input-seek risk).
- A 3 h / 700 MB file: none exists.
- Behaviour on an 8 GB laptop: only one machine was available.
- Cold load over a real network from a static host: there is no host yet.
- A file moved while it is mounted: testing it means copying the sample, which ticket 01 rules out.
- The `writeFile` route: no fallback from WORKERFS is wanted.
- One command with several outputs: ticket 03 already ruled out the segment muxer.
- Threshold calibration: gap detection is outside this spike.

## Answer

Resolved 2026-11-13. Both risky parts work on the real `.m4a` sample in desktop Chrome, with the setups recommended in tickets 02, 03 and 04 unchanged. Every figure is in the comment above.

- **Decode.** The first choice from ticket 04 holds: slices of full-rate stereo `f32le`, with the slice loop, downmix and loudness curve hand-written. 1 h took 4.4 s (about 835× real time), slice borders were exact, and peak memory depends on slice length (+360 MB at 60 s, +770 MB at 300 s, +1.2 GB at 600 s) rather than on file length. The fallback (`-ac 1 -ar 8000`, one call) works too but is slower (4.7 s), because of the resampler.
- **Hand-written vs ffmpeg.** A hand-written `(L+R)/2` and every-5th-sample decimation agree with ffmpeg's output to within 0.03 dB in 99 % of 50 ms windows. ffmpeg's `-ac 1` with `f32le` is a constant 3.01 dB louder; with `s16le` it is not.
- **Restart loop.** A budget of 20 calls per loaded core, with a watchdog on every call, carried a full decode plus a full export (up to 71 calls, 3 reloads) with no failure. Without reloads the core fails at about 160 calls. A reload costs 55–77 ms, and memory stays flat over 120 reloads.
- **Export.** Ticket 03's `.m4a` command in ffmpeg.wasm cut 8 tracks in under 1 s. Each starts on the requested sample and ends 6–23 ms late, with correct durations and tags and `moov` first; `+faststart` costs nothing. The user listened to all 8 in their usual player and judged them **good enough for v1**.
- **Progress.** Progress is counted per call (per slice, per track); ffmpeg's `progress` event is useless inside one call.
- **Reanalysis.** The user asked whether changing the settings re-runs the analysis. Fact from the spike for [Decode path and hand-written steps](07-decode-path-and-hand-written-steps.md): decoding the whole file is the only slow step (about 4.5 s per hour), and the resulting 50 ms loudness curve is about 74,000 numbers, so gap finding can re-run on it after a threshold or minimum-gap change without decoding again.
- **Still unverified.** `.mp3`, `.opus`, a 3 h / 700 MB file, an 8 GB laptop, the failure mode near the memory limit, and the cold load from a real host.

The spike code (`spike.html`, `spike/`, the temporary `vite.config.ts` lines and the two ffmpeg packages) has been deleted.
