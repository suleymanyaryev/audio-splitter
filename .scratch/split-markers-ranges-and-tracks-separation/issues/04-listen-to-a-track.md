# 04: Listen to a track

**What to build:** the Track view plays the selected track. Its title row gets "Back to track start" (icon button) and Play, which reads "Stop" while the track is being decoded and "Pause" while it plays; pausing and playing again resume at once. A click in the view moves the playhead, a press near the playhead drags it (pausing a playing track and playing on from the drop), and the view is a slider on the playhead: Left/Right 1 s, Shift 10 s, Space play/pause (a held key ignored), Home to the start; Delete and Backspace do nothing. At the track's end playback stops and the playhead returns to the start. A failure to play is one line at the bottom of the view. A track of 10 min or less plays in full; a longer one plays its first 10 min until ticket 05 lands.

**Blocked by:** 02 (The player plays a stretch), 03 (Select a track and see it in the Track view)

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (stories 17–20, 23–29, 31, 61, 67, 68)

- [ ] The player plays the selected track as a stretch; a track of 10 min or less is decoded once and kept, so pause, resume and seek make no second clip call.
- [ ] Starting the track releases a held range WAV and the other way round; the split audition and track playback stop each other.
- [ ] Playback stops and the held audio is released when the selection changes, when the selected track's start or end changes, on a new range, on a view switch, on the export and on unmount.
- [ ] The Track view's press order (playhead drag, else move the playhead) and keyboard, with slider ARIA.
- [ ] Specs: the player's track playback and its stop rules (prior art: the audition store spec); the Track view's keyboard; the review page's Track title row labels and enabled states.
- [ ] CHANGELOG line under Unreleased; `docs/architecture.md` follows.
- [ ] Checked by hand in Chrome with the `playwright-cli` skill in all three supported formats.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or spec decision each part rests on.
