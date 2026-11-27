# 04: Concept notes 01 to 08 become fixed lessons

**What to build:** notes 01 to 08 follow the concept-note contract from ticket 01. Each keeps its spine, loses its logs, and points only at code that exists. See the spec's "Concept notes".

**Blocked by:** 01 (the doc contract)

**Status:** ready-for-agent

- [ ] Before editing, write down each note's core idea in one sentence. After editing, each note still teaches it, with its anchoring measured number.
- [ ] No timing or decode tables, calibration diaries (kept as one sentence each), browser-check logs, "not measured" sections, ticket or issue numbers, or "milestone N", "now" and "later" wording.
- [ ] Each "Where it lives in the code" section is a few links to the core maths, with no keys, buttons, dialogs or pixel widths.
- [ ] Notes 01 and 02 no longer name `decode-whole-file.ts` or `min-max-peaks.ts`.
- [ ] Note 04 says "Find splits", not "Find gaps".
- [ ] An idea taught in more than one note stays in the note that teaches it first, and the others link to it: median minus offset in notes 03 and 04, the leftover arithmetic in notes 02 and 03.
- [ ] Every code comment that cites a section of these notes cites the note file instead. This includes the ffmpeg wrapper, decode slice, decode clip, cut track, probe, defaults, player, decode window and range-limits comments.
- [ ] The waveform comment that cites note 08 for something note 08 doesn't say points at the right place or drops the citation.
- [ ] Every file, function and constant these notes name exists in `src/` and matches.
- [ ] `pnpm vitest run` on touched dirs, `pnpm lint:changed`, and Checkpoint before the commit, all green.
- [ ] Notes 01 to 08 are near 6,400 words together.
