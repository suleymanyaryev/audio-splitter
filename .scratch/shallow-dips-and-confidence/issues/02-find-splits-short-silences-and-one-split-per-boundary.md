# 02: Find splits finds short silences, one split per boundary

**What to build:** "Find gaps" becomes "Find splits (N)". A press proposes a split at every gap, as today, and at every dip at least 15 dB deep, so the short silences between tracks that the minimum gap length drops become splits. Proposals within 15 s of each other give one split, so a short sound inside a gap no longer makes a 5 s track. The depth is fixed at 15 dB here; ticket 03 adds its slider.

**Blocked by:** 01 (the concept note is confirmed).

**Status:** resolved

Spec: `.scratch/shallow-dips-and-confidence/spec.md`, user stories 1 to 13 and 42 to 43; Implementation Decisions "Depth", "Finding splits" and the store's `findSplits` and preview.

- [x] The depth maths is a hand-written pure module beside the median and the loudness builder: the smoothed level, the loudness around, depth per window, and a gap's depth against the 20 s on either side. Its spec has the hand-checkable cases the spec lists.
- [x] The smoothed level and the loudness around are computed once per source file and kept; the time on `sample3h.m4a` is measured and reported in the ticket's comments.
- [x] Dips: the deepest window within ±15 s with depth ≥ 15 dB, never in the first or last 10 s.
- [x] Proposals: gap middles as today; of two gaps within 15 s the deeper one's middle; a dip within 15 s of a gap proposal dropped; nothing within 15 s of an existing split; the 1 s room from the file's ends kept.
- [x] The store's `findSplits` replaces `addGapSplits`, with the same question about pending splits; the button reads "Find splits (N)".
- [x] Store specs cover: a short silence becomes a split, a shallow passage doesn't, a long silence splits at its middle, a gap and a dip give one split, two gaps around a short sound give one, nothing near an existing split or in the file's first or last 10 s.
- [x] In the browser: `sample1.m4a` at the defaults gives its 33 splits at the same times; f14 (`quiet solitude`) and f16 (`what it feels like to be alone`) gain the short-silence boundaries the analysis lists and lose their double splits.
- [x] If a gap's depth puts any of `sample1.m4a`'s 33 splits under 15 dB, that is reported before going on (spec, Further Notes).
- [x] `CHANGELOG.md` gains its line under Unreleased; `GLOSSARY.md` already says Find splits.

## Comments

- **Time on `sample3h.m4a` (3 h, 221,175 windows):** `buildDepth` takes 1.44 s in Node 24 on one core, once per file, on the main thread; 0.5 s for a 1 h file. The gap depths take 7 ms. Reported, not worked around (spec, "Depth"). A worker is out of scope unless it is noticeable in the browser.
- **A gap's depth (Decision 18):** measured on `sample1.m4a`, all 33 gaps are 22.2 to 37.4 dB deep, so none is under 15 dB and nothing needs reporting. `sample3h.m4a`: 22.2 to 37.5 dB, 101 gaps. On f14 one gap is 8.9 dB (of 24), on f16 seven are under 15 dB (10.4 dB the lowest, of 36): these are the short-silence files, as the analysis said.
- **Real files, in the browser** (dev server, Chrome driven with `playwright-cli`): `sample1.m4a` shows "Find splits (33)", and a press gives 34 tracks; the node run with the same modules shows every gap middle kept, at the same times as before. f14 `quiet solitude` shows (27) and f16 `what it feels like to be alone (playlist)` shows (33). In node, f14's 24 gap middles become 21 (three double splits gone) and 6 dips are added (6:39.9, 11:22.9, 25:59.9, 30:42.9, 45:19.7 and 50:2.7, 21 to 29 dB); f16's 36 gaps become 29 and 4 dips are added.
- **Dip time:** a dip's split is at the middle of its deepest window, and of equal windows the earliest (spec, "Finding splits"). On a flat silence that is the start of the plateau, not its middle; the analysis found the median 0.8 s from the listed time.
- **The 15 s rule changed old fixtures.** Specs that used splits closer than 15 s now use `twoGaps` of 30 s (splits at 3.5 s and 26 s) or add the close splits by hand (`closeSplitsStore`). The e2e fixtures had silences 11 s apart, so `make-fixtures.sh` makes them 40 s long, with the silences at 9.5 s and 30.5 s, and the six fixtures were regenerated; `pnpm exec playwright test e2e/export.spec.ts` passes (15 tests).
- **One gap-vs-gap rule, as a walk in time:** of gaps within 15 s of each other the deepest stays (the earlier of equal depth). It is the same result as taking the deepest first, and needs no sort (the lint wants `toSorted`, which the TypeScript lib here lacks).
- **The depth is a constant for now** (`DEFAULT_DEPTH_DB`); ticket 03 makes it a setting.
- **Code review:** not run on this ticket. The goal puts code-review, the grouped fixes and the Final tier on the last ticket, so it covers the whole branch there. This ticket ran the Checkpoint tier: `pnpm test:changed`, `pnpm lint:changed`, `pnpm typecheck` and the whole `pnpm vitest run` (2304 passed).
