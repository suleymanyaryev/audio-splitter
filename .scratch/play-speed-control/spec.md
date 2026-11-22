# Play speed control, 0.5× to 2.0×

Status: ready-for-agent

GitHub issue #3. A minor release outside the milestone sets: play speed is a new capability, and nothing an export writes changes. It is also a learning milestone, teaching how speed changes without the pitch changing (resampling against time-stretching). It is built as three tickets under `issues/`: concept note 10 (01), the play speed heard in every view (02), then the play speed remembered across a reload (03). The decisions were settled in a grilling session on 2026-11-22.

## Problem Statement

- When I'm hunting for where a track really ends, a fade or a quiet tail goes by too fast to judge. I want to hear it slower.
- When I'm checking a long track for gaps the detection missed, listening takes as long as the track. I want to skim it faster.
- Today the player plays at one speed only, real time.

## Solution

- A **play speed** slider in the zoom panel's title row, just before volume: 0.5× to 2.0× in steps of 0.1, default 1.0.
- A small button on its left shows the play speed (`1.5×`) and resets it to 1.0 when clicked, the way the mute button sits on the left of volume.
- The pitch is kept at every speed.
- It applies to everything the player plays: the audition in the Split view, the selected track in the Track view, the range in the Range view.
- A change takes effect at once while playing, with no restart and no new decode.
- It is remembered across a reload, like volume.

## User Stories

### Hearing at another speed

1. As a user, I want to slow playback down to 0.5×, so that I can hear exactly where a fade ends.
2. As a user, I want to speed playback up to 2.0×, so that I can skim a long track for gaps.
3. As a user, I want steps of 0.1 between those, so that I can pick a speed that is comfortable rather than only half or double.
4. As a user, I want the pitch kept at every speed, so that the music stays recognisable and a voice doesn't turn into a chipmunk.
5. As a user, I want the play speed to change while playing, without the sound stopping, restarting or jumping, so that I can adjust it as I listen.
6. As a user, I want a change of play speed to need no new decode, so that it is instant even late in a 3 h file.

### One setting for the whole player

7. As a user, I want the audition across the selected split played at the play speed, so that I can hear a cut slowly.
8. As a user, I want the selected track played at the play speed, so that I can skim it.
9. As a user, I want the range played at the play speed, so that I can listen closely to a stretch I dragged out.
10. As a user, I want the play speed to stay as it is when I switch between the Split, Track and Range views, so that I set it once.
11. As a user, I want the play speed to stay when I select another split or track or drag out a new range, so that it is a setting, not something tied to one stretch.
12. As a user, I want a paused range or track to resume at the play speed, so that pausing never resets it.
13. As a user, I want a seek, a drag of the playhead or "back to the start" to keep the play speed, so that moving around never resets it.

### Long tracks

14. As a user listening to a track over 10 min, I want the play speed to hold across each hand-over to the next window, so that it never drops back to 1.0 mid-track.
15. As a user seeking outside the window being played, I want the new window to play at the play speed, so that a seek never resets it.
16. As a user playing a long track at 2.0×, I want the next window ready in time, so that the faster speed adds no waiting.

### The playhead

17. As a user, I want the playhead to stay on the sound at any speed, so that what I see is where I am.
18. As a user, I want the playhead to move slower at 0.5× and faster at 2.0×, so that it matches what I hear.
19. As a user adding a split at the playhead while it plays, I want it placed where the playhead is when I press the key, so that the rule is the same at every speed.

### Seeing and resetting it

20. As a user, I want to see the current play speed next to the slider, so that I know what I'm hearing.
21. As a user, I want one click to bring the play speed back to 1.0, so that I can return to real time quickly.
22. As a user, I want the control next to volume, so that the two settings for how I hear are together.
23. As a user, I want the control in all three views' title rows, so that I can change it wherever I am.

### Remembered

24. As a user, I want the play speed remembered across a reload, so that I set it once.
25. As a user on a first visit, I want the play speed to start at 1.0, so that nothing sounds unusual until I choose.
26. As a user whose browser blocks storage, I want the control to work for the session and start at 1.0 on reload, so that a privacy setting never breaks it.
27. As a user, I want a saved value that is broken or out of range to give 1.0, so that a bad value never leaves the player at a speed the slider can't show.

