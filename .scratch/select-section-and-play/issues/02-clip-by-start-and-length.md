# 02: Clip by start and length

**What to build:** a prefactor with no visible change. The clip command and the source-file store's clip call take a start and a length in seconds instead of a split time; the split audition asks for its split ±4 s, so it sounds and behaves exactly as before. This makes the range's playback (ticket 05) an easy change. The ticket also measures, in Chrome with the real ffmpeg.wasm, how long a 10 min clip late in the 3 h files (`samples/sample3h.{m4a,mp3,opus}`) takes to decode, and puts the number into concept note 08 in place of its placeholder: it decides whether the spec's 10 min limit holds.

**Blocked by:** 01 (Concept note and glossary).

**Status:** ready-for-agent

Spec: `.scratch/select-section-and-play/spec.md`

- [ ] The clip command takes a start and a length; the 1 s pre-roll (capped at the start) and the clamp at the file's end are unchanged.
- [ ] The source-file store's clip call takes a start and a length, still runs through the one queue and still rejects when the file was replaced.
- [ ] The audition asks for 4 s either side of the selected split, clamped as before; its playhead maths is unchanged.
- [ ] The clip command spec covers a start and a length, the pre-roll capped at the start, and the clamp at the file's end; the audition and source-file specs stay green.
- [ ] The decode time of a 10 min clip late in each 3 h file is measured in Chrome and written into concept note 08, with a verdict on the 10 min limit and on the clip timeout. If the MP3 takes much longer than about 3 s, stop and bring the limit back to the user before ticket 03.
- [ ] AGENTS.md's rows for the clip command and the source-file store describe the new call; no CHANGELOG line (no user-visible change).
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or concept note each part rests on.
