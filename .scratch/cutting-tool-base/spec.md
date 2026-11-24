# Cutting-tool base: gaps on request, default settings and left-out tracks

Status: resolved

From GitHub issue #11, milestone 1 of the [v2 milestones](../audio-splitter-v2/milestones.md#milestone-1-cutting-tool-base). Vocabulary is in the glossary. While this was grilled, **Left-out track** and **Default settings** were added, and **Track**, **Track name**, **Export**, **Split** and **Edit** changed. No ADR: each decision is cheap to reverse, and the glossary says what would otherwise surprise.

## Problem Statement

I want to use the app as a general cutting tool: load any audio, place splits by hand and export only the pieces I choose. Splitting a long file into its tracks is still one of my uses, but not the only one.

Today the app decides too much for that:

- Every source file arrives with splits I did not ask for.
- Moving the silence threshold or the minimum gap length throws away every split and name I made, after a question.
- The two settings always start at 18 dB under the median and 2 s, however often I set them to something else.
- The export always writes every track. I can only drop a piece by merging it into its neighbours, which puts its sound into theirs.

## Solution

- **Opening a file.** A source file opens as one track with no splits, on track 1 in the Track view.
- **Previewing gaps.** The gaps for the default settings show at once on every view. Moving either setting changes the gaps shown and no split.
- **Find gaps.** A button adds a split in each shown gap that has none yet. It shows how many it would add, and leaves every other split, name and left-out track alone.
- **Clear splits.** A button starts over, asking first when it would throw edits away.
- **Default settings.** Two small actions beside the sliders save the current values as my default settings, or restore the built-in ones. Every later source file starts from them, also after a reload. The threshold is saved as a distance under the median, so it suits files of any loudness.
- **Leaving a track out.** I can leave any track out, from its row in the track list or with `X` in the Track view, and bring it back the same way. A left-out track stays in the list and the strip, looks different, and can still be heard and exported alone. "Export to folder…" skips it, and numbers the files it writes without holes.

## User Stories

### Opening a file

1. As a user, I want a freshly loaded source file to be one track with no splits, so that the app proposes nothing I did not ask for.
2. As a user, I want the file to open on track 1 in the Track view, so that I can play it and tap pending splits along it straight away.
3. As a user, I want the gaps of the default settings shown on every view as soon as the file opens, so that I can see what Find gaps would do before I press it.
4. As a user, I want the sliders to start at my default settings, so that I don't set them again for every file.
5. As a user, I want the threshold slider to start at my saved distance under this file's median, so that a louder or quieter file still gets a sensible threshold.

### Previewing gaps

6. As a user, I want moving the silence threshold to change only the gaps shown, so that tuning never costs me a split or a name.
7. As a user, I want moving the minimum gap length to change only the gaps shown, for the same reason.
8. As a user, I want dragging the threshold line on the loudness curve to behave like its slider, so that both ways of tuning are equally safe.
9. As a user, I want no "Replace your edits?" question when I move a setting, so that tuning never interrupts me.
10. As a user, I want the gaps on the whole-file view and in the Split, Track and Range views to follow the sliders live, so that I see the effect wherever I am looking.
11. As a user, I want the gaps to stay as they are when I edit splits, so that the preview always reads "what the settings find", not "where my splits are".

### Find gaps

12. As a user, I want a "Find gaps" button in the loudness panel's title row, so that turning gaps into splits is my decision.
13. As a user, I want Find gaps to put a split in the middle of each shown gap that has a track on both sides, so that the splits land as they always have.
14. As a user, I want no split for a lead-in or a run-out gap, so that I never get an empty first or last track.
15. As a user, I want Find gaps to skip a gap that already holds a split, so that my own split there is not doubled.
16. As a user, I want Find gaps to skip a gap whose middle is within 1 s of a split or of the file's ends, so that every track it makes obeys the same 1 s rule as a split I add.
17. As a user, I want Find gaps to leave every existing split, name and left-out track as it is, so that pressing it is never destructive and needs no question.
18. As a user, I want the button to show how many splits it would add ("Find gaps (33)"), updated live as I move the sliders, so that I know what a press will do.
19. As a user, I want the count to be exactly what a press adds, so that the button never says one thing and does another.
20. As a user, I want the button disabled when it would add nothing, for example right after a press, so that a press always does something.
21. As a user, I want Find gaps to leave my selection, the zoom window and the view where they are, so that I keep my place.
22. As a user whose selected track has pending splits, I want Find gaps to ask "Discard N pending splits?" (Apply first, Discard, Cancel) only when one of its splits would land inside the selected track, so that I don't lose pending splits by surprise and am not asked when they are safe.
23. As a user, I want a split that Find gaps adds inside a left-out track to make two left-out tracks, so that finding gaps never puts a left-out piece back into the export.
24. As a user, I want the splits Find gaps adds not to count as edits, so that "New file" does not ask me about work one press can redo.