### Keyboard and screen reader

28. As a keyboard user, I want to reach the slider with Tab and change it with the arrow keys, so that it works like the volume slider.
29. As a keyboard user, I want to reach the reset button with Tab, so that I can reset without a mouse.
30. As a keyboard user, I want the review screen's keys to keep reaching the view after I drag the slider with the mouse, so that Space still plays.
31. As a screen-reader user, I want the slider announced as "Play speed" with its value read as `1.5×`, so that I know the setting.
32. As a screen-reader user, I want the reset button to name what it does, so that I know clicking it returns to 1.0.

### What it doesn't touch

33. As a user, I want an export unaffected by the play speed, so that slowing down to listen never changes the files I write.
34. As a user, I want the times on screen to stay times in the source file, so that a split at 1:23.45 reads the same at any speed.
35. As a user, I want the volume and the play speed independent, so that changing one never moves the other.

## Implementation Decisions

### Ticket 01: concept note 10

- Concept note 10, on speed without pitch, shaped like notes 01–09. As AGENTS.md requires, the idea is explained in chat first with a number measured on a real sample, and the note is confirmed before any code.
- The measurement uses native ffmpeg on one excerpt from the samples, in three versions:
  - the original;
  - resampled (`asetrate` to twice the rate, then back to the original rate), like tape played fast;
  - time-stretched (`atempo=2`), which is WSOLA.

  For each, the note gives the length and the strongest frequency. The expected result: resampling halves the length and moves the pitch up one octave; time-stretching halves the length and keeps the pitch.
- It explains WSOLA. The sound is cut into overlapping blocks, which are laid down at a new spacing. Each block is lined up with its neighbour by how alike their waveforms are, so the joins don't click. It also explains why speech and drum hits smear at 0.5× and 2.0×.
- It says the player's "stretch" (the range or the selected track) is unrelated to time-stretching.
- Its section on Chrome is filled in by tickets 02 and 03 with the measured numbers.

### Tickets 02 and 03: the control, then saving it

- **The browser does the time-stretching (ADR 0004).** The one media element plays at the play speed with pitch preservation on. The app is desktop Chrome only, so there is no prefixed fallback.
- **The audition store owns the play speed**, beside the volume, following the volume's pattern:
  - **State:** a reactive play speed, read by the control.
  - **Setter:** clamps to 0.5–2.0, rounds to the 0.1 grid, and ignores a value that isn't a number.
  - **Applying:** the play speed goes to the element when the element is made and on every change. A synchronous watch means playing sound changes at once.
  - **Saving:** every change is saved.
- **The play speed survives a new source.** Loading a source resets a media element's rate to its default rate, which is 1.0. The player loads a new source at three points: a new clip, releasing the held one, and the window hand-over. So applying the play speed sets the element's default rate as well as its current rate.
- **Its limits sit beside the volume's** in the player's configuration: minimum 0.5, maximum 2.0, step 0.1, default 1.0, and its own storage key, separate from the volume's.
- **It is saved on its own.** Reading it back accepts only a value in range and on the 0.1 grid. Anything else gives 1.0: the first visit, a broken value, or blocked storage. Every read and write is wrapped, as for the volume.
- **A play speed control component sits beside the volume control**, placed just before it in the review page's title row, in all three views:
  - a reset button showing the play speed, which sets 1.0 on click and is always enabled;
  - a compact slider named "Play speed", with the value text `1.5×`.

  The readout uses the multiplication sign (U+00D7), in the spirit of DESIGN.md's real minus sign. The slider gives up focus after a mouse drag, as the kit's slider already does, so the view keeps its keys.
- **No new key.** The control is reached with Tab, like the volume. The review screen's keys stay the views' keys (ADR 0002), and the shortcuts dialog doesn't change.
- **The playhead doesn't change.** The element reports its position in media time, so the playhead is right at any speed, and the animation loop reads it every frame.
- **The lookahead stays in media time.** The next window is decoded once the playhead is 30 s of media time from the end. At 2.0× that's 15 s of real time against a slowest decode of about 2.1 s (note 08), so the threshold doesn't change. The 59 ms hand-over break is real time at any speed, so at 2.0× it comes twice as often.
- **A split added at the playhead is not corrected for reaction time.** At 2.0× a press 250 ms late lands 0.5 s late in the file. The split goes where the playhead is when the key is pressed, and is nudged in the Split view as usual.
- **Docs:**
  - concept note 10 gains its Chrome section;
  - the README's list of what is remembered adds the play speed;
  - the changelog gets an Added line;
  - the audition store's header comment gains a paragraph on the play speed, beside the volume's;
  - the architecture doc adds the play speed in three places: what is saved, the audition store's row in the store table, and the rule that the volume applies to the element only, which becomes the volume and the play speed.

