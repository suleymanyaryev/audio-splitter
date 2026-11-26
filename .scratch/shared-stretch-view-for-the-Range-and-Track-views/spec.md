# Building blocks for the Range and Track views

Status: resolved

Candidate 4 of the [architecture review](../code-cleanup-and-readability/architecture-review.md#4-a-shared-stretch-view-for-the-range-and-track-views). The grilling turned "one shared stretch view" into building blocks that each view composes. No glossary change: "stretch" stays a code name for the range or the selected track, as the player already uses it. No ADR: every decision is cheap to reverse, and ADR 0002 (keys belong to the view on show) is untouched.

## Problem Statement

The Range view and the Track view are about 160 lines apart from being one file. Each writes its own copy of the draw pipeline's shared layers, the playhead and the frame, the slider's value, the time-to-pixel mapping, the press wiring, the playhead drag, Space, Home and the arrows, the redraw watch and the failure line. The Split view repeats the playhead, the frame, the slider's value and the failure line a third time.

So a fix to the playhead, the arrows or the slider must be made two or three times, and it already went wrong once: the Split view keeps its slider's value from falling under the extent's start while it plays, and the Range and Track views do not. A range that starts at 12.34 s tells a screen reader 12 s while it plays at 12.5 s.

The press composable the two views share is shallow. It takes 10 callbacks, 3 of them identical in both views, and the Track view rebuilds its time-to-pixel mapping inside four of them. Its interface is about as wide as what it does.

One shared component configured by props was considered and rejected. It would work today, but every feature that one view needs and the other does not would add another prop. The first, the Track view's pending splits, was already in sight.

## Solution

The views are composed from small building blocks: drawing helpers, one axis, three composables and one component. Each block does one thing for every view that uses it. Each view keeps everything that is its own, in its own file: the order of its draw layers, what a press and a double-click mean after the playhead, its own keys, its redraw watch and its template.

A fix to the playhead, the frame, the slider, the drag or the shared keys is made once, in its block. A feature for one view is written in that view.

The user sees one difference: in the Range view and the Track view, the slider's value no longer falls under the start of the stretch while it plays. Everything else looks, sounds and responds as before.

## User Stories

1. As a maintainer, I want the playhead drawn by one helper, so that its width and pixel snapping are fixed in one place for all three views.
2. As a maintainer, I want the frame drawn by one helper, so that its 1.5 px ink stroke is the same in all three views.
3. As a maintainer, I want the playhead's and the frame's widths defined once, beside their helpers, so that no view keeps its own copy.
4. As a maintainer, I want the Split view to keep its check that the playhead is inside the canvas, so that its zoom window still hides a playhead that is outside it.
5. As a maintainer, I want one axis that maps time to pixels and pixels to time for a stretch, so that no view rebuilds the mapping inside its handlers.
6. As a maintainer, I want the axis to round a pointer's time to the 10 ms grid, so that a mark, a split or a seek made from a click lands on the same grid as a dragged split.
7. As a maintainer, I want the axis to also carry the centre and length the zoom helpers take, so that each view's draw calls the bar and land helpers from it.
8. As a maintainer, I want one composable for the slider's value, so that "the sound's place to the whole second while it plays, the resting place to the hundredth otherwise" is written once.
9. As a maintainer, I want that composable to run the playhead's animation frames, so that a view does not wire the frames and the slider's value separately.
10. As a maintainer, I want the slider's value never to fall under the extent's start while playing, in every view, so that the fix the Split view already has reaches the other two.
11. As a screen reader user, I want the Range view's slider never to read below the range's start, so that the value I hear stays inside the range.
12. As a screen reader user, I want the Track view's slider never to read below the track's start, so that the value I hear stays inside the track.
13. As a maintainer, I want one composable for dragging the playhead, so that grabbing within 6 px, capturing the pointer, keeping the grab offset and letting go are written once.
14. As a maintainer, I want the drag composable to talk to the player itself, so that no view passes in grab, move and drop callbacks that are the same everywhere.
15. As a maintainer, I want the drag composable to answer whether a press grabbed the playhead, so that each view writes what any other press means.
16. As a maintainer, I want the drag to let go when the pointer is released, cancelled or loses capture, or when a move arrives with no button held, so that a lost release never leaves the playhead held.
17. As a maintainer, I want a press while the playhead is held to let go first, so that a second finger or a missed release cannot stack two drags.
18. As a maintainer, I want the drag composable to say when the pointer is over the playhead or dragging it, so that each view shows the resize cursor from one source.
19. As a maintainer, I want the Range view to write its own press, so that "grab, else place the mark" reads in the view.
20. As a maintainer, I want the Track view to write its own press, so that "grab, else select a pending split within 6 px, else let go of the selected pending split and place the mark" reads in the view.
21. As a maintainer, I want each view to write its own double-click, so that the Range view hits any split's line and the Track view hits only its two end splits, each saying what it means.
22. As a maintainer, I want the press composable with 10 callbacks removed, so that the shallow interface leaves the codebase.
23. As a maintainer, I want one composable for the stretch's shared keys, so that Space, Home, Left and Right are written once.
24. As a maintainer, I want each view to ask the shared keys first and then its own, so that a view adds keys without touching the shared ones.
25. As a maintainer, I want each view to keep registering its own page keys and emitting `acted`, so that the view stays the one that owns its keys, as ADR 0002 says.
26. As a maintainer, I want one component for the failure line, so that its role, place and look are the same in all three views.
27. As a maintainer, I want both stretch views to read their span from the player's extent, so that neither works out the range or the track's ends again.
28. As a maintainer, I want the slider's minimum and maximum read from the player's extent in both stretch views, so that the Range view stops reading the range from the split store for them.
29. As a maintainer, I want each view to keep its own draw in its own layer order, so that the back-to-front order of a view's layers is visible in one function.
30. As a maintainer, I want the Track view's pending splits to stay in the Track view only, so that the Range view never learns about them.
31. As a maintainer, I want each view to keep its own template, so that no shell component has to hand elements back up or forward pointer events.
32. As a maintainer, I want each view to keep its own redraw watch, so that what it draws and what it watches sit side by side.
33. As a maintainer, I want the Split view to keep its own drag, keys and draw, so that its split handle, audition edges and zoom window stay its own.
34. As a maintainer, I want each block to have its own spec, so that a block's behaviour is tested once rather than once per view.
35. As a maintainer, I want each view's spec to keep one wiring case per block it uses, so that a view that forgets to use a block still fails a test.
36. As a maintainer, I want the canvas-view skill to describe composing a view from blocks, so that the next view is built the same way.
37. As a user, I want the Range view's press, double-click, drag, keys and drawing to work as today, so that nothing I rely on changes.
38. As a user, I want the Track view's press, double-click, drag, keys, pending splits and drawing to work as today, so that nothing I rely on changes.
39. As a user, I want the Split view to look and play as today, so that nothing I rely on changes.

## Implementation Decisions

- **Composition, not configuration.** There is no shared stretch view component. The Range view and the Track view are each composed from the blocks below, and everything else stays in the view. A feature for one view adds code to that view, never a prop or an option to a block.
- **The blocks.**

  | Block                       | Segment              | Interface                                                                                                                                         | Used by      |
  | --------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
  | `drawPlayhead`, `drawFrame` | shared canvas lib    | `drawPlayhead(context, x, colour, height)`: 1 CSS px, snapped to a whole pixel. `drawFrame(context, width, height, colour)`: a 1.5 px inset stroke | all three    |
  | `stretchAxis`               | split-zoom lib       | `stretchAxis(extent, width)` gives `toX(seconds)`, `toSeconds(x)` rounded to 10 ms, and the centre and length the zoom helpers take               | Range, Track |
  | `usePlayheadSlider`         | split-zoom lib       | `usePlayheadSlider(draw)` runs the playhead frames while the player plays and returns the slider's value                                          | all three    |
  | `usePlayheadDrag`           | split-zoom lib       | `usePlayheadDrag(axis)` gives `tryGrab(event)`, the move and end handlers, `overPlayhead` and `dragging`                                          | Range, Track |
  | `useStretchKeys`            | split-zoom lib       | `useStretchKeys()` gives `isStretchKeyActedOn(event)`                                                                                             | Range, Track |
  | `PlayerFailure`             | split-zoom ui        | A component with no props that shows the player's failure as the `role="status"` line at the bottom centre, or nothing                           | all three    |

- **The playhead and the frame.** Their widths are defined once, beside the helpers. The Split view calls `drawPlayhead` only when the playhead is inside its canvas, as today. The source waveform's frame is not part of this.
- **The axis.** It is built from the player's extent and the frame's measured width, through the existing range-window and zoom-axis helpers. `toSeconds` rounds as the dragged-time helper does. A view builds it when it needs it, so a resize is always seen. With nothing on show there is no axis.
- **The slider's value.** While the player plays: the sound's place floored to the whole second, but never under the extent's start. Otherwise: the player's playhead to the hundredth. With nothing on show: 0. It wraps the existing playhead-frames composable, which keeps its own spec. Each view passes its own `draw`.
- **The playhead drag.**
  - `tryGrab(event)` takes only the primary button. It first lets go of a held playhead. Within 6 px of the playhead it captures the pointer, keeps the grab offset, calls the player's grab and returns true. Otherwise it returns false and does nothing.
  - A move while dragging seeks the player to the time under the pointer minus the grab offset. A move with no button held lets go. A move with no drag on sets `overPlayhead`.
  - Release, cancel and lost capture let go, which calls the player's drop.
  - It reads the playhead from the player and takes the axis as a getter.
- **The press and the double-click stay in each view.** Each view's pointer-down asks `tryGrab` first.
  - Range view: otherwise it places the mark at the time under the pointer.
  - Track view: otherwise it selects the pending split within 6 px, or else lets go of the selected pending split and places the track's mark.
  - Range view's double-click: the split line within 6 px of any split selects that split, otherwise the player seeks there.
  - Track view's double-click: the same, with only its two end splits as targets.
  - The pointer's x within the element is one small shared helper in split-zoom lib, used by the drag and both views.
  - The press composable with 10 callbacks and its spec are removed.
- **The shared keys.** `isStretchKeyActedOn` handles:
  - Space: toggles the player. A held key is taken but ignored.
  - Home: back to the start.
  - Left and Right: seek 1 s, with Shift 10 s, rounded to the millisecond, from the player's playhead.

  Every other key returns false. Each view's own key handler asks it first, then its own keys. Each view still registers its page keys and emits `acted`. Enter, Shift+Enter, the track steps, Delete, Backspace, Escape, `X` and `C` stay where they are.
- **The extent.** Both stretch views read their span from the player's extent: the axis, the draw and the slider's minimum and maximum. The Track view stops computing the track's extent, which the player still uses. Each view's redraw watch follows the extent's ends instead of the range or the selected track.
- **Each view's draw** lists its own layers back to front, through the shared drawers.
  - Range view: bars, lands, split lines with the selected one heavier, confidence marks, the mark, the playhead, the frame.
  - Track view: the same, with the pending splits between the confidence marks and the mark, and its own mark.
- **Each view's template** keeps its slider element, canvas and labels, with the slider's value from the slider block and the minimum and maximum from the extent. The failure line becomes the shared component.
- **The Split view** takes `drawPlayhead`, `drawFrame`, `usePlayheadSlider` and `PlayerFailure`. Its drag, its handle, its keys, its audition edges and its "no splits" line stay its own.

## Testing Decisions

- **Good tests** check what a user or a caller sees: what a key, a press or a drag does to the split store and the player's verbs, the slider's ARIA values, what the drawing asks of the 2D context, and what a helper returns. They don't read a block's internals.
- **No new kind of seam.**
  - The three view specs stay the top seam. They mount the view with real Pinia stores and spied player verbs.
  - Each block is specced at its own seam, following prior art already in the repo.
- **Block specs.**
  - `drawPlayhead`, `drawFrame`: a recording 2D context, as the lands-and-splits drawing spec does. They cover the snapped x, the widths and the inset.
  - `stretchAxis`: pure, as the zoom-axis and range-window specs are. It covers both directions, the 10 ms rounding and the zoom helpers' centre and length.
  - `usePlayheadSlider`: mounted in a bare host component with real stores, as the playhead-frames spec does. It covers the value while playing and while paused, the floor under a fractional start, and the frames running only while playing.
  - `usePlayheadDrag`: a host component, with the fake pointer events the press spec uses today. It covers grabbing within 6 px and not at 7 px, the primary button only, the grab offset, a move with no button, release, cancel and lost capture, a press while held, and `overPlayhead`. Its cases come from the removed press spec.
  - `useStretchKeys`: a host component with spied player verbs. It covers Space and its auto-repeat, Home, both arrows with and without Shift, no drift over ten steps, and other keys returning false.
  - `PlayerFailure`: mounted on its own. It covers nothing while there is no failure, and the failure line when there is one.
- **View specs.**
  - The cases each view has twice today leave the view specs for the block specs: arrows, Home, Space, playhead drag, slider value and the failure line.
  - Each view spec keeps one wiring case per block it uses, for example "Space plays the range", "a press on the playhead drags it", "the slider follows the playhead" and "a failure is shown".
  - Each view spec keeps everything that is its own: the Range view's Enter, Shift+Enter, mark press and double-click; the Track view's steps, `X`, `C`, Enter, Shift+Enter, Delete, Backspace, Escape, pending press, double-click on end splits and confidence marks.
  - The Split view spec keeps its cases. It gains nothing beyond its existing playhead and failure cases.
- **Replace, don't layer.** A case moved to a block spec leaves the view spec. No case is in two places, except the one wiring case per block per view.
- **Done test-first.** Each block's spec is written red before the block, and each view's wiring case before the view switches to it.

## Out of Scope

- One shared stretch view component, or a shell component around the slider and canvas.
- A generic overlay or draw callback for extra layers.
- One set of commands per view, shared by keys and buttons (review candidate 5).
- Pending splits deciding for themselves what discards them (review candidate 7), and any change to the split store.
- Folding the Split view's drag into the playhead drag, or its Space and Home into the shared keys.
- The source waveform's and the loudness curve's frames and drawing.
- Any change to the player's interface.

## Further Notes

- **Docs that this changes.**
  - The canvas-view skill's pointer section: a drag goes in a `use-*-drag.ts` composable, with the playhead drag as the example. What a press or a double-click means is the view's own, written in the view, which asks the drag first. Its example of testing one press's meanings in a fixed order becomes the Track view's pointer-down. The keyboard reference to the Range view's key handler stays.
  - `CHANGELOG.md`, under Unreleased, Fixed: the Range and Track views' slider no longer reads below the start of the range or track while it plays.
  - `docs/architecture.md`, `GLOSSARY.md`, the ADRs and `README.md`: unchanged. No store, connection, flow or status changes.
- **The review's count.** It said about 230 lines were shared. After candidate 3 landed, about 160 are, because the player now works out what is on show and exposes its extent.
- **Tickets**, in `issues/`, each green on its own and done test-first, on one branch and one PR:
  1. The playhead, frame and failure-line blocks, in all three views.
  2. The slider's value, in all three views, with the floor fix.
  3. The axis, and the stretch views read the player's extent.
  4. The playhead drag; the press and double-click move into each view. Blocked by 3.
  5. The shared keys.
