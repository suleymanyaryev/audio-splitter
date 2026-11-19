# Tracks and splits, apart

Status: resolved

Milestone 9. Vocabulary is in `GLOSSARY.md`; this spec adds **Selected track**, **Track view** and **Removing a track**, and widens **Range view** to a three-way control (see Further Notes).

## Problem Statement

The review screen treats a track and a split as one thing. When I click a track's block in the strip or its row in the Track list, the app selects the split where that track starts and shows the 20 s around it, so I land on an edge when I asked for the whole track. The first track has no split where it starts, so I cannot select it at all. I cannot listen to a track from start to end: the audition is 8 s across a split, and a range stops at 10 min and has to be dragged by hand to match the track's ends. The Track list's trash button reads as "delete this track", but it deletes the split where the track starts and merges the track into the one before, which is a split operation dressed as a track operation. The strip has no place for splits at all, so the only way to reach a split by its position among the tracks is through a track that starts there.

## Solution

Tracks and splits become two things I select separately, at most one at a time.

- **Selecting a track** (its block in the strip, or its row in the Track list, the first track included) switches the zoom panel to a new **Track view**: the track stretched across the panel, with its gaps and its two end splits, a playhead, Play/Pause and "Back to track start". I can hear any track end to end, whatever its length. No split is added or moved there.
- **Selecting a split** works as today and shows the zoom view, where I drag the split inside its 20 s window, add one at the centre, play across it and now also delete it with a visible "Delete split" button.
- **The strip** gets a narrow split item between every two track blocks. Clicking it selects that split.
- **The Track list** interleaves split rows between track rows. A track row names the track and removes it. A split row has no name; clicking it selects the split and its button deletes the split.
- **Removing a track** merges it and its two neighbours into one track, by deleting the splits at both its ends. **Deleting a split** merges the two tracks either side of it.
- The panel's control becomes `Split | Track | Range`. Dragging a range on the whole-file view is unchanged: it is still where I listen anywhere and add a split at the mark.

## User Stories

### Selecting a track

1. As a user reviewing proposed tracks, I want a click on a track's block in the strip to select that track, so that I review the track itself and not the split at one of its edges.
2. As a user, I want a click on a track's row in the Track list to select that track, so that the list and the strip agree on what a track click means.
3. As a user, I want a click on a track row's number button to select the track, so that I can select it from the keyboard.
4. As a user, I want focusing a track's name field to select that track, so that the panel shows the track I am naming.
5. As a user, I want the first track to be selectable like any other, so that I can listen to the opening track too.
6. As a user, I want the selected track's block in the strip marked with the 2 px border, so that I can see which track is under review.
7. As a user, I want the selected track's row in the Track list marked and scrolled into view, so that I find it in a long list.
8. As a user, I want the whole-file view to outline the selected track's stretch, so that I can see where it sits in the file.
9. As a user, I want selecting a track to clear any selected split, so that one thing is under review at a time.
10. As a user, I want selecting a track to switch the zoom panel to the Track view, so that I see and hear the whole track at once.

### The Track view

11. As a user, I want the Track view to draw the selected track stretched across the panel, whatever its length, so that a 30 s track and a 40 min track both fill the view.
12. As a user, I want the Track view at the zoom view's height and in its place, so that the page does not jump when the panel switches.
13. As a user, I want the track's gaps and its two end splits drawn in the Track view, so that I see where it begins and ends and where it goes quiet.
14. As a user, I want no mark and no "Add split" in the Track view, so that reviewing a track never adds a split by accident.
15. As a user, I want the end splits in the Track view to stay put under my pointer, so that splits are moved only in the zoom view.
16. As a user, I want the panel's title in the Track view to read the track's name, start and end (`4 · 0:03:00.93 – 0:04:50.02`), so that I know which track I am hearing and exactly where it lies.
17. As a user, I want the Delete key to do nothing in the Track view, so that removing a track (which deletes up to two splits and cannot be undone) only happens from its button.

### Listening to a track

