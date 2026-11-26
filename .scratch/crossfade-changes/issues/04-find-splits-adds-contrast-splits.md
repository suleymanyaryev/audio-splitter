# 04: Find splits adds contrast splits

**What to build:** the settings row gains a contrast control (Off | On) and a contrast threshold slider from 5.4 dB. While contrast is on, the Find splits count includes the contrast splits, and a press adds a split at each contrast peak that reaches the threshold, 60 s or more from every gap, dip, split and the file's ends. Each is likely from 6.5 dB and doubtful under it, with its contrast in its tooltip. While contrast is off, everything is as today.

**Blocked by:** 02, 03.

**Status:** resolved

Spec: `.scratch/crossfade-changes/spec.md`, user stories 10 to 15, 22, 25 to 41, 46 and 51 to 53; Implementation Decisions "Proposals" (not the lift), "The split store" (the two settings, the preview, the count and Find splits) and the loudness panel's settings row and tooltip.

- [x] Contrast on/off (start: off) and the contrast threshold (start 5.4 dB, 3 to 12 dB, step 0.1) join the store's settings, start from the built-in values, reset with the others and change no split.
- [x] Proposals gain the contrast kind: a contrast peak at or over the threshold proposes its time unless a gap proposal, a dip proposal, the middle of a gap holding a split, or an existing split is within 60 s. Two contrast peaks keep only the 15 s between them. Gaps and dips are unchanged.
- [x] Contrast bands: likely from 6.5 dB, doubtful under it, never sure; the cut-off sits with the depth cut-offs.
- [x] The preview, the count on the button and Find splits include contrast proposals only while contrast is on.
- [x] A contrast split's tooltip shows "X dB of contrast"; its line and track-list row look like any likely or doubtful split.
- [x] The settings row has the Off | On control and the threshold slider with its readout, after the depth slider.
- [x] Store specs cover the spec's cases for this ticket: off adds exactly today's splits; 6.4 and 6.5 dB; the 60 s room from each kind and from the ends; two contrast peaks 20 s apart. The settings row's spec covers the control and the slider; the track list's spec the tooltip.
- [x] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- `proposeSplits` takes `contrastPeaks` as an optional input (none by default), so its callers need no change. `Proposal` is now a union: a gap or dip carries its `depth`, a contrast proposal its `contrast`.
- The 60 s room is measured from the gap and dip proposals that stand (after the 15 s and end rules), the middle of a gap that holds a split, and every existing split. A gap or dip proposal dropped for sitting beside an existing split gives no room of its own: that split already does, from its own place.
- Peaks and room edge: `findContrastPeaks` keeps a peak exactly 60 s from an end, and `areApart` keeps a proposal exactly 60 s from another (`>= spacing`).
- The contrast settings start from the built-in values (off, 5.4 dB) on `open` and on `restoreBuiltIn`, not yet from the default settings: ticket 06 moves them there. "Restore built-in" is still disabled by the three old settings alone until then.
- The contrast slider and the Off | On control are always enabled, whether or not contrast is on; the threshold is kept while it is off.
- The 6.4 and 6.5 dB cut-off is checked at the lib level (`contrastBandOf` spec), since a spectrogram can't be made to read exactly 6.5 dB; the store spec uses 6.37 and 6.59 dB (a bump of 28 and 29 levels).
- DESIGN.md: the loudness title row and the confidence mark's tooltip describe the contrast control and the contrast tooltip.
