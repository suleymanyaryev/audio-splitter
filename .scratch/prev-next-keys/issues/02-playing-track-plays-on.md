# 02: A playing track plays on into the next one

**What to build:** When the selected track is playing, or still being decoded, `]` or `[` in the Track view plays the new track from its start. A paused or stopped track leaves the new track resting at its start, with the playhead there. The player already stops the old sound and drops its resting place when the selected track changes; the Track view's key handler reads whether the sound was on before the step and, if the selection changed, plays the new track's whole extent. Spec: `.scratch/prev-next-keys/spec.md`.

**Blocked by:** 01 (Step between tracks in the Track view)

**Status:** ready-for-agent

- [ ] Playing or loading before the step: the new track's extent is played.
- [ ] Paused or idle before the step: nothing plays, and the new track rests at its start.
- [ ] At the first or last track, the sound that is on carries on untouched.
- [ ] When the step opens the discard question, nothing plays, and after any answer the new track rests.
- [ ] The audition store does not change.
- [ ] Cases in the Review page spec, setting the player's status and spying on its play action, as the existing playback cases do.
