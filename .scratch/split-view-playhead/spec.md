# Split view: pause, resume and a movable playhead

Status: ready-for-agent

From GitHub issue #2. Vocabulary is in `GLOSSARY.md`. While this was grilled, the glossary's **Audition** and **Playhead** entries changed to what this spec builds: an audition that pauses, resumes and is heard from any point, and a playhead drawn in all three views at all times. Keys follow `docs/adr/0002-keys-belong-to-the-view-on-show.md`.

## Problem Statement

The Split view is where I judge exactly where a cut falls, and the audition is how I hear it. But the audition can only be started and stopped. Space and "Play across split" stop it, and the next press plays all 8 s again from the top. I can't pause on the spot I care about, I can't jump to just before the split, and I can't step through the 8 s. The playhead is only drawn while sound plays, so after a stop I can't see where I was.

The usual loop is: listen, move the split by 10 ms, listen again. Today every move ends the audition, so each check starts 4 s before the split again. The Track view and the Range view already pause, resume and let me drag or step the playhead. The Split view, where precise listening matters most, is the one view that can't.

## Solution

The audition behaves like playing a track or the range, scaled to its 8 s:

- **Space** and the play button pause and resume. The audition starts again from the top only after it has played to the end.
- **The pointer**: a click or drag anywhere in the view moves the playhead there, except within reach of the split line, which still moves the split. While the pointer is held, a playing audition pauses, and it plays on from where the pointer is let go. A click outside the 8 s puts the playhead on the audition's nearest edge.
- **The keys**: `,` and `.` step the playhead back and forward 100 ms, or 1 s with Shift, and repeat while held. Home takes it back to the audition's start. Left/Right still move the split, and Delete/Backspace still delete it.
- **The playhead** is always drawn: at the audition's start before the first play and after the end, and where it was paused.
- **The audition's edges** are marked on the canvas, so I can see which part of the 20 s zoom window the 8 s covers.
- **Moving the split** pauses a playing audition and keeps the playhead on the same time in the file, held inside the moved 8 s. Selecting another split, or none, ends the audition and resets the playhead.
- **Switching views**: going to the Track or Range view and back, with the same split still selected, keeps the playhead's place.
- **The panel**: the play button reads "Play across split", "Pause" while playing, and "Stop" while the clip is being decoded. The Split view also gets "Back to audition start" (hint: Home), as the other two views have.
- **The shortcuts dialog** lists the new keys and gestures.

## User Stories

