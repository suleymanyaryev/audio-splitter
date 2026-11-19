# 02: The player plays a stretch

**What to build:** a prefactor with no visible change. The player store's range playback becomes playback of a **stretch** (a start and an end): play/pause, the resting playhead, seek, back to start, grab and drop of the playhead, and the end returning the playhead to the start all take the stretch rather than reading the range directly. The range is the only stretch for now; ticket 04 adds the selected track. The press-number rule, the held WAV and the split audition are unchanged.

**Blocked by:** None (can start immediately)

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (Implementation Decisions: one player plays a stretch)

- [ ] Range playback goes through the stretch; the Range view, its title row and its keyboard behave exactly as today.
- [ ] The held WAV is tied to the stretch it was decoded for, so a different stretch releases it and decodes again.
- [ ] The audition store spec and the Range view spec pass unchanged in what they assert.
- [ ] No CHANGELOG line: nothing a user sees changes.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which concept note or spec decision each part rests on.