18. As a user, I want a Play button in the Track view that plays the selected track from the playhead, so that I hear the track itself.
19. As a user, I want the button to read "Stop" while the track is being decoded and "Pause" while it plays, so that a press always says what it will do.
20. As a user, I want pausing and playing again to resume at once from the same place, so that I can stop to think without waiting for a decode.
21. As a user, I want to hear a track longer than 10 minutes in full, so that a long track is reviewed like a short one.
22. As a user listening to a long track, I want playback to carry on past each 10 min stretch without me doing anything, so that the decoding behind it stays out of my way.
23. As a user, I want the playhead drawn at the track's start for a newly selected track, so that I know where Play will begin.
24. As a user, I want to click in the Track view to move the playhead there, so that I can listen again from any point.
25. As a user, I want to drag the playhead, pausing a playing track while I drag and playing on from where I drop it, so that the sound does not jump under the pointer.
26. As a user, I want to move the playhead from the keyboard (Left/Right, with Shift for a bigger step), so that I can listen around a spot without the mouse.
27. As a user, I want Space in the Track view to play or pause, ignoring a held key, so that it matches the button without starting and stopping over and over.
28. As a user, I want Home and a "Back to track start" button to take the playhead to the track's start, so that I can hear the opening again.
29. As a user, I want playback to stop at the track's end and the playhead to return to its start, so that Play replays the track.
30. As a user, I want seeking to land exactly where I asked in every supported format, so that the track view is as precise as the Range view.
31. As a user, I want a failure to play said in one line at the bottom of the Track view, so that I know why nothing is heard.

### Selecting and moving splits

32. As a user, I want a narrow split item between every two track blocks in the strip, so that I can reach a split by its place among the tracks.
33. As a user, I want a click on a split item to select that split and show the zoom view centred on it, as selecting a split does today, so that I can fine-tune it.
34. As a user, I want the split items drawn in vermilion when hovered, focused or selected, so that a split reads as a split, as everywhere else in the app.
35. As a user, I want a very short track to keep a block I can still click, so that a track of a few seconds can be selected next to its splits.
36. As a user, I want selecting a split to clear any selected track, so that one thing is under review at a time.
37. As a user, I want to drag the selected split in the zoom view, held inside the 20 s window and 1 s from its neighbours, as today, so that I place it on the gap.
38. As a user, I want the tracks either side of a split I move to grow and shrink in the strip and the list as I drag, so that I see the effect of the move.
39. As a user, I want a "Delete split" button in the zoom view's title row, so that deleting a split does not depend on knowing the Delete key.
40. As a user, I want Delete and Backspace on the split handle to keep deleting the selected split, so that the keyboard path I know still works.

### The Track list

41. As a user, I want the Track list to show split rows between the track rows, in time order, so that I see the file as tracks and the splits that divide them.
42. As a user, I want a split row to read `Split N` with its time in hundredths, with no length, so that it reads as a point and not a stretch.
43. As a user, I want a split row to have no name field, so that naming belongs to tracks only.
44. As a user, I want a click on a split row to select that split, so that I can reach split focus from the list.
45. As a user, I want the selected split's row marked and scrolled into view, so that the list follows the selection whichever kind it is.
46. As a user, I want a split row's trash button labelled "Delete split at 0:03:00.93" to delete that split and merge the tracks either side of it, so that a split is deleted from its own row.
47. As a user, I want a track row's merge button labelled "Remove track 4" to remove that track, so that a track is removed from its own row.
48. As a user, I want the two delete buttons to look different (trash for a split, merge for a track), so that I never mistake one for the other.
49. As a user, I want pressing a row's delete or remove button not to select that row, so that the button does only what it says.
50. As a user, I want the track row to keep its number, name, start and length columns, so that what I already read there stays where it was.

### Removing a track