1. As a user reviewing a split, I want Space to pause the audition, so that I can stop on the moment I want to judge.
2. As a user, I want Space after a pause to resume from the same point, so that I don't hear the 4 s before the split again.
3. As a user, I want Space after the audition has played to its end to start it again from the top, so that replaying stays one key.
4. As a user, I want the play button to read "Pause" while the audition plays, so that I know what a press will do.
5. As a user, I want the play button to read "Play across split" when idle or paused, so that the button still says what it plays.
6. As a user, I want the play button to read "Stop" while the clip is being decoded, so that I can take back a press that takes a while.
7. As a user, I want to click anywhere in the Split view to move the playhead there, so that I can hear the audition from any point without hunting for the line.
8. As a user, I want to drag in the Split view to move the playhead along, so that I can find a spot by eye.
9. As a user, I want a playing audition to pause while I hold the pointer, so that the sound doesn't jump around under it.
10. As a user, I want the audition to play on from where I let go, if it was playing when I pressed, so that a seek doesn't need an extra Space.
11. As a user, I want a paused or idle audition to stay paused after a click or drag, so that moving the playhead never starts sound by itself.
12. As a user, I want a press within reach of the split line to still move the split, so that the view's main job is unchanged.
13. As a user, I want a click outside the 8 s to put the playhead on the audition's nearest edge, so that the playhead never leaves what can be heard.
14. As a user, I want a drag past an edge of the audition to park the playhead on that edge, so that dragging feels held, not broken.
15. As a user, I want to see where the audition's 8 s starts and ends in the 20 s zoom window, so that a click outside it is no surprise.
16. As a user, I want the audition's edges to look different from the ground drawn past the file's ends, so that I don't read them as "outside the file".
17. As a user, I want `.` to step the playhead forward 100 ms, so that I can move toward the cut in steps I can hear.
18. As a user, I want `,` to step the playhead back 100 ms, so that I can back up just before the cut.
19. As a user, I want Shift with `,` or `.` to step 1 s, so that I can cross the 8 s quickly.
20. As a user, I want holding `,` or `.` to keep stepping, so that I can sweep the playhead by keyboard.
21. As a user typing on a Russian or Turkmen layout, I want the step keys to be the keys where `,` and `.` sit on a US layout, so that they work whatever layout is active.
22. As a user, I want a step while the audition plays to jump the sound and keep playing, so that stepping works the same as in the Track view.
23. As a user, I want a step not to pass the audition's edges, so that the playhead stays on what can be heard.
24. As a user, I want Home to take the playhead back to the audition's start, so that the key means the same as in the other two views.
25. As a user, I want a "Back to audition start" button in the Split view, so that I can do with the mouse what Home does.
26. As a user, I want Left and Right to keep moving the split 10 ms (Shift: 100 ms), so that the habit I have stays.
27. As a user, I want Delete and Backspace to keep deleting the selected split, so that nothing I know changes.
28. As a user, I want the playhead drawn at the audition's start before I first play it, so that I can see where playing will begin.
29. As a user, I want the playhead to stay drawn where I paused, so that I can see the spot I stopped on.
30. As a user, I want the playhead back at the audition's start after it plays to the end, so that what I see matches what Space will do.
31. As a user, I want moving the split with the keys to pause a playing audition, so that I hear the next check with the split in its new place.
32. As a user, I want moving the split by dragging to pause a playing audition, so that a drag behaves like a key.
33. As a user, I want the playhead to keep its time in the file when I move the split, so that listen, nudge, listen comes back to the same point.
34. As a user, I want the playhead held inside the moved 8 s when the move takes the audition past it, so that it never sits outside what can be heard.
35. As a user, I want selecting another split to end the audition and reset the playhead, so that a place from one split never carries over to another.
36. As a user, I want deselecting the split to end the audition, so that no sound plays across nothing.
37. As a user, I want deleting the selected split to end the audition, since the selection then moves to another split.
38. As a user, I want to go to the Track or Range view and back with the same split selected and find the playhead where I left it, so that a look elsewhere doesn't lose my place.
39. As a user, I want a view switch to stop the sound, as it does today, so that sound belongs to the view it was started in.
40. As a user, I want a range or a track played after the audition to stop the audition, and the reverse, so that only one sound plays at a time.
41. As a user, I want a failure to play still worded "Couldn't play this split", so that I know which thing failed.
42. As a user, I want the export to stop a playing audition, as it does today, so that sound never plays over the export.
43. As a screen reader user, I want the Split view itself to be a slider for the playhead, so that I hear where the playhead is.
44. As a screen reader user, I want the split handle to stay the split's slider, so that moving the split is announced as before.
45. As a keyboard user, I want the playhead slider not to be a Tab stop, so that Tab order is unchanged and the keys still reach the view wherever the focus is.
46. As a user, I want the shortcuts dialog to list `,` / `.` (Shift), Home, click, drag and Space's new pause, so that I can find the new controls.
47. As a user, I want resuming after a split move to decode the 8 s again and then play, with the button reading "Stop" meanwhile, so that a wait is visible and can be taken back.
48. As a user with the volume set, I want the audition to keep using it, so that nothing about loudness changes.

## Implementation Decisions

