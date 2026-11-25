# 04: The moving line in the loudness panel

**What to build:** a dashed line on the loudness curve that follows the music: the loudness around, minus the depth. It sits next to the fixed threshold line, so the panel shows both ways of judging quiet. Dragging it up or down changes the depth, as dragging the threshold line changes the threshold.

**Blocked by:** 03 (the depth setting is in the store).

**Status:** resolved

Spec: user stories 20 to 23; Implementation Decisions "Loudness-curve widget" (the moving line, dragging it). Read the `canvas-view` skill and `DESIGN.md` first.

- [x] For each pixel column, the line is at the loudness around minus the depth, dashed, in its own colour from the theme tokens, readable in light and dark.
- [x] It is left out where it would sit wholly under the panel's −60 dB floor.
- [x] Dragging it changes the depth in tenths, held to the slider's range; the slider stays the keyboard way.
- [x] Where both lines are under the pointer, the threshold line wins.
- [x] Specs beside the threshold line's cover the line's position and its drag maths.
- [x] In the browser: on `sample1.m4a` the line follows the music and dips into each gap; dragging it moves the slider and the preview with it, in both themes.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- **The line's colour is `ink`, no new token.** "Its own colour from the theme tokens" is read conservatively: DESIGN.md's Rust Rule keeps rust for splits and the threshold, and the Graphite Rule keeps audio graphite, so a new colour would change the design system. `ink` is the colour of the marks and the dip diamonds, and it is told from the curve by its dash and from the threshold by its colour. DESIGN.md names it in the loudness-curve line and in Graphite Ink's uses. It reads in both themes (checked by eye, light and dark).
- **A column under the −60 dB floor is left out, one by one**, so a line wholly under the floor is not drawn, and one partly under it breaks where it dips under.
- **The line samples the loudness around once per pixel column**, at the column's middle window (the curve is far longer than the canvas is wide, and the loudness around changes slowly), so a drag costs one pass over the columns.
- **Drag maths:** the line at the grabbed column follows the pointer, so the depth is that column's loudness around minus the loudness under the pointer (less the grab offset), in tenths, held to 3 to 30 dB. The threshold line is tried first in the component, so where both are under the pointer it wins; a drag in progress of either stops the other from taking hold.
- **In the browser** (`sample1.m4a`, dev server, Chrome driven with `playwright-cli`): the dashed line follows the music and dips into each gap, under the threshold line. Dragging it from (150, 53) up moved the Depth slider from 15.0 to 8.4 dB and "Find splits (33)" to (39), and on to 3.4 dB and (53) with the pointer carrying on to another column; the threshold stayed −34.7 dB and the file stayed one track. Dark theme checked on the same file.
- **Code review:** not run on this ticket (see ticket 02). Checkpoint tier run: `pnpm test:changed`, `pnpm lint:changed`, `pnpm typecheck` and the whole `pnpm vitest run` (2337 passed).
