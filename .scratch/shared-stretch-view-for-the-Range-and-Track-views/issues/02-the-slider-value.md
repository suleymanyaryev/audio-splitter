# 02: The slider's value

**What to build:** `usePlayheadSlider(draw)` in split-zoom lib. It runs the playhead frames while the player plays (wrapping the existing playhead-frames composable) and returns the slider's value:

- while playing, the sound's place floored to the whole second, but never under the extent's start;
- otherwise, the player's playhead to the hundredth;
- with nothing on show, 0.

All three views use it in place of their own `heardSeconds` and `sliderSeconds`, each passing its own `draw`. The Range and Track views gain the Split view's floor. A range or track that starts at a fractional second no longer reads below its start while it plays.

**Blocked by:** None (can start immediately).

Status: resolved

Spec: `.scratch/shared-stretch-view-for-the-Range-and-Track-views/spec.md` (Implementation Decisions: the slider's value; Testing Decisions).

- [x] A spec, written red first, with the composable in a bare host component and real stores: the value while playing and paused, the floor under a fractional start, frames only while playing.
- [x] A Range view case for the fix, red before the switch: a range from 12.34 s reads 12.34, not 12, while it plays at 12.5 s.
- [x] No view keeps its own `heardSeconds` or calls the playhead-frames composable directly.
- [x] The slider-value cases leave the Range and Track view specs, except one wiring case each ("the slider follows the playhead").
- [x] `CHANGELOG.md`, under Unreleased, Fixed: the Range and Track views' slider no longer reads below the start of the range or track while it plays.

## Comments

- Status was `open`; taken as ready, as in ticket 01.
- The returned slider value is a computed ref. A view passes its own `draw`; the composable owns the frames and the whole-second copy.
- The Range view's playing case ("12.34 s start reads 12.34") stays in its spec beside the paused wiring case. The Track view keeps only the paused wiring case; its playing case moved to the composable spec. The Split view spec is unchanged.
- The canvas-view skill's line on redraws now names `usePlayheadSlider`.