- **The audition stays its own idea in the player store, not a stretch.** A stretch is a fixed start and end (the range, or a track's whole extent), can run past 10 min, and is decoded in windows. The audition is tied to the selected split, follows it when it moves, and is never more than 8 s. The store keeps a separate audition state with a paused state and a resting place. Low-level player helpers (the one audio element, mapping a file time into the held WAV, the press-number guard) are shared between the two paths, so no pause or seek logic is copied.
- **The audition's state** goes from idle / loading / playing to idle / loading / playing / paused, like the stretch's. A pause keeps the decoded WAV while the 8 s it was decoded for still holds. "Is active" (the button reading Stop or Pause) covers loading and playing.
- **The audition's extent** is the selected split ± 4 s, held to the file's start and end. It is worked out from the split each time, not stored.
- **The resting place is a time in the file**, tied to the split's identity, not to the extent. A move of the same split keeps it, held into the new extent. Another split, or none, clears it. A trip to another view doesn't clear it. Playing to the end clears it, so the playhead is back at the start.
- **Moving the split** pauses a playing audition (it no longer ends it) and releases the WAV, because the extent changed. The next play decodes the new 8 s and starts from the resting place. Selecting another split, deselecting or deleting ends the audition, as today.
- **The store's public surface for the audition** mirrors the stretch's: toggle (play / pause / take back while loading), seek to a time (held to the extent; while playing, sets the place in the held WAV), back to start, grab and drop for a pointer hold (pause on grab, play on from the drop only if it was playing and is still paused), and a playhead position for drawing (the sound while playing, else the resting place, else the extent's start). The playhead position is never null while a split is selected.
- **Audition and stretch still stop each other**: playing one releases the other's WAV and sound. The audition's resting place survives that; only the WAV goes.
- **Failures** are still worded with the subject "split".
- **Keys in the Split view** (page keys, per ADR 0002): `,` and `.` are matched by physical key (Comma / Period), so Shift and non-US layouts don't change them. A step is 100 ms, or 1 s with Shift. Held keys repeat. A step is rounded to the millisecond and held to the extent. Home goes to the audition's start, even when the split handle has focus. Space ignores a held repeat, as today. Left/Right/Delete/Backspace are unchanged. No Alt binding: ADR 0002 leaves Ctrl, Cmd and Alt to the browser.
- **The pointer in the Split view**: a press within the split's existing grab reach takes the split, as today. Any other primary-button press moves the playhead to the pointer's time (snapped to 10 ms as drags already are, held to the extent), grabs it, and follows the pointer until release. A press while playing pauses, and the release plays on. A lost release (no button held on a move, lost pointer capture) lets go as the Track view does. There is no double-click action and no mark in the Split view.
- **Drawing**: the playhead is always drawn, in the same ink and width as today, over the split lines and under the frame. It is redrawn every frame while playing, and on any change of the resting place otherwise. The audition's edges get a mark of their own, distinct from the ground drawn outside the file. The exact look (a light tint outside the 8 s, or short ticks at the frame) is chosen against DESIGN.md while building.
- **Accessibility**: the Split view's frame becomes a slider for the playhead, focusable but not a Tab stop, as in the Track view. Its value is the playhead's time, copied once a second while playing and to the hundredth otherwise. The split handle stays a separate slider for the split.
- **The panel buttons**: in the Split view, the play button's labels follow the audition's state ("Play across split" idle and paused, "Pause" playing, "Stop" loading), with the matching icons the stretch button uses. A "Back to audition start" button with the hint Home shows in the Split view too.
- **The shortcuts dialog's Split view section** gains rows for click, drag, `,` / `.` (Shift), Home, and Space reworded to "Play or pause the audition".
- **Docs**: `docs/architecture.md`'s player section describes the audition's new state and what ends it versus what pauses it. `CHANGELOG.md` gets the line under Unreleased. The glossary is already updated. No concept note: no new audio idea (exact seeking inside a decoded WAV is notes 06 and 08). No ADR.

## Testing Decisions

- A good test acts the way the user does (a key on the page, a pointer on the view, a store call the view makes) and checks what the user hears or sees: the element playing or paused and its current time, the playhead's time, the button's label, the slider's value, the split's time. It doesn't check private fields, which helper ran, or how many times the canvas drew.
- **The audition store spec is the main seam.** It already mocks the audio element and the source-file clip, and covers playing the range and a track with pause, seek, back to start and grab/drop. New cases for the audition:
  - pause and resume from the same time without decoding again,
  - playing to the end puts the playhead back at the start and the next play starts there,
  - seeking while paused and while playing, held to the extent at both file ends,
  - back to start,
  - grab while playing pauses and drop plays on; grab while paused stays paused; drop after something else took over does nothing,
  - moving the split while playing pauses and keeps the file time, and holds it into the new extent; the next play decodes the new 8 s and starts there,
  - selecting another split, deselecting and deleting reset the playhead,
  - a view switch keeps the place,
  - audition and stretch still stop each other, and the audition's place survives,
  - a stale clip after a pause or a move never starts sound,
  - failures still say "split".
- **The Split view spec** owns the view's keys and pointer: `,` / `.` dispatched by physical key with and without Shift, a held repeat steps again, Home, Left/Right still move the split, a click off the line moves the playhead and a click on it still drags the split, a click outside the 8 s lands on the edge, a press while playing pauses and the release plays on, and the playhead slider's value and range. Prior art: its existing key and drag cases, and the Track view spec's slider-value and playhead-drag cases.
- **The review page spec** owns the panel in the Split view: the play button's three labels and the "Back to audition start" button. Prior art: its existing stretch-button cases.
- No Playwright spec. These flows are covered at the store and component seams, and `pnpm test:e2e` isn't part of this work's Final checks.

## Out of Scope

- A wider decode around the audition so that small split moves resume without a decode wait. Revisit only if the wait annoys in use.
- A mark or pending splits in the Split view, and a double-click action there.
- Changing the audition's 8 s length or the zoom window's 20 s.
- Changing ADR 0002's rule about Ctrl, Cmd and Alt.
- Changing how the Track and Range views play, seek or draw.

## Further Notes

- The playhead crosses the split line at the audition's midpoint. Pressing there takes the split, which is fine: a click anywhere else moves the playhead, so the playhead never needs grabbing on the line.
- Resuming after a split move decodes again. Note 08 measured 1.25 s for the 8 s of an MP3 late in a 3 h file, and about 20 ms for `.m4a` or `.opus`.
- Home on the focused split handle goes to the audition's start, not the slider's minimum. That is a deliberate trade: moving the split to the zoom window's left edge is never wanted.
