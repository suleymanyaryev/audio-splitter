# 06: Move the playhead

**What to build:** the playhead in the Range view can be dragged along the range to listen again from any point. If the range was playing, playback pauses on the press and resumes from the drop point on release; if it was paused, it stays paused. A drag during the decode sets where playback starts once the clip arrives. A "Back to range start" icon button (`SkipBack`), left of Play, moves the playhead to the range's start and keeps playing if it was playing; Home on the focused Range view does the same.

**Blocked by:** 05 (Play the range).

**Status:** ready-for-agent

Spec: `.scratch/select-section-and-play/spec.md` (stories 26–31, 53, 55)

- [ ] The player seeks to a time inside the range (exact: `currentTime` inside the WAV) and pauses for a drag, resuming on release only if it was playing.
- [ ] A press within 6 px of the playhead grabs it before anything else; the drag is held to the range. If ticket 07 has landed, the press order is playhead, then a split line, then the mark.
- [ ] Specs: the player's seek, back-to-start and pause-for-drag, playing and paused; the Range view's press composable for the playhead (prior art: the split drag spec); Home and the button's state.
- [ ] CHANGELOG line; AGENTS.md rows for the player and the split-zoom widget.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or concept note each part rests on.
