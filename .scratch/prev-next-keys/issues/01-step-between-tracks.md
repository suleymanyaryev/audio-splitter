# 01: Step between tracks in the Track view

**What to build:** In the Track view, `]` selects the next track and `[` the previous one, with the same selection a click on a track-list row makes. The track list, the track strip, the whole-file view, the zoom panel's title and the Track view all follow. The new track always rests at its start; carrying sound over is ticket 02. The keys are matched by their physical codes (`BracketLeft`, `BracketRight`), not by the character they type, so they work without a modifier on layouts where `[` needs AltGr or Option. A code comment says why. Spec: `.scratch/prev-next-keys/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `]` selects the next track and `[` the previous one; the track-list row is marked, and the zoom title names the new track.
- [x] The split store has `selectAdjacentTrack(step)`, which goes through the existing track selection and returns whether the selection changed at once.
- [x] `[` on the first track and `]` on the last change nothing, raise no error, and are not taken: the key's default is not prevented and the "Saved … in …" line stays.
- [x] Leaving a track with pending splits opens the discard question; "Apply first" and "Discard" then select the track stepped to, and cancelling stays on the old track with its pending splits.
- [x] The old track's mark and selected pending split go, as on a click.
- [x] A press with Shift, a repeat, a press in a track name, a press while a dialog is open and a press in the Range view do nothing.
- [x] The shortcuts dialog's Track view section lists `[ / ]`: "Select the previous or next track; a playing track plays the new one from its start".
- [x] `CHANGELOG.md` has a line under `## [Unreleased]` for the new keys.
- [x] Cases in the Review page spec, dispatching `keydown` with a `code` on the document.

## Comments

- A held key (`repeat`) returns "not acted" rather than "acted" as Space does: the first press already did the step and cleared the "Saved" line, and a repeat that did nothing should not claim the key. The browser does nothing with these keys either way.
- `selectAdjacentTrack` reports success by checking that the selected track is now the neighbour, so it is false at an edge, with no track selected, and when the discard question opened (or was already open) instead.
- The old track's selected pending split cannot be seen going on a bare step: a selected pending split means pending splits, so a step opens the discard question first. The specs check that Apply first and Discard leave none selected, and that the mark goes on a plain step.
- The "Saved" line staying at an edge is a case in the saved-line describe, which owns the folder fake.
- Playing carry-over is ticket 02, so the dialog row already says what ticket 02 will do, as ticket 01 asks.
