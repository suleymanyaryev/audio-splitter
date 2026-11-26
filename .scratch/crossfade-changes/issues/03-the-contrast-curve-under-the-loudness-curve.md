# 03: The contrast curve under the loudness curve

**What to build:** opening any source file shows a contrast lane under the loudness curve, on the same time axis, with its own dB scale and in both themes. It is the contrast of concept note 15, worked out once when the file opens from the spectrogram and the loudness curve. Nothing is proposed yet.

**Blocked by:** 01 (concept note 15 is confirmed).

**Status:** resolved

Spec: `.scratch/crossfade-changes/spec.md`, user stories 1 to 9; Implementation Decisions "The contrast maths", the store's opening of a source file, and the loudness panel's lane.

- [x] The contrast maths is a hand-written pure module in the shared audio maths: one value per 0.5 s, 60 s before against 60 s after, the mean of power per band back in dB, the level taken out, the RMS over the bands. Bands over 15 kHz and windows under the median minus 18 dB are left out; under 2 s of loud windows on a side scores 0.
- [x] Its spec has the hand-checkable cases of the spec's Testing Decisions, peaks included.
- [x] Opening a source file gives the split store the spectrogram as an optional third input, so the existing callers and specs need no change. The review page passes it, and the store builds the contrast curve once and exposes it.
- [x] The loudness panel draws the lane: the highest contrast per pixel column, its own scale from 0 dB with a label, colours from the theme tokens, chosen from the design system (`DESIGN.md`, the `canvas-view` skill).
- [x] The time to build the curve for `sample3h.m4a` is measured in Chrome and written in this ticket's comments.
- [x] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- **Time in Chrome.** `buildContrast` on 221,175 windows (the size of `sample3h.m4a`) took 94 to 130 ms over 5 runs (Chrome through `playwright-cli`, the Vite dev server, unminified), against 447 ms in Node for the spike's measure. No worker is needed. The input was a synthetic spectrogram of the same size (pseudo-random bytes, one window in 97 quiet), not the real file: `samples/` is not in this worktree and lies outside the repo. Ticket 08's browser check times the real load.
- The lane is its own component, `ContrastLane.vue`, under the loudness canvas; its scale runs from 0 to 15 dB (`CONTRAST_TOP_DB`), a peak over 15 dB sits on the top edge. Its colour is `ink` (the loudness curve is `wave`): the curve is derived from the audio, not the audio. `DESIGN.md` has a bullet for it.
- The lane reuses `mergeLoudness` for its highest-per-column merge, since it does exactly that for any curve.
- Peaks need a full minute either side (`index >= 120` and `index + 120 <= length`), and are compared against every point of the curve, the excluded ones included, so a high point near an end can hide a lower one beside it.
- `docs/architecture.md` got the spectrogram in the wiring (one line of the diagram and one sentence); ticket 08 adds the rest.