### Clear splits

25. As a user, I want a "Clear splits" button beside Find gaps, so that I can start over without loading the file again.
26. As a user, I want Clear splits to delete every split and every track name, and to bring every left-out track back, so that the file is one track again, as when it opened.
27. As a user, I want Clear splits to ask first when there are edits or pending splits, and to say how many it would throw away, so that I never lose hand-made work by a stray click.
28. As a user, I want Clear splits to run without a question when there is nothing of mine to lose, so that starting over after a Find gaps is one press.
29. As a user, I want Clear splits to keep the track name prefix, the range and the settings, so that only the splits start over.
30. As a user, I want Clear splits to select track 1 and show the Track view, unless I am in the Range view, so that I land where a new file lands.
31. As a user, I want Clear splits disabled when there are no splits, so that it never does nothing.

### Default settings

32. As a user, I want a "Save as default" action in the loudness panel's title row, so that I save the values I just tuned while looking at the curve.
33. As a user, I want it to save the minimum gap length and the threshold's distance under this file's median, so that the saved threshold carries over to files of other loudness.
34. As a user, I want its tooltip to say what it would save ("Save 18 dB under the median and 2 s as the default"), so that I know the threshold is kept as a distance, not as a level.
35. As a user, I want "Save as default" disabled while the sliders already match my default settings, so that I can tell whether there is anything to save.
36. As a user, I want a "Restore built-in" action that puts my default settings back to 18 dB under the median and 2 s, so that I can undo a bad save.
37. As a user, I want "Restore built-in" to also move this file's sliders to the built-in values, so that what I see matches the default I just chose.
38. As a user, I want "Restore built-in" disabled while my default settings are the built-in ones, so that it never does nothing.
39. As a user, I want my default settings kept across a reload, so that they are mine and not just this visit's.
40. As a user, I want saving or restoring to change no split, so that it is as safe as moving a slider.
41. As a user whose browser blocks storage, I want the app to keep working with the built-in values, and my save to last for this visit, so that a storage problem never stops me.
42. As a user, I want a saved value that is not one the app could have written to be ignored, so that broken storage gives me the built-in values, not a broken slider.
43. As a user, I want a saved threshold that lands outside the slider's range for this file (−60 to 0 dB) to be held to it, so that the slider and the gaps always agree.

### Leaving a track out

44. As a user, I want to leave any track out of the export and bring it back, so that I export only the pieces I want.
45. As a user, I want a button on each track row in the track list, "Leave out track 3" or "Bring back track 3", so that I can do it from where I see all the tracks.
46. As a user, I want `X` in the Track view to leave the selected track out or bring it back, so that I can do it while I listen.
47. As a keyboard user, I want the row button reachable with Tab and named for the track and what it does, so that I can use it without a mouse.
48. As a user, I want a left-out track to look different in the track list and in the track strip, so that I can see at a glance what the export will skip.
49. As a user, I want a left-out track to stay selectable, playable and editable like any other, so that I can listen before I decide.
50. As a user, I want leaving a track out to change no split and no name, so that bringing it back restores it exactly.
51. As a user, I want "Remove track" to work as it does today, merging the track into its neighbours, so that I still have both acts.
52. As a user, I want moving a split to keep the left-out state with the track that starts there, so that the state follows the track as its name does.
53. As a user, I want a split added inside a left-out track to make two left-out tracks, however it is added (Add split, at the mark or the playhead, applied pending splits, Find gaps), so that cutting a left-out piece never puts half of it back.
54. As a user, I want deleting the split between two tracks to give the merged track the earlier track's state, as its name does, so that the rule is the one I already know.
55. As a user, I want removing a track to leave its neighbours' states as they were (the next track's state moves to the file's start when the first track is removed, as its name does), so that removing never changes what else is exported.
56. As a user, I want leaving a track out or bringing it back to count as one edit for that track, and bringing it back to take that edit away again, so that "New file" asks only when something of mine would really be lost.
57. As a user, I want the shortcuts dialog to list `X` in the Track view and the row button in the track list, so that I can find them.

### Export and numbering

