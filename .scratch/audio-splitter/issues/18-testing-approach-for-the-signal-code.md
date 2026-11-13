# Testing approach

Type: grilling
Status: resolved
Blocked by: 05, 07, 08

## Question

How is each layer tested, given Vitest + jsdom for unit specs, Playwright with installed Chrome for e2e, real samples that are git-ignored and up to 89 MB, no canvas in jsdom, ffmpeg.wasm that only runs in a browser, and an export that calls `showDirectoryPicker`? Decide the fixtures (generated in specs, committed files, or real samples), which flows get an e2e spec, and how the folder picker is stubbed.

## Answer

Resolved 2026-11-13 by grilling; the user accepted every recommendation.

**Unit specs (Vitest, jsdom) build their audio in code.** Helpers inside the specs generate arrays of sine bursts and silence with known gap positions; no audio file is read. Covered this way:

- `shared/lib/audio/`: downmix, RMS and dB, min/max peaks.
- `entities/split/lib/find-gaps.ts`.
- The split store: move limits (1 s from neighbours and the file's ends), add, delete, renumbering, track names following their split, the "edited" state.
- Canvas maths as plain functions beside each widget: time ↔ x, widening lands to 12 px, the 6 px hit test.

The canvases themselves are not tested (jsdom has no canvas). The real samples are never used by any spec.

**One Playwright spec per format, end to end:** load → review → export, on a committed synthetic fixture per format (about 30 s: three tone bursts separated by two 2 s silences, a few hundred KB each). The fixtures are made once with native ffmpeg by a short script whose command is kept beside them; they are generated tones, not the user's audio. `showDirectoryPicker` is stubbed to return Chrome's origin-private file system (`navigator.storage.getDirectory()`), so the real File System Access writes run and the spec reads the written files back. These specs run in the Final tier per `AGENTS.md`.
