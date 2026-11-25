# 05: A confidence per split

**What to build:** each split Find splits adds carries a confidence, sure, likely or doubtful, read from its depth. A sure split looks as it does today. Likely and doubtful splits are marked on their lines in every view, doubtful the stronger, and the track list's split row shows the band with the depth in a tooltip. Moving a split, or adding one by hand, means no confidence.

**Blocked by:** 02.

**Status:** resolved

Spec: user stories 24 to 33; Implementation Decisions "Finding splits" (the bands), "The split store" (a split's confidence, moving) and "Split lines, the track list and the keys". Read `DESIGN.md` and use the `impeccable` skill for the look.

- [x] A split gains its confidence: the band and the depth in dB, or none. Find splits sets it; a split added by hand, from pending splits or from the Range view has none.
- [x] The bands: sure from 15 dB, likely from 9 dB, doubtful under 9 dB, in a config file beside the gap defaults with a comment pointing at concept note 13.
- [x] Moving a split clears its confidence, with no extra edit. Deleting a split takes it along; removing a track keeps the confidence of the splits that stay.
- [x] The confidence is set once: a later setting change leaves it.
- [x] Split lines in the whole-file waveform, the loudness curve and the zoom panel's views show likely and doubtful; sure and none look as today.
- [x] The track list's split row shows a likely or doubtful band, with the depth in its tooltip.
- [x] Store specs: the bands at 8.9, 9, 14.9 and 15 dB; moving clears; a manual split has none. The track list spec covers the band and the tooltip.
- [x] In the browser: `sample1.m4a` shows 33 sure splits that look as before; f16 at a lower depth shows likely and doubtful splits marked in every view.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- **The look (impeccable, no new token).** A likely split gets a hollow ring and a doubtful one a filled disc, both in `split` with a 1.5px stroke, 7px up from the foot of the line (ring 6.5px across, filled with `surface`; disc 8px). One shape family keeps the mark a mark of the split, so Rust stays for splits (Rust Rule); the filled disc is the stronger of the two by weight, not by a new colour. A sure split and a manual or moved one look as before. The track-list row repeats the ring or disc beside the band word, which is bold `ink` for doubtful. DESIGN.md has a "Confidence mark" entry.
- **`drawConfidenceMarks` takes marks, not bands.** `shared` may not import `entities`, so `markOfBand` maps the band name to ring or disc and the widgets pass `split.splits.map(...)`.
- **The band comes from the depth for every detected split**, so a shallow gap can be likely or doubtful too (spec: depth is the confidence).
- **A moved split clears its confidence with no extra edit**: `moveSplit` sets it null inside the same branch that counts the move.
- **Not done here:** "marks it checked" (GLOSSARY.md) is ticket 06's, with `K`.
- **In the browser** (`sample1.m4a`): at the default depth Find splits (33) gave 34 tracks with no marks; at 3.0 dB the whole-file waveform and the loudness curve show rings and discs on the extra splits and the track list says "doubtful" with the depth in a tooltip. No f16 file is among the samples here, so the lower-depth check used `sample1.m4a` at 3 dB instead. The zoom views are covered by the draw spec and the shared drawing call, not looked at by eye.
- **Code review:** not run on this ticket. Checkpoint tier run: `pnpm test:changed` (1368 passed), `pnpm lint:changed`, `pnpm typecheck`.
