# Previous and next keys for tracks and splits

Status: ready-for-agent

GitHub issue #4; its decisions comment matches this spec, except for the testing seam (see Testing Decisions). Vocabulary is in `GLOSSARY.md`, and this work adds no term. The keys belong to the view on show, as ADR 0002 records.

## Problem Statement

To check the tracks one by one, I click a row in the track list or a block in the track strip for each one. My hands move between the keyboard and the mouse every time, and while a track plays I have to reach for the mouse to hear the next one. Stepping through the splits in the Split view is the same: each one is a click on a row or on the whole-file view.

## Solution

In the Track view, `]` selects the next track and `[` the previous one. In the Split view, they select the next and previous split. The selection is the one a click makes, so the track list, the track strip, the whole-file view and the zoom panel all follow. Sound that was on carries over to the new item from its start, and sound that was off stays off. At the first and last item the keys do nothing. They work on every keyboard layout without a modifier, and the shortcuts dialog lists them.

## User Stories

### Track view

1. As a reviewer, I want `]` in the Track view to select the next track, so that I can check the tracks without the mouse.
2. As a reviewer, I want `[` in the Track view to select the previous track, so that I can go back to a track I just heard.
3. As a reviewer, I want the track list's row for the new selected track to be marked and scrolled into view, so that the list always shows where I am.
4. As a reviewer, I want the track strip's block for the new selected track to be marked, so that the strip agrees with the list.
5. As a reviewer, I want the whole-file view to mark the new selected track, so that I see where it lies in the source file.
6. As a reviewer, I want the Track view to show the new selected track, with its gaps and its two end splits, so that I can listen and place pending splits in it at once.
7. As a reviewer, I want the zoom panel's title to name the new selected track, so that I know which track I'm on.
8. As a reviewer, I want a track that was playing to go on with the new track from its start, so that listening through the tracks is one key per track.
9. As a reviewer, I want a paused track to leave the new track resting at its start, with the playhead at its start, so that a step never starts sound I didn't ask for.
10. As a reviewer, I want a track that was stopped to leave the new track resting at its start, for the same reason.
11. As a reviewer, I want a track still being decoded when I press the key to count as playing, so that the new track plays as I asked.
12. As a reviewer, I want the old track's mark and selected pending split to go when I step, as they go on a click, so that nothing of the old track is left on the new one.
13. As a reviewer, I want to be asked the discard question before I leave a track with pending splits, as a click asks, so that a key never loses my pending splits silently.
14. As a reviewer, I want "Apply first" in that question to apply the pending splits and then select the track I stepped to, so that the step still happens.
15. As a reviewer, I want "Discard" in that question to drop the pending splits and then select the track I stepped to.
16. As a reviewer, I want cancelling that question to leave me on the track I was on, with its pending splits.
17. As a reviewer, I want the new track to rest after I answer the question, even if the old one was playing, so that sound never starts behind a dialog I just closed.

### Split view

18. As a reviewer, I want `]` in the Split view to select the next split, so that I can step through the splits without the mouse.
19. As a reviewer, I want `[` in the Split view to select the previous split.
20. As a reviewer, I want the zoom window to centre on the new selected split, as a click on it does, so that the split is in the middle of the view.
21. As a reviewer, I want the track list's row and the whole-file view's line for the new selected split to be marked, so that every part of the screen agrees.
22. As a reviewer, I want an audition that was on to start again across the new split, so that I can hear one cut after another with one key each.
23. As a reviewer, I want no audition to start when none was on, so that a step never starts sound I didn't ask for.
24. As a reviewer, I want an audition still being decoded to count as on, so that the new split is heard as I asked.
25. As a reviewer, I want `]` with no split selected (after a click on empty ground in the whole-file view) to select the first split after the zoom window's centre, so that the key starts from where I'm looking.
26. As a reviewer, I want `[` with no split selected to select the last split before the zoom window's centre.
27. As a reviewer, I want nothing to happen when there is no split in that direction from the zoom window's centre.
28. As a reviewer, I want nothing to happen in a source file with no splits.

### Edges and repeats

29. As a reviewer, I want `[` on the first track and `]` on the last track to do nothing, with no error, so that the keys never wrap around unexpectedly.
30. As a reviewer, I want `[` on the first split and `]` on the last split to do nothing, with no error.
31. As a reviewer, I want sound that is on to carry on untouched when the key does nothing at an edge, so that a wasted key press doesn't stop what I'm hearing.
32. As a reviewer, I want a key that did nothing to leave the "Saved … in …" line of a single export in place, as any key the view doesn't act on does.
33. As a reviewer, I want a held `]` or `[` to step once, so that I don't fly past the track I wanted and don't start a decode for every track on the way.

### Keyboard layouts and where the keys step aside

