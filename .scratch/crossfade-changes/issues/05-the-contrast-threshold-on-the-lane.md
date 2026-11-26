# 05: The contrast threshold on the lane

**What to build:** while contrast is on, the contrast lane shows the threshold as a dashed line with a handle, which can be dragged up and down like the depth line, and a mark at each split Find splits would add for contrast. The marks follow the threshold as it moves. While contrast is off, the line and the marks are hidden and the curve stays.

**Blocked by:** 04.

**Status:** ready-for-agent

Spec: `.scratch/crossfade-changes/spec.md`, user stories 16 to 21; Implementation Decisions, the loudness panel's threshold line and peak marks.

- [ ] The dashed threshold line and its handle are drawn on the lane only while contrast is on.
- [ ] Dragging it moves the contrast threshold, held to the slider's range and grid; the slider and the line always agree. Where another line is also under the pointer, the existing lines win.
- [ ] A mark sits at each contrast proposal of the preview, and only while contrast is on.
- [ ] Lib-level specs, like those of the depth line, its drag and the dip marks: the lane's dB-to-height mapping and back, the drag, the marks.
- [ ] Look and sizes from the design system (`DESIGN.md`, the `canvas-view` skill).
- [ ] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
