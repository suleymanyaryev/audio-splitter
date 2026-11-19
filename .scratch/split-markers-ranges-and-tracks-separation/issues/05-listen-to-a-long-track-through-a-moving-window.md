# 05: Listen to a long track through a moving window

**What to build:** a track longer than 10 min plays in full, with exact seeking, while no more than 10 min of WAV is decoded at a time. The window starts at the playhead and runs 10 min or to the track's end. A seek inside the held window is exact and immediate; a seek outside it decodes a new window from there. While a window plays, the next is decoded ahead when the playhead is 30 s from its end and playback carries on into it, so the user hears no decode wait at the hand-over. At most two windows are held.

**Blocked by:** 04 (Listen to a track)

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (stories 21, 22, 30; Implementation Decisions: a long track plays through a moving 10 min window)

- [ ] A pure helper in the split-zoom widget decides the window for a stretch and a playhead (held to the stretch's end) and when the next is due; a stretch of 10 min or less is one window.
- [ ] The player decodes the first window from the playhead, fetches the next ahead, plays on at the boundary, and releases a window it no longer needs; a seek outside the held windows decodes a new one; a stale window (an older press) is dropped.
- [ ] The range is unaffected: it is never longer than 10 min, so it stays one window.
- [ ] Specs: the window helper (prior art: the range window spec); the player's long-track playback with the clip stubbed and a fake `Audio` (prior art: the audition store spec).
- [ ] Note 08 gains the moving window, with the hand-over measured by hand in Chrome (`playwright-cli` skill) on a track over 10 min late in the 3 h MP3, and in `.m4a` and `.opus`.
- [ ] CHANGELOG line under Unreleased; `docs/architecture.md` follows.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which concept note or spec decision each part rests on.
