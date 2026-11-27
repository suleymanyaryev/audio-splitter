# 05: Concept notes 09 to 15 become fixed lessons

**What to build:** notes 09 to 15 follow the concept-note contract from ticket 01. Each keeps its spine, loses its logs, and points only at code that exists. See the spec's "Concept notes". Notes 10, 11, 13, 14 and 15 carry the most sediment.

**Blocked by:** 01 (the doc contract)

**Status:** ready-for-agent

- [ ] Before editing, write down each note's core idea in one sentence. After editing, each note still teaches it, with its anchoring measured number.
- [ ] No "In Chrome" or other browser-check logs, by-ear playlist logs, tuning sweeps (kept as one sentence each), cost diaries, "not measured" or "dropped" placeholders, "stands in for an ADR" sections, ticket or issue numbers, or history wording.
- [ ] Each "Where it lives in the code" section is a few links to the core maths, with no UI wiring, tooltips, keys or settings behaviour.
- [ ] Note 11 no longer says the FFT comes later; it links to note 14.
- [ ] Note 13 names `setDepthSetting`, not `setDepth`, and cites the split store once.
- [ ] An idea taught in more than one note stays in the note that teaches it first, and the others link to it: the energy mean in notes 13 and 15, the dB floor in note 03, and the seek in notes 07 and 12.
- [ ] Every code comment that cites a section of these notes cites the note file instead.
- [ ] Every file, function and constant these notes name exists in `src/` and matches.
- [ ] `pnpm vitest run` on touched dirs, `pnpm lint:changed`, and Checkpoint before the commit, all green.
- [ ] Notes 09 to 15 are near 8,400 words together.
