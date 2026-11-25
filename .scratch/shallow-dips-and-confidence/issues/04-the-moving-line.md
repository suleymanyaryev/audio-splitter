# 04: The moving line in the loudness panel

**What to build:** a dashed line on the loudness curve that follows the music: the loudness around, minus the depth. It sits next to the fixed threshold line, so the panel shows both ways of judging quiet. Dragging it up or down changes the depth, as dragging the threshold line changes the threshold.

**Blocked by:** 03 (the depth setting is in the store).

**Status:** ready-for-agent

Spec: user stories 20 to 23; Implementation Decisions "Loudness-curve widget" (the moving line, dragging it). Read the `canvas-view` skill and `DESIGN.md` first.

- [ ] For each pixel column, the line is at the loudness around minus the depth, dashed, in its own colour from the theme tokens, readable in light and dark.
- [ ] It is left out where it would sit wholly under the panel's −60 dB floor.
- [ ] Dragging it changes the depth in tenths, held to the slider's range; the slider stays the keyboard way.
- [ ] Where both lines are under the pointer, the threshold line wins.
- [ ] Specs beside the threshold line's cover the line's position and its drag maths.
- [ ] In the browser: on `sample1.m4a` the line follows the music and dips into each gap; dragging it moves the slider and the preview with it, in both themes.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
