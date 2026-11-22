# 03: Step between splits in the Split view

**What to build:** In the Split view with a selected split, `]` selects the next split and `[` the previous one, with the same selection a click makes: the zoom window centres on the new split, and the track list and the whole-file view follow. An audition that was on (playing or loading) starts again across the new split; none starts when none was on. The keys use the physical-key rule from ticket 01. Spec: `.scratch/prev-next-keys/spec.md`.

**Blocked by:** 01 (Step between tracks in the Track view)

**Status:** resolved

- [x] `]` selects the next split and `[` the previous one; the zoom window centres on it and the zoom title shows its time.
- [x] The split store has `selectAdjacentSplit(step)`, which goes through the existing split selection and returns whether the selection changed.
- [x] An audition playing or loading before the step starts again across the new split; with none on, none starts.
- [x] `[` on the first split and `]` on the last change nothing, raise no error, are not taken, and leave an audition that is on untouched.
- [x] A press with Shift, a repeat, a press in a track name and a press while a dialog is open do nothing.
- [x] The shortcuts dialog's Split view section lists `[ / ]`: "Select the previous or next split; an audition plays on from the new split".
- [x] Cases in the Review page spec.

## Comments

- `selectAdjacentSplit(step)` in the split store mirrors `selectAdjacentTrack`: it steps from the selected split through `selectSplit`, so the window centres and the discard rule apply as on a click, and returns whether the selection changed. With no split selected it returns false; stepping from the zoom centre is ticket 04.
- The handler in `SplitZoom.vue` reads `audition.isActive` (playing or loading) before the step, because the audition store's sync watch on the selected split lets go of the old clip during it. If the selection changed and the audition was on, it calls `audition.toggle()`: the watch has left the player idle, so that starts the clip across the new split. The audition store is unchanged. The spec has no paused audition yet (issue #2), so idle is the only "off" state.
- The match is by `event.code`, with Shift and repeat ignored, as in `TrackView.vue`. A pending split can still exist in the Split view (the view control keeps the track selected), and then these keys open the discard question as a click does.
- Specs are in the Review page spec, seeded from the page on split 1 (splits at 21 s and 71.5 s). The marked row in the track list, the zoom title and the zoom centre are the observable results; the whole-file view is a canvas and is not asserted.
- CHANGELOG: ticket 01's Unreleased line is replaced by one that covers both views, rather than adding a second line.
- Both views read the key through one helper, `stepOfKey` in `src/widgets/split-zoom/lib/step-of-key.ts`: it holds the physical-code map and the reason for it, and returns null for Shift and repeats. The audition and player carry-over stay in each view.
- `TrackView.vue`'s `isKeyActedOn` was split into `isKeyActedOn` and `isOtherKeyActedOn`, because the step branch pushed its cognitive complexity to 16 (limit 15). `lint:changed` had hidden it, since the function's lines were unchanged.
