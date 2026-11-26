# 04: The player owns every stop rule

**What to build:** the stop on a view change moves from the page into the player as a sync watcher, like the others. Each stop watcher then resets only its own subject:

| Change                          | What it does                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| The view                        | pauses a playing stretch and keeps its place and WAV; takes back a decode; lets go of the audition's WAV and keeps its place; clears the failure |
| The selected split's id         | ends the audition and clears its place                                                                                                           |
| The selected split's time       | pauses a playing audition and lets go of its WAV; takes back a decode                                                                            |
| The range, or none              | ends the range and clears its place                                                                                                              |
| The selected track, or its ends | ends the track and clears its place                                                                                                              |

A watcher stops the sound only when its subject owns it, and clears a place only when the place is its subject's. The track watcher's `view !== 'range'` check goes. Sound under another subject is already stopped by the view change, since a new range, a split selection and a track selection each switch the view.

**Blocked by:** 03.

Status: open

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: stop watchers).

- [ ] The page has no watcher on the view; the player has one, sync.
- [ ] The range watcher and the track watcher no longer let go of the audition.
- [ ] The track watcher has no view check; a split added at the Range view's mark that shortens the selected track still leaves the range playing.
- [ ] Selecting a split no longer reaches the audition through the track watcher.
- [ ] The player spec has the view-change stop cases (moved from the page spec), and one case per watcher showing it leaves another subject's sound alone.
- [ ] Every other spec passes unchanged.
- [ ] `docs/architecture.md`'s Player section lists the view change among the player's watchers.
- [ ] No changelog line.
