# 02: A playing track plays on into the next one

**What to build:** When the selected track is playing, or still being decoded, `]` or `[` in the Track view plays the new track from its start. A paused or stopped track leaves the new track resting at its start, with the playhead there. The player already stops the old sound and drops its resting place when the selected track changes; the Track view's key handler reads whether the sound was on before the step and, if the selection changed, plays the new track's whole extent. Spec: `.scratch/prev-next-keys/spec.md`.

**Blocked by:** 01 (Step between tracks in the Track view)

**Status:** resolved

- [x] Playing or loading before the step: the new track's extent is played.
- [x] Paused or idle before the step: nothing plays, and the new track rests at its start.
- [x] At the first or last track, the sound that is on carries on untouched.
- [x] When the step opens the discard question, nothing plays, and after any answer the new track rests.
- [x] The audition store does not change.
- [x] Cases in the Review page spec, setting the player's status and spying on its play action, as the existing playback cases do.

## Comments

- The handler in `TrackView.vue` reads `stretchStatus` (playing or loading) before the step, because the player's sync watch on the selected track lets go of the old sound during it. If the step changed the selection and the sound was on, it calls `audition.toggleStretch` with the new extent: the watch has left the player idle, so that call plays from the new track's start. `playStretch` is not exported and the audition store is unchanged.
- After the discard question nothing is carried. The step is held, so the key reports "not acted" and nothing plays; the dialog's answer selects the track later, from the page, and the player's watch leaves it resting. The specs check `stretchStatus` is `idle` after Apply first and Discard, and still `playing` while the question is open and after Cancel.
- CHANGELOG: ticket 01's single Unreleased line is replaced, not added to, so it also says a playing or decoding track carries on with the new track from its start and a paused or stopped one rests at its start.
