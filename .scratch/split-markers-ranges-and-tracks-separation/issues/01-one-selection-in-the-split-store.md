# 01: One selection in the split store

**What to build:** a prefactor with no visible change. The split store's selected split id gives way to one selection value: a split (by id), a track (by the id of the split where it starts, or none for the first track), or nothing. The selected split and its index are derived from it, and every consumer that read the selected split id (the strip, the Track list's scroll-into-view, the zoom view, the whole-file view, the player's watch that stops the audition) reads the derived values instead. Nothing can select a track yet; that is ticket 03.

**Blocked by:** None (can start immediately)

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (Implementation Decisions: one selection in the split store)

- [ ] The split store holds one selection value; the selected split and its index are derived from it; the selected split id is no longer stored on its own.
- [ ] Selecting a split, a track's start split, moving the zoom window, deleting the selected split, a detection and `reset` behave exactly as today.
- [ ] Every existing spec passes unchanged in what it asserts (only the way it reads the selection may change).
- [ ] No CHANGELOG line: nothing a user sees changes.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or spec decision each part rests on.
