# 07: Split rows in the Track list, and "Delete split"

**What to build:** the Track list shows a split row between every two track rows, in time order: `Split N` in the Name column, its time in hundredths in Start, an empty Length and a trash button labelled "Delete split at …" that deletes it and merges the tracks either side. Clicking a split row selects that split. The trash button leaves the track rows. The marked, scrolled-into-view row follows the selection, whichever kind it is. The zoom view's title row gets a visible "Delete split" button beside "Add split" and "Play across split"; Delete and Backspace on the split handle keep working. Deleting the selected track's start split selects the merged track; deleting its end split leaves it selected, now longer.

**Blocked by:** 03 (Select a track and see it in the Track view)

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (stories 37–46, 49, 50, 58, 60, 63)

- [ ] Split rows have no name field; their button stops the row's click, so deleting does not select.
- [ ] `deleteSplit` re-keys a selected track whose start split it deletes to the merged track (the previous track's start split, or none); a deleted selected split falls back to its neighbour as today; any other selection stays.
- [ ] "Delete split" in the zoom view deletes the selected split and is disabled with none.
- [ ] Specs: the split store's selection after a delete; the Track list's row order, split rows, their clicks and button names, the marked row for both kinds; the review page's "Delete split".
- [ ] CHANGELOG line under Unreleased; `docs/architecture.md` follows.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or spec decision each part rests on.
