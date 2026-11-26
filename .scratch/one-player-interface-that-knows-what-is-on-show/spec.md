# One player interface that knows what is on show

Status: ready-for-agent

Candidate 3 of the [architecture review](../code-cleanup-and-readability/architecture-review.md#3-one-player-interface-that-knows-what-is-on-show). The grilling settled every decision below. It sharpened **Playhead** in the glossary: each view keeps its own. No ADR: every decision is cheap to reverse, and ADR 0004 (one element, `playbackRate`) is kept.

## Problem Statement

The one player plays three things: the audition across the selected split, the range and the selected track. Its interface says each verb twice, once for the audition and once for "a stretch": toggle, seek, back to start, grab and drop the playhead, the playhead reader and the status. Pause, seek and drag came to the audition after the stretch had them, so the two halves grew as mirrored pairs.

Callers pass in a stretch the player could work out itself. The page, the Track view and the Range view each decide which stretch is on show, though the player already reads the view, the range and the selected track from the split store. The page keeps two label tables and two near-identical play-button blocks.

Inside, two state machines share one `<audio>` element. The rule "at most one of them is not idle" is kept by hand at four sites, and the press number is bumped directly at five. The audition's "still holds its WAV" reads a URL the stretch also uses. One stop rule, the stop on a view change, lives in the page with async timing, while the others are sync watchers in the player. The range and the track share one resting place, so moving the Track view's playhead loses where the range was paused.

Three callers repeat one ordering to keep sound going across a step or a swap: read whether sound is on, change the split store, then press play again. The store is named `audition`, though in the glossary an Audition is only the 8 s across a split, and playing the range is "not an audition".

## Solution

The store becomes `player`, with one set of verbs. A caller says "toggle", "seek", "back to start", and the player works out the subject from the split store: the audition in the Split view, the selected track in the Track view, the range in the Range view. It exposes the playhead's span for that subject, so views stop computing it.

Inside, one status has one owner, the audition or a stretch, and the audition's rules and the stretch's rules stay as separate functions. The `<audio>` plumbing moves to an internal element module. The player owns every stop rule, the view change included, and each stop watcher resets only its own subject. Each subject keeps its own resting place. A `carryOver` verb keeps sound going across a change of selection.

The user sees one difference: each view keeps its own playhead, so a visit to another view leaves it where it was. Everything else sounds and looks as before.

## User Stories

1. As a maintainer, I want one set of player verbs, so that a fix to pausing or seeking is made once.
2. As a maintainer, I want the player to work out what is on show from the split store, so that no caller builds a stretch to hand in.
3. As a maintainer, I want the store named `player`, so that "audition" means only the 8 s across the selected split, as in the glossary.
4. As a maintainer, I want one status with one owner inside the player, so that "at most one kind of listening is on" holds by construction.
5. As a maintainer, I want the audition's rules and the stretch's rules kept apart inside the player, so that their real differences stay visible rather than hidden behind flags.
6. As a maintainer, I want every new press to go through one place that takes a number, so that no site bumps the press number by hand.
7. As a maintainer, I want the `<audio>` element's plumbing in its own internal module, so that the player's file holds rules and not element details.
8. As a maintainer, I want the element module to map file time to the WAV's time, so that no rule computes offsets.
9. As a maintainer, I want volume and play speed applied through the element module, so that a new clip, a release or a hand-over never drops them.
10. As a maintainer, I want the press number, the window ahead, the hand-over and the resting places to stay in the player, so that the element module knows nothing about decodes.
11. As a maintainer, I want the stop on a view change to be one of the player's sync watchers, so that every stop rule lives in one file with one timing.
12. As a maintainer, I want a change of the selected split to reset only the audition, so that one watcher does not stop sound another watcher owns.
13. As a maintainer, I want a new range, or none, to reset only the range, so that the range watcher does not reach into the audition.
14. As a maintainer, I want another selected track, or one whose ends moved, to reset only the track, so that the track watcher needs no "unless the Range view is on show" check.
15. As a maintainer, I want each subject's resting place tied to its own identity, so that a place never shows in the wrong subject.
16. As a maintainer, I want the audition's place tied to its split's id, the track's to its key and ends, and the range's to the range, so that each identity is the one its glossary entry implies.
17. As a maintainer, I want a single `carryOver` verb, so that "keep sound going across a step" is one rule instead of an ordering three callers repeat.
18. As a maintainer, I want `carryOver` to read whether sound was on before the change, so that the watcher releasing the old sound cannot fool it.
19. As a maintainer, I want `carryOver` to play only when the change reports it happened, so that a step refused at the first or last track, or held by the discard question, starts nothing.
20. As a maintainer, I want the swap to seek inside the change, so that the new track rests at the matched moment before it plays on.
21. As a maintainer, I want the player to expose the playhead's span for the subject on show, so that the Split view and the Track view stop calling the audition's extent and the track's extent for their sliders.
22. As a maintainer, I want the playhead reader to return null when nothing is on show, so that a view handles one empty case.
23. As a maintainer, I want the failure line worded from the subject on show, so that a failure says "split", "track" or "range" without the caller saying which.
24. As a maintainer, I want the page's play button to call one toggle, so that the page drops its stretch computation and its twin button blocks.
25. As a maintainer, I want the page's back-to-start button to call one verb, so that it no longer branches on the view.
26. As a maintainer, I want the button labels to stay in the page, so that UI text stays out of the player.
27. As a maintainer, I want the player's interface down from 24 members to about 15, so that a caller learns less.
28. As a user, I want the Range view's playhead to stay where I paused it after I visit the Track view and move its playhead, so that I resume the range where I left it.
29. As a user, I want the Track view's playhead to stay where I left it after I visit the Range view, so that each view remembers its own place.
30. As a user, I want the audition to keep its place across a view change, as it does today, so that nothing I rely on changes.
31. As a user, I want a step to the next split or track to keep sound going if it was on, as today, so that I can listen through the splits without pressing play each time.
32. As a user, I want a swap to the matching track to play on from the same moment, as today, so that I can compare two recordings by ear.
33. As a user, I want a paused audition to be let go of on a step and rest at the new split's start, as today, so that stepping does not start sound I paused.
34. As a user, I want the play button, Space and Home to act on what the panel shows, as today, so that keys and buttons agree.
35. As a user, I want volume and play speed to behave as today, so that the refactor changes nothing I hear.
36. As a test author, I want one suite per verb, run for the audition, the track and the range, so that "pausing" and "moving the playhead" are written once.
37. As a test author, I want suites for rules only one subject has (moving the split, the long track's windows, the stop watchers), so that real differences stay tested on their own.
38. As a test author, I want the element module tested on its own, so that position mapping, volume, speed and release are proved once.
39. As a test author, I want the player spec to keep driving jsdom's own element through prototype spies, so that the restructure does not also rewrite the fake.
40. As a test author, I want the view and page specs to keep passing with only the store's new names, so that they prove nothing visible changed.
41. As an agent, I want the store-wiring skill to point at the player's file, so that new sound goes through it.
42. As an agent, I want the architecture doc to describe one status with an owner and one place per subject, so that the Player section matches the code.

## Implementation Decisions

- **Name.** The store is `player`, in the split-zoom widget's model segment. "Audition" stays for the split's subject and its rules only.
- **The subject on show.** The player reads it from the split store: the view, the selected split, the selected track and the range. In the Split view the subject is the audition of the selected split. In the Track view it is the selected track. In the Range view it is the range. With none of these, nothing is on show and the verbs do nothing.
- **The public interface.**

  | Member                                                                              | What it does                                                                                                      |
  | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
  | `status`                                                                            | `idle`, `loading`, `playing` or `paused`, of the subject on show                                                  |
  | `isActive`                                                                          | loading or playing                                                                                                |
  | `failure`                                                                           | the failure line, worded "split", "track" or "range" from the subject, or null                                    |
  | `extent`                                                                            | the playhead's span: the audition's 8 s, the track's ends or the range; null when nothing is on show              |
  | `playheadSeconds()`                                                                 | the sound while it plays, else the subject's resting place, else the extent's start; null when nothing is on show |
  | `toggle()`                                                                          | a press while it decodes takes it back, while it plays pauses it, otherwise plays from the place                  |
  | `seek(seconds)`                                                                     | moves the playhead, held to the extent                                                                            |
  | `backToStart()`                                                                     | seeks to the extent's start                                                                                       |
  | `grabPlayhead()`, `dropPlayhead()`                                                  | a drag pauses a playing subject and plays it on from the drop                                                     |
  | `carryOver(change)`                                                                 | see below                                                                                                         |
  | `stop()`                                                                            | ends everything audible: the export, leaving the page                                                             |
  | `volumeDecibels`, `isMuted`, `setVolume`, `toggleMute`, `playSpeed`, `setPlaySpeed` | as today                                                                                                          |

  `auditionExtent`, `stretchStatus`, `stretchPlayheadSeconds` and every `…Audition…`/`…Stretch` verb leave the interface.

- **`carryOver(change: () => boolean)`.** It reads `isActive`, runs `change`, and if `change` returns true and sound was on, plays the new subject from its own place. The Split view's step, the Track view's step and the Track view's swap use it. The swap calls `seek` inside `change`, after the store has selected the matching track.
- **One status with an owner.** Inside the player, the status has one owner, the audition or a stretch (the range or the track). Starting one subject takes the status from the other. Stopping, pausing and failing act on the one owner. The audition's rules (8 s extent, pause and keep the place on a move, drop the WAV at the end) and the stretch's rules (decode windows, look-ahead, hand-over, keep the WAV at the end) stay as separate functions. A full merge, with the audition as a one-window stretch, was rejected: it needs a flag for each of the moved rule, the end-of-play rule and the look-ahead.
- **Press numbers.** Every new press, pause and stop takes its number through one function. No site increments it directly.
- **The element module.** An internal module in the split-zoom widget's api segment, beside the saved volume and play speed. It does not take a decoded stretch and it does not know about presses. Its responsibilities:
  - make the `<audio>` element on first use;
  - hold a clip and release it, with the `removeAttribute('src')` + `load()` release;
  - play (a promise) and pause;
  - read and set the position in file seconds, clamped to the clip;
  - apply volume and play speed (with `preservesPitch` and `defaultPlaybackRate`) on creation, on every hold and on change;
  - report `ended` and `timeupdate`.

  The press number, the window ahead, the hand-over and the resting places stay in the player. It is a module, not an injected seam: one implementation, no fake.

- **One resting place per subject.** The audition's place is keyed by the split's id, the track's by its key and ends, and the range's by the range. A subject's place is kept when another subject plays, and when another view is shown. This replaces the shared stretch slot.
- **Stop watchers, all sync, in the player.**

  | Change                          | What it does                                                                                                                                     |
  | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
  | The view                        | pauses a playing stretch and keeps its place and WAV; takes back a decode; lets go of the audition's WAV and keeps its place; clears the failure |
  | The selected split's id         | ends the audition and clears its place                                                                                                           |
  | The selected split's time       | pauses a playing audition and lets go of its WAV; takes back a decode                                                                            |
  | The range, or none              | ends the range and clears its place                                                                                                              |
  | The selected track, or its ends | ends the track and clears its place                                                                                                              |

  Each watcher stops the sound only when its subject owns it. The `view !== 'range'` check goes. Sound under another subject is already stopped by the view change, since a new range, a split selection and a track selection each switch the view.

- **The page.** Its view-change watcher, its stretch computation, its `toggleStretch` and `backToStart` branches and one of its two play-button blocks go. It keeps the label text per view, and its `stop()` calls before an export and on unmount.
- **The views.** The Split view, the Track view and the Range view call the one set of verbs, and read `extent` for their slider bounds. They keep computing their own canvas span for drawing.

## Testing Decisions

- **Good tests** go through the player's interface and check what a caller sees: `status`, `isActive`, `failure`, `extent`, `playheadSeconds()`, and the element's `play`, `pause`, `currentTime` and `src` as spied today. They don't read the owner or the press number.
- **One seam: the player store's interface.** It already exists. The element module gets its own short spec as a module, not as a seam.
- **The player spec is regrouped.**
  - One suite per verb (toggle, pausing, the resting place, moving the playhead, back to start, grab and drop, failures), run for the audition, the track and the range with `describe.each` over a per-subject set-up.
  - Subject-only suites stay apart: moving the split, the long track's windows and hand-over, the range and track resets, and the stop watchers.
  - Volume and play speed stay as they are.
  - New cases: one resting place per subject (range paused, Track view's playhead moved, range resumes at its place), the view-change stop inside the player, each watcher leaving another subject's place alone, and `carryOver` (on: plays the new subject; off: nothing; change refused: nothing; seek inside change: rests there and plays from it).
  - The set-up keeps the `HTMLMediaElement.prototype` spies.
- **The element module's spec** covers position mapping and clamping, volume and speed applied on creation and on every hold, and the release.
- **Replace, don't layer.** A case that the per-verb suites cover leaves its mirrored copy. No case is in two suites.
- **The view and page specs** change only names: the store and its verbs. They pass otherwise unchanged. A page case that tested the view-change stop moves to the player spec.
- **Prior art.**
  - The current player spec, `audition.spec.ts`, for the element spies and the clip deferreds.
  - The matches module and edit ledger specs, for a module inside a slice tested through what it returns.

## Out of Scope

- One set of commands per view, shared by keys and buttons, and moving the title row into the widget (review candidate 5). Only its "keep playing across a step" ordering is taken here, as `carryOver`.
- A shared stretch view for the Range and Track views (review candidate 4).
- A full merge of the audition and the stretch into one state machine.
- Making the element module an injected seam with a fake.
- The player's own work-out of the file's end from the last track (the review's "Also noticed"), unless the split store exposes the duration on the way.
- Any change to decode windows, the look-ahead, ffmpeg calls or ADR 0004.

## Further Notes

- **Docs that this changes.**
  - `docs/architecture.md`: the stores table and diagram name `player`; the Player section describes one status with an owner, the two rule sets, one place per subject, and the view-change stop among the player's watchers.
  - The store-wiring skill and the ffmpeg-session skill point at the player's file.
  - `CHANGELOG.md`, under Unreleased, one line: each view keeps its own playhead.
  - `GLOSSARY.md`: Playhead, already changed in the grilling.
- **Tickets**, in order, each green on its own and done test-first, on one branch and one PR:
  1. The element module.
  2. One status with an owner.
  3. One set of verbs, renamed to `player`.
  4. The player owns the view-change stop; each watcher resets its own subject.
  5. One resting place per subject.
  6. `carryOver`.
