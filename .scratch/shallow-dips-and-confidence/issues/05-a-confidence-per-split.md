# 05: A confidence per split

**What to build:** each split Find splits adds carries a confidence, sure, likely or doubtful, read from its depth. A sure split looks as it does today. Likely and doubtful splits are marked on their lines in every view, doubtful the stronger, and the track list's split row shows the band with the depth in a tooltip. Moving a split, or adding one by hand, means no confidence.

**Blocked by:** 02.

**Status:** ready-for-agent

Spec: user stories 24 to 33; Implementation Decisions "Finding splits" (the bands), "The split store" (a split's confidence, moving) and "Split lines, the track list and the keys". Read `DESIGN.md` and use the `impeccable` skill for the look.

- [ ] A split gains its confidence: the band and the depth in dB, or none. Find splits sets it; a split added by hand, from pending splits or from the Range view has none.
- [ ] The bands: sure from 15 dB, likely from 9 dB, doubtful under 9 dB, in a config file beside the gap defaults with a comment pointing at concept note 13.
- [ ] Moving a split clears its confidence, with no extra edit. Deleting a split takes it along; removing a track keeps the confidence of the splits that stay.
- [ ] The confidence is set once: a later setting change leaves it.
- [ ] Split lines in the whole-file waveform, the loudness curve and the zoom panel's views show likely and doubtful; sure and none look as today.
- [ ] The track list's split row shows a likely or doubtful band, with the depth in its tooltip.
- [ ] Store specs: the bands at 8.9, 9, 14.9 and 15 dB; moving clears; a manual split has none. The track list spec covers the band and the tooltip.
- [ ] In the browser: `sample1.m4a` shows 33 sure splits that look as before; f16 at a lower depth shows likely and doubtful splits marked in every view.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
