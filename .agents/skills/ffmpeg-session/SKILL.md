---
name: ffmpeg-session
description: How the app runs ffmpeg.wasm. Use when adding or changing an ffmpeg call (probe, decode, clip, cut), touching the source-file store's session or its cancel, or adding a worker entry.
---

One ffmpeg session per loaded file, owned by the `source-file` store. Read `docs/architecture.md` "The ffmpeg session" first; the reasons behind the numbers are in concept notes 02 (slices), 06 (seeking, why WAV) and 07 (stream copy).

## The layers

- `@/shared/api/ffmpeg/ffmpeg.ts` wraps one worker with its timeout, renewal and `interrupt()`, so a caller never handles them.
- `@/shared/api/ffmpeg/core-preloader.ts` stores the core before any worker starts, so a new call or worker entry never fetches it (ADR 0003). The cache name and the URL rule change in `core-cache.ts` alone, so `src/app/sw.worker.ts` stays wiring only.
- `@/entities/source-file/api/` has one file per job. Each builds its command line, passes its own timeout, takes the output file out and throws ffmpeg's last log line on failure, so a failure names its cause. A new job is a new file here (`decode-clip.ts`).
- The store owns the session's lifetime: opened when a load starts, kept open once the file is ready, closed by `reset`, `cancel`, a failed load or a new load (`@/entities/source-file/model/source-file.ts`).

## Calls after the file is ready

- A new call goes through the store's `inSession` queue like the others, so the session's log belongs to one call (`clip` in `source-file.ts`).
- A call whose file was reset or replaced while it waited rejects with `FileReplacedError`. The caller treats it as a quiet "nothing to do" and shows any other error (`decode()` in `widgets/split-zoom/model/player.ts`).
- To cancel cuts, set a cancelled flag, then call `sourceFile.stopCuts()`. The stop rejects like a failure, so the flag tells the two apart (`widgets/track-strip/model/export-tracks.ts`).
- Handle large outputs one at a time (cut, write, drop the bytes, then the next cut), so memory holds one track (`export-tracks.ts`).

## Command lines

- Every time on a command line goes through `roundToMillisecond`, so no float noise like `0.30000000000000004` reaches ffmpeg (`@/shared/lib/time/round-to-millisecond.ts`).
- Stream-copy cuts (`-c copy`) seek differently per container, so follow `cut-track.ts` and note 07.

## Specs

Specs never run or download ffmpeg. They use `@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts`, which answers each job by the shape of its command; extend it when a new job has a new command shape. Real-browser checks of ffmpeg and the stored core live in `e2e/`.
