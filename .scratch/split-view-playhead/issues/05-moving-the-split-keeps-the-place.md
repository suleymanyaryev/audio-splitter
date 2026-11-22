# 05: Moving the split keeps the place

**What to build:** Moving the selected split, by key or by drag, pauses a playing audition instead of ending it, and the playhead keeps its time in the file. Space then decodes the moved 8 s and resumes from that time. Selecting another split, deselecting or deleting still end the audition and reset the playhead. Going to the Track or Range view and back, with the same split still selected, keeps the playhead where it was (spec: user stories 31–38, 47).

- The resting place is a time in the file tied to the split, not to the extent. A move of the same split keeps it, held into the new extent when the 8 s moved past it.
- A move releases the held WAV, since the extent changed. The resume decodes again, with the button reading "Stop" meanwhile.
- Playing a range or track after the audition releases the audition's WAV, but its place survives.
- A clip still decoding when the split moves never starts sound.

Example: the split is at 100.00 s, so the audition is 96–104 s. Pause at 99.50 s and press Right ×5: the split is at 100.05 s, the audition 96.05–104.05 s, and Space resumes at 99.50 s.

**Blocked by:** 02 (Pause and resume the audition).

**Status:** ready-for-agent

- [ ] Moving the split by key or drag pauses a playing audition and keeps the playhead's file time
- [ ] The kept time is held into the new extent when needed
- [ ] The next play decodes the moved 8 s and starts at the kept time
- [ ] Selecting another split, deselecting and deleting reset the playhead to the new audition's start
- [ ] A trip to another view and back, same split selected, keeps the place
- [ ] Playing a range or track and coming back keeps the place
- [ ] Audition store spec covers the above (with the Split view spec for a move by key)
- [ ] `docs/architecture.md` says what ends the audition and what pauses it; `CHANGELOG.md` line updated
