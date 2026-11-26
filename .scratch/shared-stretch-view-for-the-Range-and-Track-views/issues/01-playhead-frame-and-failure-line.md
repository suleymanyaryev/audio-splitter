# 01: The playhead, frame and failure-line blocks

**What to build:** three blocks that all three views use instead of their own copies.

- `drawPlayhead(context, x, colour, height)` and `drawFrame(context, width, height, colour)` in the shared canvas lib. The playhead's and the frame's widths are defined there once.
- `PlayerFailure`, a component in split-zoom ui that shows the player's failure as the `role="status"` line at the bottom centre, or nothing.

The Range view, the Track view and the Split view use them. The Split view still draws the playhead only when it is inside its canvas. Nothing changes for the user.

**Blocked by:** None (can start immediately).

Status: resolved

Spec: `.scratch/shared-stretch-view-for-the-Range-and-Track-views/spec.md` (Implementation Decisions: the blocks, the playhead and the frame; Testing Decisions).

- [x] A spec for the two drawers, with a recording 2D context: the snapped x, the widths, the frame's inset.
- [x] A spec for `PlayerFailure`: nothing while there is no failure, the line when there is one.
- [x] No view defines its own playhead or frame width, or draws either by hand.
- [x] No view writes the failure line's markup.
- [x] The failure-line cases leave the Range and Track view specs, except one wiring case each ("a failure is shown").
- [x] The Split view spec passes unchanged.
- [x] No changelog line.

## Comments

- The ticket's status was `open`, not `ready-for-agent`. `docs/agents/issue-tracker.md` defines the frontier as open, unblocked, unclaimed tickets, so `open` was taken as ready.
- `FRAME_WIDTH` is exported from `draw-playhead-and-frame.ts`: the three views keep their bars `FRAME_WIDTH` inside the canvas, so the one definition is shared. `PLAYHEAD_WIDTH` stays private.
- The canvas-view skill's two lines on the playhead, frame and failure line now name the shared blocks.
