# 03: The contrast curve under the loudness curve

**What to build:** opening any source file shows a contrast lane under the loudness curve, on the same time axis, with its own dB scale and in both themes. It is the contrast of concept note 15, worked out once when the file opens from the spectrogram and the loudness curve. Nothing is proposed yet.

**Blocked by:** 01 (concept note 15 is confirmed).

**Status:** ready-for-agent

Spec: `.scratch/crossfade-changes/spec.md`, user stories 1 to 9; Implementation Decisions "The contrast maths", the store's opening of a source file, and the loudness panel's lane.

- [ ] The contrast maths is a hand-written pure module in the shared audio maths: one value per 0.5 s, 60 s before against 60 s after, the mean of power per band back in dB, the level taken out, the RMS over the bands. Bands over 15 kHz and windows under the median minus 18 dB are left out; under 2 s of loud windows on a side scores 0.
- [ ] Its spec has the hand-checkable cases of the spec's Testing Decisions, peaks included.
- [ ] Opening a source file gives the split store the spectrogram as an optional third input, so the existing callers and specs need no change. The review page passes it, and the store builds the contrast curve once and exposes it.
- [ ] The loudness panel draws the lane: the highest contrast per pixel column, its own scale from 0 dB with a label, colours from the theme tokens, chosen from the design system (`DESIGN.md`, the `canvas-view` skill).
- [ ] The time to build the curve for `sample3h.m4a` is measured in Chrome and written in this ticket's comments.
- [ ] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
