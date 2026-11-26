# 05: The contrast threshold on the lane

**What to build:** while contrast is on, the contrast lane shows the threshold as a dashed line with a handle, which can be dragged up and down like the depth line, and a mark at each split Find splits would add for contrast. The marks follow the threshold as it moves. While contrast is off, the line and the marks are hidden and the curve stays.

**Blocked by:** 04.

**Status:** resolved

Spec: `.scratch/crossfade-changes/spec.md`, user stories 16 to 21; Implementation Decisions, the loudness panel's threshold line and peak marks.

- [x] The dashed threshold line and its handle are drawn on the lane only while contrast is on.
- [x] Dragging it moves the contrast threshold, held to the slider's range and grid; the slider and the line always agree. Where another line is also under the pointer, the existing lines win.
- [x] A mark sits at each contrast proposal of the preview, and only while contrast is on.
- [x] Lib-level specs, like those of the depth line, its drag and the dip marks: the lane's dB-to-height mapping and back, the drag, the marks.
- [x] Look and sizes from the design system (`DESIGN.md`, the `canvas-view` skill).
- [x] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- The lane is its own canvas, so "where another line is also under the pointer, the existing lines win" holds without code: the silence threshold and the depth line are on the loudness canvas, which the lane's pointer never reaches.
- The threshold line is `ink`, not `split` rust: rust is for splits and the silence threshold (DESIGN.md), and the lane's curve and marks are `ink`. It has no label plate (the slider's readout gives the value, and a plate would meet the lane's own label near the top of the scale). `DESIGN.md`'s contrast lane bullet says so.
- `useThresholdDrag` takes an optional scale (`lineY`, `valueAt`), the loudness curve's by default, so the lane reuses the silence threshold's drag instead of a copy. The drag source returns no threshold while contrast is off, so a press does nothing then.
- The dip marks' diamond drawing moved into `lib/draw-diamond-marks.ts`, which the lane's marks share (`Path2D` stubbed in its spec, as jsdom has none). The canvas drawing itself is looked at in the browser at ticket 08, as `LoudnessCurve.vue`'s always was.