## Testing Decisions

- **A good test here drives the public interface and checks what the user would notice.** For the store, that's the speed the one element plays at and what comes back after a reload. For the page, it's the control the user sees and the speed it sets. Tests never check which element properties the store writes, or in what order.
- **Two existing seams, no new ones.** These are the two seams that cover the volume today.
- **Seam 1: the audition store's spec.** It drives the store through its public interface: setting the play speed, then playing the audition, a range or a track, pausing, seeking, and crossing a window hand-over. It observes the element through the media-element spies the spec already has, and `localStorage`. Cases:
  - **Default:** 1.0 on a first visit.
  - **Setter:** clamps to 0.5 and 2.0, rounds to the grid, and ignores a value that isn't a number.
  - **When it applies:** the element plays at the play speed when it is made and as soon as the play speed changes mid-play, with pitch preservation on.
  - **Three kinds of listening:** the audition, the range and the track all play at it.
  - **It survives a new source**, after a new clip, a seek outside the held window, and the window hand-over.
  - **Saving:** each change is saved, and a fresh store reads the saved value back.
  - **Bad saved values:** a table of them gives 1.0, as the volume's table does: none saved, not JSON, off the grid, under 0.5, over 2.0, a string, not an object.
  - **Blocked storage** gives 1.0 and doesn't throw on save.
  - **Independence:** the play speed and the volume don't affect each other.
- **The fake element behaves like Chrome on a new source.** On a new source, or a load, it resets its rate to its default rate, as the media spec says and Chrome does; jsdom doesn't. The spec already replaces load with a spy; it also wraps the source setter. "It survives a new source" then fails whenever the fix is missing, however the fix is written.
- **Seam 2: the review page's spec.** A block like the existing "the volume" block runs across the Split, Track and Range views. Cases:
  - the control sits just before the volume in the title row;
  - the slider is named "Play speed", with the value text `1.5×`;
  - moving the slider changes the player's play speed;
  - the button shows the play speed and resets it to 1.0;
  - the review screen's keys still reach the view after the slider is used.
- **No separate spec for the saved play speed or the control component.** Both are covered through the two seams, as the saved volume and the volume control are today.
- **A hand check in Chrome**, with the browser automation skill, recorded as numbers in note 10's Chrome section. It covers what jsdom can't hear or reach:
  - the pitch kept at 0.5× and 2.0× in all three kinds of listening;
  - a change mid-play with no restart;
  - a track over 10 min at 2.0× across a real window hand-over, with the play speed and the playhead recorded;
  - the play speed back after a reload.
- **No e2e spec.** A window boundary needs over 10 min of audio, so it would need a large committed fixture or a seam that exists only for testing. The hand check covers it once.

## Out of Scope

- Tape-style speed, where the pitch moves with the speed.
- Speeds outside 0.5–2.0, or steps finer than 0.1.
- A keyboard shortcut for the play speed.
- A hand-written time-stretch (ADR 0004).
- Applying the play speed to an export.
- Showing times on screen scaled by the play speed.
- Correcting a split added at the playhead for reaction time at high speeds.
- Removing the break at a window hand-over.
- Browsers other than desktop Chrome.

## Further Notes

- **Glossary:** "Play speed" was added on 2026-11-22. Avoid "playback rate", "tempo" and "rate", because "rate" is already the sample rate (note 01).
- **ADR 0004** records why the time-stretch is the browser's while the rest of the signal maths is hand-written, and the reset on a new source.
- **The stops:** for the user's confirmation of the note, after ticket 01's chat explanation and note. For the user's confirmation of the milestone, after ticket 02 works in the browser. Ticket 03 only adds saving, so it ends with its Chrome check reported, not a stop.
