# 05: Play the range

**What to build:** the Range view plays its range. A Play button in the title row reads "Stop" while ffmpeg decodes the range, "Pause" while it plays and "Play" otherwise; resuming after a pause plays at once, without a second decode. A 1 px solid ink playhead is drawn in the Range view at all times: at the range's start on a new range, then where playback is or will resume. At the range's end playback stops and the playhead goes back to the range's start. Space on the focused Range view plays or pauses (auto-repeat ignored). There is one player: playing the range stops the split audition and the other way round, and playback stops on a view switch, a new range, the export and leaving the page. A failure shows as the one-line status at the bottom of the view.

**Blocked by:** 02 (Clip by start and length), 04 (The Range view).

**Status:** ready-for-agent

Spec: `.scratch/select-section-and-play/spec.md` (stories 24–25, 48–52, 54, 56–60)

- [ ] The audition store becomes the one player: it keeps `toggle` for the split audition and adds range play/pause, a playhead position that holds while paused, and a `paused` status; the press-number rule still drops a clip that arrives for a stale press.
- [ ] The decoded range WAV is kept until the range changes, the split audition plays, or the page goes away; at most one decoded stretch is held.
- [ ] The playhead is drawn each animation frame while playing, and at its resting position otherwise.
- [ ] The clip timeout covers a 10 min range, per ticket 02's measurement.
- [ ] Specs (prior art: the audition spec with the clip stubbed and a fake `Audio`): play, pause, resume without a second clip call, the playhead while playing and paused, the range end, mutual stopping with the split audition, stops on view switch / new range / export, a stale clip dropped, the failure line, a file-replaced rejection silent; the Range view's Space key and the button labels.
- [ ] Checked by hand in Chrome with `playwright-cli` in all three formats, including a 10 min range late in the 3 h MP3.
- [ ] CHANGELOG line; AGENTS.md rows for the audition store, the split-zoom widget and the review page; the architecture doc's audition flow redrawn as the player flow.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or concept note each part rests on.
