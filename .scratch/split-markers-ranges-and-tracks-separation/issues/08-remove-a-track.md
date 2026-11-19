# 08: Remove a track

**What to build:** each track row gets a merge-icon button labelled "Remove track N" (none when there is only one track). **Removing a track** deletes the splits at both its ends, so the previous track, it and the next become one; the first track merges into the next and the last into the previous. The removed track's name goes with it: the merged track keeps the previous track's name, or the next track's when the first track is removed. There is no confirmation. If the removed track was selected, the merged track becomes the selected one; any other selection stays.

**Blocked by:** 07 (Split rows in the Track list, and "Delete split")

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (stories 47–49, 51–57, 59, 60)

- [ ] A split store action removes a track: deletes its start and end splits, whichever exist; refused for the only track.
- [ ] Removing the first track moves the next track's name to the file's start, and the rename edit for the file's start follows whether the first track is now named.
- [ ] Edits count each deleted split as `deleteSplit` does (a detected split adds a deleted edit, an added split takes its added edit back, its moved and renamed edits go).
- [ ] The selection becomes the merged track when the removed track was selected; a selected split that was deleted falls back as `deleteSplit` does.
- [ ] The button stops the row's click and looks unlike the split row's trash.
- [ ] Specs: the split store's removal (middle, first, last, only), names, edit counts and selection; the Track list's remove button, its name and absence for the only track.
- [ ] CHANGELOG line under Unreleased; `docs/architecture.md` follows.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or spec decision each part rests on.
