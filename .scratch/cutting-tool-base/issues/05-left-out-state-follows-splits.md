# 05: Left-out state follows the splits

**What to build:** editing splits never quietly changes what the export skips. Cutting a left-out track makes two left-out tracks, however the split is added. A merge keeps the earlier track's state, as names do, and removing a track leaves its neighbours' states as they were.

**Blocked by:** 01 (Gaps on request), 04 (Leaving a track out)

**Status:** resolved

Spec: `.scratch/cutting-tool-base/spec.md` (stories 23 and 52–55; Implementation Decisions, "Split slice", inheritance).

- [x] A split added inside a left-out track makes both tracks left out, through every insert:
  - Add split
  - at the mark
  - at the playhead
  - applied pending splits
  - Find gaps
- [x] Merges and moves:
  - Deleting the split between two tracks gives the merged track the earlier track's state.
  - Moving a split keeps its track's state.
- [x] Removing tracks:
  - Removing a middle track leaves both neighbours' states as they were.
  - Removing the first track moves the next track's state to the file's start, beside its name.
- [x] The edit count stays right across these: an inherited state is no new edit.

## Comments

- Every insert goes through `insertSplit`, which takes the inclusion of the track it cuts (the split before it, or the file's start), so Add split, the mark, the playhead, applied pending splits and Find gaps all inherit it with no extra code in each.
- Reading of "removing a track leaves its neighbours' states as they were": "Remove track" deletes the splits at both its ends, so the track and its two neighbours become one track, as it does today. That track keeps the earlier track's state, as names do, and tracks after it are untouched. The first track's removal moves the next track's state, and its left-out edit, to the file's start. The spec's wording could also be read as keeping both neighbours separate, which would change what "Remove track" does; this keeps today's merge and the glossary's rule.