58. As a user, I want "Export to folder…" to write no file for a left-out track, so that the folder holds only the pieces I chose.
59. As a user, I want the exported tracks numbered 1 to K among the tracks written, in file names, in padding and in the `N/K` track tag, so that a player shows no holes.
60. As a user, I want an unnamed track's default name in the list and the strip to use the number its file will get, so that the list keeps showing the real file name.
61. As a user, I want a left-out unnamed track's default name to have no number, so that it is clear it gets no file in the export.
62. As a user, I want "Track N" in the list's number column, the Track view's title, the `[` / `]` steps and the screen reader's labels to stay the track's place in the file, so that leaving a track out never renumbers what I am reviewing.
63. As a user, I want "Export to folder…" disabled when every track is left out, so that it never makes an empty folder.
64. As a user, I want "Export track…" to still work on a left-out track, so that I can save a piece alone even when the full export skips it.
65. As a user, I want the name dialog for an unnamed left-out track to propose the prefix and the track's place in the file (`dreamscape-03`), so that I get a sensible name to start from.
66. As a user, I want "Export range…" to work across left-out tracks, so that a range is still just a stretch of the file.
67. As a user, I want an export summary that counts the tracks written, so that it matches the files in the folder.

### New file

68. As a user, I want "New file" to ask first only when there are edits or pending splits, so that a file with only Find gaps' splits is let go at once.

## Implementation Decisions

### Split slice

- **Opening.** The store's per-file entry point opens the file and finds no splits. It does the following:
  - keeps the loudness curve and its timing
  - sets the two settings from the default settings, with the threshold rounded to the slider's 0.1 dB step and held to −60…0 dB
  - computes the gaps
  - selects the first track and shows the Track view
