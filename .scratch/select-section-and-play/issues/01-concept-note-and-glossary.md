# 01: Concept note and glossary (Stop 1)

**What to build:** the Milestone 8 concept and docs, before any code: the milestone ritual says no code before Stop 1. The concept is explained in chat first, then written as note 08; the user reads it, asks questions and confirms it. No code in this ticket.

**Blocked by:** None (can start immediately).

**Status:** resolved

Spec: `.scratch/select-section-and-play/spec.md`

- [ ] The concept is explained in chat first, with numbers from the real sample.
- [ ] Concept note 08 (about one screen, plain words, GLOSSARY.md's terms):
  - why a WAV grows with its length: 44,100 samples × 2 channels × 2 bytes ≈ 176 KB per second, so a 10 min range is about 106 MB, hence the limit;
  - why pausing and seeking inside a WAV are exact: second `t` starts at a byte that can be computed, where seeking in a VBR MP3 is seconds off (note 06);
  - how `currentTime` on a WAV maps to a byte, and what a pause in the middle of a compressed frame means once the audio is PCM;
  - what decoding a long range costs, from native ffmpeg on `sample1` (as note 06 measured its clip), with a placeholder for the in-browser number that ticket 02 measures.
- [ ] The note ends with a "where it lives in the code" list naming the modules the later tickets change (filled in as they land).
- [ ] GLOSSARY.md gains **Range** (a stretch of the source file, 1 s to 10 min, dragged out on the whole-file view to listen to; _Avoid_: selection, section, region) and **Mark** (the spot in a range where "Add split" puts a split; _Avoid_: cursor, marker), and **Playhead** is widened to the Range view and to where playback will resume.
- [ ] The milestones doc gains Milestone 8, "Listening to a range": concept, build, try it, left for later, linking the spec.
- [ ] The user confirms the note (Stop 1). No ticket below starts before this.
