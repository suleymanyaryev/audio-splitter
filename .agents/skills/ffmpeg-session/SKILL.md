---
name: ffmpeg-session
description: How the app runs ffmpeg.wasm. Use when adding or changing an ffmpeg call (probe, decode, clip, cut), touching the source-file store's session or its cancel, or adding a worker entry.
---

One ffmpeg session per loaded file, owned by the `source-file` store. Read `docs/architecture.md` "The ffmpeg session" first; the reasons behind the numbers are in concept notes 02 (slices, the reload budget), 06 (seeking, why WAV) and 07 (stream copy, cut grain).

## The layers

- `@/shared/api/ffmpeg/ffmpeg.ts` wraps one worker. It already handles the watchdog timeout, a fresh worker every 20 calls and `interrupt()`, so callers leave them alone.
- `@/shared/api/ffmpeg/core-preloader.ts` downloads and stores the ffmpeg core before any worker starts (architecture "The core download", ADR 0003). A new call or worker entry never fetches the core itself. The cache name and the URL rule change in `core-cache.ts` alone; `src/app/sw.worker.ts` stays wiring only.
- `@/entities/source-file/api/` has one file per job (`probe.ts`, `decode-slice.ts`, `decode-clip.ts`, `cut-track.ts`). Each builds its command line, passes its own timeout, takes the output file out and throws ffmpeg's last log line on failure. A new job is a new file here; `decode-clip.ts` is the reference.
- `@/entities/source-file/model/source-file.ts` owns the session's lifetime: opened when a load starts, kept open once the file is ready, closed by `reset`, `cancel`, a failed load or a new load.

## Calls after the file is ready

- Every call goes through the store's `inSession` queue, as `clip` and `cutTrack` do: one worker runs one command, and the session's log belongs to one call.
- A call whose file was reset or replaced while it waited rejects with `FileReplacedError`. The caller treats it as a quiet "nothing to do" and shows any other error. Reference: `decode()` in `widgets/split-zoom/model/player.ts`.
- To cancel cuts, set a cancelled flag, then call `sourceFile.stopCuts()`. The stop rejects like a failure; the flag tells the two apart. Reference: `widgets/track-strip/model/export-tracks.ts`.
- Handle large outputs one at a time: cut, write, drop the bytes, then the next cut.

## Command lines

- Every time on a command line goes through `roundToMillisecond` (`@/shared/lib/time/round-to-millisecond.ts`), so no float noise like `0.30000000000000004` reaches ffmpeg.
- Stream-copy cuts (`-c copy`) seek differently per container. Follow `cut-track.ts` and note 07.

## Worker entries

A `*.worker.ts` or `*.worklet.ts` entry triggers the full test suite, because the import graph can't see it. Keep entries thin and put the logic in plain modules that specs import. The analysis builders in `@/shared/lib/audio/` carry their open bucket or window across slice borders, so a signal pushed whole or in slices gives the same result.

## Specs

Specs never run or download ffmpeg. They use `@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts`, which answers each job by the shape of its command; extend it when a new job has a new command shape. Real-browser checks of ffmpeg and the stored core live in `e2e/`.
