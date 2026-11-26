# 03: The axis, and the stretch views read the player's extent

**What to build:** `stretchAxis(extent, width)` in split-zoom lib. It returns:

- `toX(seconds)`;
- `toSeconds(x)`, rounded to 10 ms as the dragged-time helper does;
- the centre and length that the zoom helpers take.

It is built on the existing range-window and zoom-axis helpers.

The Range view and the Track view read their span from `player.extent` for the axis, the draw and the slider's minimum and maximum. The Track view stops computing the track's extent. Each view builds the axis from the extent and the frame's measured width wherever it maps time, including inside the press callbacks it still has. Each view's redraw watch follows the extent's ends. Nothing changes for the user.

**Blocked by:** None (can start immediately).

Status: resolved

Spec: `.scratch/shared-stretch-view-for-the-Range-and-Track-views/spec.md` (Implementation Decisions: the axis, the extent; Testing Decisions).

- [x] A pure spec for the axis: both directions, the 10 ms rounding, the centre and length.
- [x] Neither view calls the range-window or zoom-axis helpers directly, nor keeps an `axis()` of its own.
- [x] The Range view no longer reads `split.range` for its span or its slider bounds.
- [x] The Track view no longer imports the track-extent helper.
- [x] The Range and Track view specs pass unchanged.
- [x] No changelog line.

## Comments

- Status was `open`; taken as ready, as in ticket 01.
- `stretchAxis(extent, width)` also accepts a null extent and then returns null ("with nothing on show there is no axis"), so a view's press callbacks and, in ticket 04, the drag's axis getter can pass `player.extent` without a guard. Its centre and length are named `centreSeconds` and `windowSeconds`, as the zoom helpers' parameters are.
- The Track view's `C` check "a track is selected" now reads `player.extent === null`: the extent is null exactly when no track is on show.
- The view specs passed unchanged; the axis is specced on its own, purely.
- The canvas-view skill's line on mapping time to x now names `stretchAxis`.