34. As a reviewer on a US or UK keyboard, I want the `[` and `]` keys to step back and forward.
35. As a reviewer on a German or other layout where `[` needs AltGr or Option, I want the same two physical keys, to the right of P, to work without a modifier, so that the feature isn't lost to my layout.
36. As a reviewer on Dvorak, I want Shift with the physical key that types `?` to keep opening the shortcuts dialog, so that the new keys take nothing away.
37. As a reviewer, I want Shift with either key to do nothing for now, so that it stays free for "first" and "last" later.
38. As a reviewer, I want the keys to do nothing while I type a track name, so that renaming a track never changes the selection.
39. As a reviewer, I want the keys to do nothing while any dialog is open, as with every page key.
40. As a reviewer, I want keys pressed with Ctrl, Cmd or Alt to stay with the browser, as with every page key.
41. As a reviewer, I want the keys to do nothing in the Range view, so that the range plays on untouched until that view gets its own meaning for them.

### Shortcuts dialog

42. As a reviewer, I want the shortcuts dialog's Split view section to list `[ / ]`, so that I can find the keys.
43. As a reviewer, I want the shortcuts dialog's Track view section to list `[ / ]`, saying that a playing track plays on from the new track's start.

## Implementation Decisions

- **The physical keys.** The keys are matched by their physical code, `BracketLeft` and `BracketRight`, not by the character they type. On German and similar layouts `[` needs AltGr or Option. The page-level key composable leaves keys with Alt, Ctrl or Cmd to the browser, so a match on the character would never arrive. A code comment at the match says so. A press with Shift is not taken.
- **Repeats.** A held key steps once: a repeat event is ignored, as Space, Enter and Delete already do.
- **The split store** gains two actions, `selectAdjacentTrack(step)` and `selectAdjacentSplit(step)`, with `step` −1 or 1. Each finds the neighbour and goes through the existing track or split selection, so the discard question and the Split view's centring behave exactly as on a click. Each returns whether the selection changed at once. It didn't change at an edge, or when the discard question opened instead.
- **No selected split.** `selectAdjacentSplit` steps from the zoom window's centre: the first split after it, or the last split before it.
- **Carrying the sound over** happens in each view's key handler, because the split store is an entity and can't see the player.
  - The handler reads whether the sound is on: playing or loading.
  - It calls the store action.
  - If the selection changed and the sound was on, it starts the new item. The Track view plays the new track's whole extent, and the Split view starts the audition.
  - The player's existing watches have already stopped the old sound and dropped the old resting place, so "rests at its start" needs no code.
  - The audition store doesn't change.
- **A key that changed nothing isn't the view's.** At an edge, while the discard question opens, with no split in that direction, or in the Range view, the handler reports that it didn't act. The browser keeps the key, and the "Saved" line stays.
- **The shortcuts dialog** gains one row in each of two sections, labelled with the US keys:
  - Split view, `[ / ]`: "Select the previous or next split; an audition plays on from the new split".
  - Track view, `[ / ]`: "Select the previous or next track; a playing track plays the new one from its start".
- **Docs.** The changelog gets a line under Unreleased. The README and the architecture doc describe no keys, so they stay as they are. No ADR is needed: the physical-key choice is easy to reverse, and the code comment covers it. No glossary change.

## Testing Decisions

- A good test presses the key the way the user does and checks what the user sees or hears: which track or split is marked in the track list, what the zoom panel's title says, whether sound started. It never checks which store action ran or how it found the neighbour.
- **One seam: the Review page spec.** It mounts the whole review screen on the document, and every case dispatches `keydown` with a `code` on the document. It covers:
  - stepping forward and back in the Track view and in the Split view, with the track list, the zoom title and the zoom window following;
  - sound carried over when it was playing or loading, and not started when it was paused or idle, in both views;
  - the first and last item, where nothing changes and the key's default isn't prevented;
  - the discard question opening on a track with pending splits, each answer, and no sound after it;
  - the Split view with no selected split, stepping from the zoom window's centre;
  - Shift, a repeat, a press in a track name and a press in the Range view doing nothing;
  - the shortcuts dialog, opened with `?`, listing both new rows.
- The store actions and the view handlers get no specs of their own. They are checked through the page.
- **Prior art in the same spec:** the helpers that select a track or a split the way a click does, the discard-question cases, the playback cases that set the player's status and spy on its play actions, and the `?` cases that dispatch on the document.
- No Playwright spec. The keys are checked by hand in the browser at the end.

## Out of Scope

- The Range view. Stepping there would mean moving the playhead between the splits inside the range; that is its own issue.
- Wrap-around from the last item to the first.
- Keys for the first and last item (Shift with these keys is left free for them).
- Carrying "it was playing" through the discard question.
- Moving the zoom window when a track is selected: the Track view shows the whole track, and the zoom window stays where it was, as on a click.

## Further Notes

- Issue #2 reworks the Split view's keys (pause and resume, a movable playhead, probably `,`, `.` and Home). It shares no key with this work. Whichever lands second checks the other's keys. Once #2 adds a paused audition, a paused audition counts as sound that is off, and the new split rests.
- The shortcuts dialog's labels show the US characters. On layouts where those physical keys print something else (Ü and + on German), the label and the key cap differ. That's accepted.
