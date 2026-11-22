# 05: Moving the split keeps the place

**What to build:** Moving the selected split, by key or by drag, pauses a playing audition instead of ending it, and the playhead keeps its time in the file. Space then decodes the moved 8 s and resumes from that time. Selecting another split, deselecting or deleting still end the audition and reset the playhead. Going to the Track or Range view and back, with the same split still selected, keeps the playhead where it was (spec: user stories 31–38, 47).

- The resting place is a time in the file tied to the split, not to the extent. A move of the same split keeps it, held into the new extent when the 8 s moved past it.
- A move releases the held WAV, since the extent changed. The resume decodes again, with the button reading "Stop" meanwhile.
- Playing a range or track after the audition releases the audition's WAV, but its place survives.
- A clip still decoding when the split moves never starts sound.

Example: the split is at 100.00 s, so the audition is 96–104 s. Pause at 99.50 s and press Right ×5: the split is at 100.05 s, the audition 96.05–104.05 s, and Space resumes at 99.50 s.

**Blocked by:** 02 (Pause and resume the audition).

**Status:** resolved

- [x] Moving the split by key or drag pauses a playing audition and keeps the playhead's file time
- [x] The kept time is held into the new extent when needed
- [x] The next play decodes the moved 8 s and starts at the kept time
- [x] Selecting another split, deselecting and deleting reset the playhead to the new audition's start
- [x] A trip to another view and back, same split selected, keeps the place
- [x] Playing a range or track and coming back keeps the place
- [x] Audition store spec covers the above (with the Split view spec for a move by key)
- [x] `docs/architecture.md` says what ends the audition and what pauses it; `CHANGELOG.md` line updated

## Comments

- A move of the same split pauses a playing audition and leaves a paused one paused, and either lets go of its WAV. A press still decoding is taken back (idle), so a late clip is dropped by the press number. `playAudition` plays at once only while a WAV is held, and otherwise decodes ("Stop" meanwhile).
- The Track view can't be a trip "with the same split selected", since showing a track selects the track. The view-trip test uses the Range view.
- The place is stored raw and held into the extent when read, so moving the split back restores it. A place held to the extent's end edge plays from the extent's start, as the stretch does for a playhead at its end.
- A drag-move of the split takes the same store path as a key move, so it has no spec of its own beyond the split-drag-during-grab case.
- Code-review fixes: a header comment re-wrapped, the architecture bullets folded into one rule each, the changelog line reworded to what the user notices.
- Checks: `pnpm test` -> pass (1780, before the doc fixes); after them `pnpm test:changed -> pass`, `pnpm lint:changed -> pass`, `pnpm typecheck -> pass`.
