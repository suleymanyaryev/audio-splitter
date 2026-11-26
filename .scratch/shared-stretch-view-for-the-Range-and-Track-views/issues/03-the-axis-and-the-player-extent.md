# 03: The axis, and the stretch views read the player's extent

**What to build:** `stretchAxis(extent, width)` in split-zoom lib. It returns:

- `toX(seconds)`;
- `toSeconds(x)`, rounded to 10 ms as the dragged-time helper does;
- the centre and length that the zoom helpers take.

It is built on the existing range-window and zoom-axis helpers.

The Range view and the Track view read their span from `player.extent` for the axis, the draw and the slider's minimum and maximum. The Track view stops computing the track's extent. Each view builds the axis from the extent and the frame's measured width wherever it maps time, including inside the press callbacks it still has. Each view's redraw watch follows the extent's ends. Nothing changes for the user.

**Blocked by:** None (can start immediately).

Status: open

Spec: `.scratch/shared-stretch-view-for-the-Range-and-Track-views/spec.md` (Implementation Decisions: the axis, the extent; Testing Decisions).

- [ ] A pure spec for the axis: both directions, the 10 ms rounding, the centre and length.
- [ ] Neither view calls the range-window or zoom-axis helpers directly, nor keeps an `axis()` of its own.
- [ ] The Range view no longer reads `split.range` for its span or its slider bounds.
- [ ] The Track view no longer imports the track-extent helper.
- [ ] The Range and Track view specs pass unchanged.
- [ ] No changelog line.
