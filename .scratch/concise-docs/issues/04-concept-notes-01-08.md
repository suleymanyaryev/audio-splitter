# 04: Concept notes 01 to 08 become fixed lessons

**What to build:** notes 01 to 08 follow the concept-note contract from ticket 01. Each keeps its spine, loses its logs, and points only at code that exists. See the spec's "Concept notes".

**Blocked by:** 01 (the doc contract)

**Status:** resolved

- [x] Before editing, write down each note's core idea in one sentence. After editing, each note still teaches it, with its anchoring measured number.
- [x] No timing or decode tables, calibration diaries (kept as one sentence each), browser-check logs, "not measured" sections, ticket or issue numbers, or "milestone N", "now" and "later" wording.
- [x] Each "Where it lives in the code" section is a few links to the core maths, with no keys, buttons, dialogs or pixel widths.
- [x] Notes 01 and 02 no longer name `decode-whole-file.ts` or `min-max-peaks.ts`.
- [x] Note 04 says "Find splits", not "Find gaps".
- [x] An idea taught in more than one note stays in the note that teaches it first, and the others link to it: median minus offset in notes 03 and 04, the leftover arithmetic in notes 02 and 03.
- [x] Every code comment that cites a section of these notes cites the note file instead. This includes the ffmpeg wrapper, decode slice, decode clip, cut track, probe, defaults, player, decode window and range-limits comments.
- [x] The waveform comment that cites note 08 for something note 08 doesn't say points at the right place or drops the citation.
- [x] Every file, function and constant these notes name exists in `src/` and matches.
- [x] `pnpm vitest run` on touched dirs, `pnpm lint:changed`, and Checkpoint before the commit, all green.
- [x] Notes 01 to 08 are near 6,400 words together. (7,273: see Comments)

## Comments

- **Core ideas before the cut.** Each note's core idea was listed first, in one sentence with its anchoring number. An independent audit then found each concept in the new note, or in the earlier note it links to. Dropped as not concepts: the zero-copy hand-over of ffmpeg's output (02), `-map 0:a:0` and `-map_chapters -1` (07), and the word "Mark", which GLOSSARY.md owns (08).
- **Word target.** Notes 01 to 08 come to 7,273 words (wc), against ~6,400. A second cutting pass stopped where the text left was concepts and their worked numbers, since the spec ranks losing a concept as the bigger risk.
- **Links point back, not forward.** A note links to an earlier note it builds on. The forward links (01→02, 01→05, 02→03, 03→04, 04→13/15, 07→12) went, and the prose around them stayed.
- **Single homes.** Median minus offset is taught in note 03, the leftover arithmetic in note 02 and the energy mean in note 03; the other notes link there.
- **One comment's wording changed beyond its citation.** `decode-clip.ts` cited note 06 for "well under a second even late in a 3 h MP3", which neither the old notes (1.25 s measured) nor the new one support. It now says what note 06 states: a clip's decode grows with its position in an MP3.
- **Left for ticket 05.** Note 14 says "19.2 s when note 02 measured it", and that load time is no longer in note 02.
- **Left for ticket 06.** The "Find gaps" comment in `propose-splits.ts`.
- **Checks.** `pnpm vitest run` on the touched dirs → pass; `pnpm test:changed` → pass (41 files, 1,680 tests); `pnpm lint:changed` → pass; `pnpm typecheck` → pass.