- **Settings.** The two setters recompute the gaps only. Splits, names, left-out states, edits, pending splits and the selection are untouched.
- **Gaps against splits.** The gaps stay separate state from the splits, as today. Every view already draws the gaps from it.
- **The Find gaps count.** A derived list holds the times Find gaps would add. It walks the inner gaps in time order and takes each one's middle when both are true:
  - the gap holds no split (no split's time inside the gap)
  - the middle has room against the splits and against the middles already taken (1 s from each, and from the file's ends)
    The button's count is this list's length.
- **Running Find gaps.** It inserts those times as detected splits. A detected split is not an edit, but a later move or delete of it is, as detected splits are counted today. Inserting goes through the discard-question path whenever a time falls inside the selected track while there are pending splits. The room is checked again when the held action runs.
- **Clear splits.** It removes every split, the first track's name and every left-out state, and clears the edits and pending splits. It selects the first track and shows the Track view unless the Range view is on show. It keeps the prefix, the range and the settings.
- **Confirming Clear splits.** Today's "replace edits" guard and its dialog become the Clear splits confirmation. It asks when there are edits or pending splits, with the same loss wording.
- **The left-out state** lives beside the name: on the split where the track starts, and in a file-start value for the first track. It is stored as a reason, not a boolean: `included`, or left out `by-hand`. Milestone 2 adds left out as a duplicate, so this needs no migration then.
- **Inheritance.** Every insert of a split takes the state of the track it cuts. A deleted split takes its state with it. So a merged track keeps the earlier track's state, as names do.
- **Removing the first track.** The next track's state moves to the file's start, beside its name.
- **Leaving out as an edit.** It is counted per track, keyed like a rename: by the start split, or the file's start. Going back to included takes the edit away.
- **Track fields.** Each track keeps its `number` (its place in the file) and gains:
  - whether it is left out
  - its export number, 1…K among the tracks that are not left out, or none
    The default shown name uses the export number padded to K. A left-out track's default name is the bare prefix.
- **Edits redefined.** The edit count is now "since the source file opened". A detection no longer clears it. Clear splits does, because nothing is left to lose.

### Default settings

- **Who owns them.** The split slice reads and saves them in `localStorage`, under one key with a versioned shape: `{ version: 1, offsetDb, minimumGapSeconds }`. The pattern is the saved play speed: validate on read, swallow storage errors, and fall back to the built-in 18 dB and 2 s.
- **What counts as valid.** A value counts only when it is on the 0.1 grid. The minimum gap length must also be inside its slider's range (0.2…5 s). A saved offset is held to the threshold slider's range when it is applied to a file.
- **Saving** stores `median − current threshold` (rounded to 0.1) and the current minimum gap length.
- **Restoring built-in** stores the built-in values (or removes the key) and sets this file's two settings to them, which recomputes the gaps.
- **Which button is enabled.** The store exposes whether the current values equal the default settings, which drives "Save as default". It also exposes whether the default settings are the built-in ones, which drives "Restore built-in".
- **The built-in values** stay where they are, beside the note that calibrated them.

### Loudness-curve widget

- **Title row.** The settings row gains Find gaps (with the count), Clear splits, Save as default and Restore built-in.
- **Kit and tooltips.** The four actions use the existing kit. The tooltips say what each does, and Save as default's tooltip names the values.
- **Dragging the threshold line** calls the setter directly, with no guard.
- **What is removed.** The replace guard composable and its spec go. The confirm dialog is reworded for Clear splits.

### Track list, track strip and review page

- **Track list.** Track rows gain the leave-out button beside the merge button, with a label for each state. A left-out row is shown muted.
- **Track strip.** A left-out block is drawn differently and stays a button that selects its track.
- **Open for the browser.** The exact look of both is settled in the browser during the build. The kit is extended only through `DESIGN.md`.
- **The `X` key** belongs to the Track view, under the keys-on-show rule (ADR 0002). It toggles the selected track.
- **Shortcuts dialog.** It gains a Track view row for `X` and a Track list row for the button.
- **The review page** calls the new opening entry point instead of the detection.

### Export

- **The full export** plans only the tracks that are not left out. It numbers them 1…K for file names, padding and tags. It refuses to start with none planned, and its button is disabled then.
- **The single export** of a left-out unnamed track proposes the prefix and the track's place in the file. Any other track proposes its shown name, as today.
- **Range exports** are unchanged.

### Docs that this changes

- **`CHANGELOG.md`:** Changed (no splits on load, settings only preview, the edit count) and Added (Find gaps, Clear splits, default settings, leaving a track out).
- **Release:** 2.0.0.
- **`docs/architecture.md`:** the review page's opening call and the flow it starts.
- **`README.md`:**
  - "What it does" changes for the new steps.
  - The "Not in v1" order line is updated, because this milestone comes before help for playlists that repeat.
- **Concept note 04:** the "tune first, edit after" paragraph now describes the preview and Find gaps.

## Testing Decisions

- **What a good test does.** It drives the public surface of a store or a mounted component and checks what the user would see or get: tracks, gaps, counts, names, written files, dialogs. It never checks internal sets, refs or call order.
- **The split store (main seam)**, extending the existing split store spec:
  - **Opening:** one track, the gaps from the default settings, track 1 in the Track view.
  - **The setters:** they change gaps and nothing else.
  - **The Find gaps count:**
    - a gap holding a split is skipped
    - the 1 s room against splits, the file's ends and other middles
    - edge gaps are skipped
    - the count equals what a press adds
  - **Find gaps:**
    - the selection, the window and the view stay
    - the discard question opens only for a split inside the selected track
    - its splits are not edits, and moving one is
  - **Clear splits:** what it clears, and what it keeps.
  - **Left-out state:**
    - toggling it, and the edit going back on return
    - inheritance on every kind of insert
    - merge on a delete
    - removing the first track and a middle track
    - moving a split
  - **Numbering:** the export numbers and default names with left-out tracks, and the position kept.
  - **Default settings:**
    - save and read back
    - a fresh store sees what an earlier one saved
    - restore built-in
    - invalid or blocked storage
    - offset clamping
- **The export stores (second seam).**
  - **The full export spec, with the existing fake folder:**
    - no file for a left-out track
    - renumbered names and `N/K` tags
    - refused with every track left out
  - **The single export spec:** the proposed name for a left-out unnamed track.
- **Thin UI wiring at the existing component specs:**
  - **Loudness settings:**
    - the four actions, their enabled states and the Find gaps count
    - the Clear splits question appears only when there is something to lose
  - **Track list:** the row button's labels, and the muted row.
  - **Review page:** no splits on mount, and `X` in the Track view.
  - **App:** "New file" asks after a hand edit and not after Find gaps alone.
  - **Shortcuts dialog:** its existing spec covers the new rows.
- **No e2e spec is planned.** The new flows are covered at the store and component seams. The export spec's real-browser flow is unchanged.
- **Prior art:**
  - the existing split store spec
  - the export-tracks spec and its fake folder
  - the saved play speed's read and save handling
  - the replace-guard and loudness-settings specs, for the dialog wiring that moves to Clear splits

## Out of Scope

| Item                                                      | Why                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Minimum track length as a third setting                   | Not asked for. At the defaults the shortest track on both samples is 93 s, and a short track can be left out. |
| Remembering the export folder across files                | Chrome's picker already reopens where the user last chose.                                                    |
| A settings page                                           | Two values are saved from where they are tuned.                                                               |
| Find gaps limited to the range                            | Add only, with the live preview, covers the need.                                                             |
| Duplicate marks and the third left-out reason             | Milestone 2.                                                                                                  |
| Keeping splits, names and left-out tracks across a reload | Milestone 5.                                                                                                  |
| Undo                                                      | Clear splits asks, and leaving a track out is reversible by design.                                           |

## Further Notes

- **No concept note.** This milestone teaches no audio idea, so it adds none. The project's loop still ends with the build shown in the browser and a stop for the user's confirmation. That is also where the look of a left-out track is settled.
- **Why the threshold is saved as a distance.** It was checked on `samples/sample1.m4a` at a level 3 dB louder than the app's analysis. 18 dB under the median still finds the same 33 splits. A fixed −34.7 dB finds 30 and misses the boundary at 8:36, leaving a 194 s track.
