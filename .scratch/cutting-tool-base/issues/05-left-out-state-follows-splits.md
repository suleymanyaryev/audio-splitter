# 05: Left-out state follows the splits

**What to build:** editing splits never quietly changes what the export skips. Cutting a left-out track makes two left-out tracks, however the split is added. A merge keeps the earlier track's state, as names do, and removing a track leaves its neighbours' states as they were.

**Blocked by:** 01 (Gaps on request), 04 (Leaving a track out)

**Status:** ready-for-agent

Spec: `.scratch/cutting-tool-base/spec.md` (stories 23 and 52–55; Implementation Decisions, "Split slice", inheritance).

- [ ] A split added inside a left-out track makes both tracks left out, through every insert:
  - Add split
  - at the mark
  - at the playhead
  - applied pending splits
  - Find gaps
- [ ] Merges and moves:
  - Deleting the split between two tracks gives the merged track the earlier track's state.
  - Moving a split keeps its track's state.
- [ ] Removing tracks:
  - Removing a middle track leaves both neighbours' states as they were.
  - Removing the first track moves the next track's state to the file's start, beside its name.
- [ ] The edit count stays right across these: an inherited state is no new edit.