51. As a user, I want removing a track in the middle to merge the previous track, it and the next track into one, so that a stretch the detection wrongly split twice becomes one track in a press.
52. As a user, I want removing the first track to merge it into the next one, so that the file's opening can be removed too.
53. As a user, I want removing the last track to merge it into the previous one, so that the file's ending can be removed too.
54. As a user, I want no remove button when there is only one track, so that I cannot remove the whole file.
55. As a user, I want the removed track's name to go with it and the merged track to keep the previous track's name (or the next track's when I remove the first track), so that the name I gave the surviving neighbour stays.
56. As a user, I want removing a track to count as the splits it deleted (two, or one at an edge) in the edit count, so that the replace-your-edits guard knows what a setting change would undo.
57. As a user, I want no confirmation before removing a track, so that it behaves like deleting a split.

### Selection when splits change

58. As a user who deletes an end split of the selected track, I want the merged track to become the selected track, so that I keep reviewing the stretch I was on.
59. As a user who removes the selected track, I want the merged track to be selected, so that the panel keeps showing something sensible.
60. As a user who deletes or removes something else, I want my selection to stay where it is, so that editing elsewhere does not move me.
61. As a user, I want playback of the selected track to stop when its ends change, so that I never hear a stretch that is no longer the track.
62. As a user who changes a setting, I want the selected track cleared and the first split selected, as a detection does today, so that a new set of splits starts from a known place.
63. As a user who deletes the selected split, I want the neighbouring split selected, as today, so that split review carries on.

### The zoom panel's control and sound

64. As a user, I want a `Split | Track | Range` control in the panel's title row, so that I can switch between the three views.
65. As a user, I want a segment disabled when it has nothing to show (Track with no selected track, Range with no range), so that the control never leads to an empty view.
66. As a user who selected a track, I want the Split segment to show the zoom window where it was with no split selected, so that switching to it does not invent a selection.
67. As a user, I want selecting a split, selecting a track or making a new range to stop whatever is playing, so that sound belongs to the view it was started in.
68. As a user, I want the export to stop any track playback, as it stops the audition and the range, so that exporting never plays over itself.

### Unchanged

69. As a user, I want dragging a range on the whole-file view to work as before, with the mark and "Add split" in the Range view, so that I can still add a split where I hear a track start.
70. As a user, I want a click on the whole-file view to keep selecting a split within 6 px or moving the zoom window, so that the view I know does not change.
71. As a user, I want renaming a track to work as before (its number until named, the name following the split where it starts), so that naming is unaffected.

## Implementation Decisions

- **One selection in the split store.** The selected split id gives way to one selection value: a split (by id), a track (by the id of the split where it starts, or none for the first track), or nothing.
  - The selected split, its index and a new selected track are derived from it. The selected track is the track whose start split matches, recomputed from the live tracks, so it follows its splits as they move.
  - Keying a track by its start split means only deleting that start split re-keys it: deleting its end split leaves the key and the merged track is the selected one with no extra work.
  - Selecting a track sets the selection and switches the view to `track`. It does not move the zoom window's centre.
  - Selecting a split, moving the zoom window and a detection behave as today, with the selection replacing the selected split id. A detection selects the first split.
  - The panel view gains `track`. Showing `track` with no selected track is refused, as `range` is with no range.
  - `isTrackSelected` answers from the selection, so the first track can be selected.
- **Removing a track is a split store action.** Given a track, it deletes the split at its start and the split at its end, whichever exist; it is refused for the only track.
  - Names: the removed track's name always goes. In the middle and at the end, the merged track starts at the previous track's start split, which keeps its name with no work. Removing the first track deletes its end split, whose name belonged to the next track: that name moves to the file's start (the first track's name), and the rename edit for the file's start follows whether the first track is now named.
  - Edits: each deleted split counts as deleting a split does today (a detected split adds a deleted edit, an added split takes its added edit back, its moved and renamed edits go).
  - Selection: if the selected track was the removed one, or its start split was deleted, the selection becomes the merged track (keyed by the previous track's start split, or none). A selected split that was deleted falls back as `deleteSplit` does today. Otherwise the selection stays.
  - `deleteSplit` gains the same rule for a selected track whose start split it deletes.
- **One player plays a stretch.** The player store's range playback generalises to a stretch: the range, or the selected track. The two share play/pause, the resting playhead, seek, back-to-start, grab and drop, the end returning the playhead to the start, and the press-number rule. The Track view and the Range view read the same state with a different stretch.
  - Starting the stretch for a track releases a held range WAV and the other way round; the split audition and stretch playback still stop each other.
  - Playback stops and the held audio is released when the selected track's start or end changes, when the selection changes, on a new range, on a view switch, on the export and on unmount.
- **A long track plays through a moving 10 min window.** At most 10 min of WAV is decoded at a time, the limit note 08 set.
  - A track of 10 min or less is one window, decoded once and kept, exactly like a range today.
  - A longer track decodes the window that starts at the playhead and runs 10 min, or to the track's end. A seek inside the held window sets `currentTime`; a seek outside it decodes a new window from the seek point.
  - While a window plays, the next one is decoded ahead when the playhead is 30 s from its end, so the hand-over is not a decode wait. At most two windows are held, about 210 MB at worst for `.opus`.
  - Which window to decode for a stretch and a playhead, and when to fetch the next, is a pure helper beside the range helpers in the split-zoom widget.
- **The Track view is a third view of the zoom panel**, in the split-zoom widget beside the zoom view and the Range view, sharing the Range view's canvas helpers (axis, merged bars, lands, split lines, playhead frames).
  - It draws the track's bars, its gaps and its two end splits at the edges, and the 1 px playhead, every animation frame while playing.
  - A press anywhere moves the playhead (a press near the playhead drags it). A press near an end split does not select it.
  - It is a focusable slider on the playhead: Left/Right 1 s, Shift 10 s, Space play/pause (auto-repeat ignored), Home to the start. Delete and Backspace do nothing.
  - The failure line is the Range view's.
- **The review page** swaps three views on the store's view. Title rows:
  - Split: the control, "Add split", "Delete split" (new), "Play across split".
  - Track: the control, "Back to track start", Play/Pause.
  - Range: as today.
  - The panel title in the Track view is `name · start – end` with hundredths, from a pure title function like the range title.
- **The `Split | Track | Range` control** is the existing two-option control widened to three options.
- **The whole-file view** outlines the selected track's stretch while the view is `track`, drawn like the zoom outline; the zoom outline stays drawn only in `split`. Its click and range drag are unchanged.
- **The track strip** lays out a split item between every two blocks. The block layout reserves the split items' widths and gives every block a minimum clickable width; the rest is shared in proportion, as now.
  - Every block, the first included, is a button that selects its track.
  - A split item is an 8 px button with an accessible name naming the split and its time, marked current when selected. Splits are vermilion (DESIGN.md: one vermilion marks splits); the item is drawn as land at rest and vermilion when hovered, focused or selected.
- **The Track list** renders track rows and split rows in time order.
  - A track row: number button, name field, start, length, and a merge-icon button that removes the track (absent when it is the only track). Row click, number button and name field focus select the track.
  - A split row: `Split N`, its time in hundredths in the Start column, an empty Length, a trash button that deletes the split. Row click selects the split.
  - Both buttons stop the row's click. The marked row is whichever matches the selection, and it is scrolled into view on every selection change.
- No change to detection, the loudness view, the range, the mark, the audition's 8 s, the export or the supported formats.

## Testing Decisions

- A good test drives a module through its public interface and checks what a user or a caller sees: store state after an action, the clip calls sent, a component's ARIA and the store actions it calls. It never reaches into private variables or canvas pixels. Canvas drawing stays untested beyond its pure helpers, as today.
- **Split store** (prior art: the split store spec) is the main seam for the rules:
  - the selection: selecting a track clears a selected split and the other way round; the first track is selectable; the selected track follows a moved split; `isTrackSelected`;
  - the view: `track` on selecting a track, refused with none, `split` on selecting a split or moving the window;
  - removing a track: middle, first, last, refused for the only one; which splits go; which name survives, including the name moved to the file's start; the edit count for detected and added splits; renamed edits dropped;
  - the selection after a change: the merged track after deleting the selected track's start or end split or removing it; untouched when something else changes; a detection clearing the track and selecting the first split.
- **Player store** (prior art: the audition store spec, with the source-file store's clip stubbed and a fake `Audio` element):
  - playing a track of 10 min or less: one clip, pause and resume without a second call;
  - a long track: the first window from the playhead; a seek inside the window with no clip call; a seek outside it decoding a new window; the next window fetched ahead and played on at the boundary; at most two held;
  - the track's end returning the playhead to its start;
  - stopping and releasing when the selected track's ends change, the selection changes, a new range is made, the view switches, the export starts;
  - range playback and the split audition still passing their existing specs.
- **Window helper** (prior art: the range window and range title specs): the window for a stretch and a playhead, held to the stretch's end; when the next window is due; a stretch of 10 min or less as one window.
- **Track title helper** (prior art: the range title spec).
- **Block layout** (prior art: the block layout spec): split items' widths reserved, the minimum block width, proportions of the rest.
- **Components** (prior art: the Track list, track strip, Range view, split zoom and review page specs):
  - Track list: rows in time order; split rows without a name field; each row's click and button calling the right store action; the remove button absent for the only track; the marked row for a selected split and a selected track; the accessible names of both buttons;
  - track strip: every block a button, the first included; split items between blocks, their names and current state; clicks calling select track and select split;
  - Track view: its keyboard (Left/Right/Shift, Space without auto-repeat, Home, Delete doing nothing) and slider ARIA;
  - review page: the three views swapped on the store's view; each title row's buttons and their enabled states; the control's disabled segments; "Delete split" calling the store.
- No new e2e spec: the export does not change. The flow is checked by hand in Chrome with the `playwright-cli` skill in all three supported formats, including a track over 10 min late in the 3 h MP3, listening across a window boundary and measuring any gap.

## Out of Scope

- Excluding a track from the export while keeping its splits.
- Moving a split anywhere but the zoom view (not in the strip, the whole-file view, the Track view or the Range view).
- Adding a split in the Track view.
- Selecting a split from the Track view's end lines.
- Undo for deleting a split or removing a track.
- Selecting several tracks or splits at once.
- Clicking the whole-file view to select a track.
- Looping, playback speed, volume, or scrubbing audio while dragging the playhead.
- Lifting the 10 min limit on a range.
- A new e2e spec.

## Further Notes

- **Glossary changes**, already in `GLOSSARY.md`:
  - **Selected track**: the one track the user is reviewing, heard end to end whatever its length; its ends are its splits, so it follows them; no split is added inside it; a split and a track are never selected at the same time. _Avoid_: track range, current track, active track.
  - **Track view**: the zoom panel's view of the selected track, stretched across the whole panel with its gaps and its two end splits, to listen to. _Avoid_: track panel, track range view.
  - **Removing a track**: merging a track into its neighbours by deleting the splits at both its ends; its name goes with it, the merged track keeping the previous track's name, or the next track's when the first track is removed. _Avoid_: deleting a track, excluding a track.
  - **Range view**: its control is now `Split | Track | Range`.
- **Decided while writing this spec**, not in the grilling: the Track view's keyboard steps (1 s, Shift 10 s), a press near an end split moving the playhead rather than selecting the split, the next window fetched 30 s ahead with at most two held, and the strip's split items in vermilion rather than `on-track` (DESIGN.md reserves vermilion for splits; `on-track` is the colour of a track block's name and ring).
- **Docs to update with the work** (the `finish-feature` skill): note 08 gains the moving window and its measured hand-over, `docs/architecture.md`, the milestones doc gains Milestone 9, DESIGN.md gains the strip's split item, and `CHANGELOG.md` gains its lines under Unreleased. No slice is added, so AGENTS.md's code layout stays as it is.
