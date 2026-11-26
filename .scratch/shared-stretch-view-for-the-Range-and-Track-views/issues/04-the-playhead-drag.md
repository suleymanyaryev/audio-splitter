# 04: The playhead drag; the press and double-click move into each view

**What to build:** `usePlayheadDrag(axis)` in split-zoom lib, and a small shared helper for the pointer's x within the element. The drag:

- `tryGrab(event)`: takes only the primary button, first lets go of a held playhead, and within 6 px of the playhead captures the pointer, keeps the grab offset, calls the player's grab and returns true. Otherwise it returns false.
- A move while dragging seeks the player to the time under the pointer minus the offset. A move with no button held lets go. A move with no drag on sets `overPlayhead`.
- Release, cancel and lost capture let go, through the player's drop.

Each view writes its own pointer-down and double-click, asking `tryGrab` first:

- Range view's press: otherwise it places the mark.
- Track view's press: otherwise it selects the pending split within 6 px, or else lets go of the selected pending split and places the track's mark.
- Double-click: the split line within 6 px selects that split, otherwise the player seeks there. The Range view hits any split; the Track view hits only its two end splits.

The 10-callback press composable and its spec are removed. Nothing changes for the user.

**Blocked by:** 03

Status: open

Spec: `.scratch/shared-stretch-view-for-the-Range-and-Track-views/spec.md` (Implementation Decisions: the playhead drag, the press and the double-click stay in each view; Testing Decisions; Further Notes: the canvas-view skill).

- [ ] A spec for the drag, written red first, in a host component with the fake pointer events the old press spec uses. It covers grab at 6 px and not at 7 px, the primary button only, the offset, a move with no button, release, cancel, lost capture, a press while held, and `overPlayhead`. The old spec's drag cases move here.
- [ ] The old press composable and its spec are gone, and knip is clean.
- [ ] The drag cases leave the Range and Track view specs, except one wiring case each ("a press on the playhead drags it").
- [ ] The views' own press and double-click cases pass unchanged.
- [ ] The canvas-view skill's pointer section says a drag goes in a `use-*-drag.ts` composable (the playhead drag as the example). What a press or a double-click means is written in the view, which asks the drag first. The fixed-order example is the Track view's pointer-down.
- [ ] No changelog line.
