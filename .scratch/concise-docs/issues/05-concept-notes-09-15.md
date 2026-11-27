# 05: Concept notes 09 to 15 become fixed lessons

**What to build:** notes 09 to 15 follow the concept-note contract from ticket 01. Each keeps its spine, loses its logs, and points only at code that exists. See the spec's "Concept notes". Notes 10, 11, 13, 14 and 15 carry the most sediment.

**Blocked by:** 01 (the doc contract)

**Status:** resolved

- [x] Before editing, write down each note's core idea in one sentence. After editing, each note still teaches it, with its anchoring measured number.
- [x] No "In Chrome" or other browser-check logs, by-ear playlist logs, tuning sweeps (kept as one sentence each), cost diaries, "not measured" or "dropped" placeholders, "stands in for an ADR" sections, ticket or issue numbers, or history wording.
- [x] Each "Where it lives in the code" section is a few links to the core maths, with no UI wiring, tooltips, keys or settings behaviour.
- [x] Note 11 no longer says the FFT comes later; it links to note 14.
- [x] Note 13 names `setDepthSetting`, not `setDepth`, and cites the split store once.
- [x] An idea taught in more than one note stays in the note that teaches it first, and the others link to it: the energy mean in notes 13 and 15, the dB floor in note 03, and the seek in notes 07 and 12.
- [x] Every code comment that cites a section of these notes cites the note file instead.
- [x] Every file, function and constant these notes name exists in `src/` and matches.
- [x] `pnpm vitest run` on touched dirs, `pnpm lint:changed`, and Checkpoint before the commit, all green.
- [x] Notes 09 to 15 are near 8,400 words together. (9,264: see Comments)

## Comments

- **Core ideas before the cut.** Each note's core idea was listed first. An independent audit then checked each concept against the old note. It found five dropped, and each is back as one sentence: the definition of average precision, Hann frames losing nothing between spectra, why a full match can fall 2 s short, why there are 36 duplicate pairs, and "not by pitch".
- **Word target.** Notes 09 to 15 come to 9,264 words (wc), against ~8,400. What is left is concepts and their measured numbers; the restored concepts added some words back.
- **Intended cuts.** The "stands in for an ADR" sections and the alternatives they weighed (MFCC, pitch, N−1 peaks, Foote) went, as did the browser-check and by-ear logs and the sweep tables. Each tuning decision is one sentence. Note 15 gains one: 5.4 dB fits both crossfade test sets, from `.scratch/crossfade-changes/analysis.md`. `defaults.ts` cites note 15 for that value.
- **Links point back.** Notes 09 to 15 link to note 03 for the energy mean, the dB floor, RMS and the median, and to note 07 for the seek. The one forward link, 11 → 14 for the FFT, is the one the ticket asks for.
- **One comment's wording changed beyond its citation.** `decibels-to-gain.spec.ts` said "note 09's table", and the values in note 09 are now a list, not a table.
- **Left as is.** `src/entities/split/config/confidence-bands.ts` still says "The planned ear check on `sample-crossfade.mp3` was dropped". That is history wording in a comment, but rewriting a comment beyond its citation is out of the spec's scope. The note 13 citation beside it is true. Likewise, `use-spectrogram-readout.ts` cites note 14, which holds the maths behind its readout but not the readout's format.
- **Checks.** `pnpm vitest run` on the touched dirs → pass; `pnpm test:changed` → pass (44 files, 1,740 tests); `pnpm lint:changed` → pass; `pnpm typecheck` → pass.
