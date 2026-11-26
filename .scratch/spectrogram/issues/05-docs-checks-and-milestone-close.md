# 05: Docs, the checks and closing the milestone

**What to build:** the docs that describe the app as it now is, the by-hand check in both themes, and the milestone's close.

**Blocked by:** 02, 03, 04.

**Status:** resolved

Spec: `.scratch/spectrogram/spec.md` (Further Notes, "When the milestone ships"). Run the `finish-feature` skill for the doc sync.

- [x] `docs/architecture.md`: the source-file store's row gains the spectrogram as its third summary, and the load flow says so.
- [x] `README.md`: one "What it does" line for the spectrogram.
- [x] Concept note 14's "Where it lives in the code" section is filled in.
- [x] The v2 milestones file: milestone 7's entry and its open questions match what was built.
- [x] GitHub issue #17: the new text is shown to the user and posted only once they approve it. It carries the decisions and drops the "#12 falls back on it" line. The issue is not closed.
- [x] By hand in the browser, through the `playwright-cli` skill, in the light and the dark theme:
  - the tone file's line;
  - a split read against the sound in the Split view;
  - a track and a range of `sample-crossfade.m4a`.
- [x] The load time of `sample3h.m4a` is measured against the 19.2 s of concept note 02, and noted in note 14.
- [x] The Final checks of `AGENTS.md` pass: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [x] Issue #17's acceptance criteria are checked against what was built, and the user confirms the milestone.

## Comments

- [x] Final tier passes: `pnpm verify` (134 files, 2546 tests), `pnpm lint`, `pnpm knip` and `pnpm depcruise`, run on `ac15d49`, after the last code change.
- Code review (Standards and Spec), run after ticket 04. It found two hard Standards findings: the readout composable had no spec, and `SplitZoom.vue` had a stale "160 px" comment. The Spec review found no gaps. The fixes are one commit, `ac15d49`:
  - a spec for `use-spectrogram-readout.ts`;
  - `zoom-layout.ts`, so the wave and strip split is held once;
  - one `frequencyShare` and one `Rgb` type, and the `text` colour renamed to `ink`;
  - the builder renamed to `spectrogram-builder.ts` / `createSpectrogramBuilder`, the glossary's word for what it builds;
  - a merged column given to the pixel holding its middle, not its start (Spec: "placed at the middle of the moment it describes");
  - no readout past the file's end.
- Left as they are: `spectrogram-shade.ts` holding the shade, the loudest-value scan and hex parsing; the readout wiring repeated in the three views (three lines each); the 1.5 px line above the strip counting as strip for the readout. The frame covers 42.7 ms of a 50 ms window at 48 kHz, which is the spec's design.
- The `sample3h.m4a` load, the same machine as note 02, Chrome, `pnpm dev`, two runs each. Without the spectrum it took 22.2 and 23.1 s today; with it, 26.3 and 28.4 s. So it adds about 4 to 5 s, and the machine is slower today than the 19.2 s of note 02. This is in note 14.
- By hand in Chrome, light and dark: the tone file's 1 kHz line; Split 9 of `sample-crossfade.m4a` (27:44), where the sound visibly changes at the split; track 10 (27:44 to 31:27) and a 10 min range from 1:00:00.
- README: step 2 "Analyse" now names the spectrogram, and the "How it works" box reads "Peaks, loudness curve and spectrogram".
- Issue #17's acceptance criteria against the build: a spectrogram on the review screen (in all three zoom views); one line for a steady tone (checked with the 1 kHz file); a split at the same time on both (one time axis, checked at Split 9); readable in both themes (checked by hand).
- On 2026-11-26 the user approved the new text of issue #17, which was posted with `gh issue edit 17` and left open, and confirmed milestone 7.
