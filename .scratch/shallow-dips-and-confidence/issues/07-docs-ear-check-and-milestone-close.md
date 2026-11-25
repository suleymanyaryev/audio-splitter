# 07: Docs, the ear check and closing the milestone

**What to build:** the docs that describe the app as it now is, and the by-ear check that the bands mean what they say, then the milestone's close.

**Blocked by:** 03, 04, 06.

**Status:** ready-for-agent

Spec: Implementation Decisions "Docs that this changes"; Testing Decisions "By ear, in the browser"; Further Notes. Run the `finish-feature` skill for the doc sync.

- [x] `docs/architecture.md`: the split store's row (confidence, the depth setting, proposals) and the Find splits flow.
- [x] `README.md`: the "What it does" line for finding gaps becomes finding splits.
- [x] Concept note 13's "Where it lives in the code" section is filled in.
- [ ] By ear, with the user: `sample1.m4a` gives its 33 splits, all sure; f14 and f16 gain their short-silence boundaries without double splits.
- [ ] By ear, with the user: the 22 dips of 15 dB and more in `sample-crossfade.mp3`, heard one by one, each called a track change or not. The result goes into `analysis.md`; if it moves the 15 and 9 dB cut-offs, the config, its comment and note 13 change with it.
- [x] The Final checks of `AGENTS.md` pass: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [ ] The milestone entry and issue #16's acceptance criteria are checked against what was built, and the user confirms the milestone.

## Comments

- **Done by the agent:** the docs (architecture row and its Find splits sentence, the README line and the note list, note 13's "Where it lives in the code"), the code review and its fixes, and the Final tier.
- **Waiting on the user (by ear, and the milestone's confirmation):** the `sample1.m4a` check (33 splits, all sure), f14 and f16 (the sample set here has no f14 or f16 file, only `sample1*`, `sample1-shuffled.m4a`, `sample3h.*` and `sample-crossfade.*`), the 22 dips of 15 dB and more in `sample-crossfade.mp3`, heard one by one, and the milestone entry and issue #16's acceptance criteria. A result that moves the 15 and 9 dB cut-offs changes `confidence-bands.ts`, its comment and note 13, and the Final tier runs again after it.
- **Code review (since 6075216, two axes) and what was done with it.** Fixed: stale comments (the marks' size, "two settings", "Depth setting" → "Depth"), a shadowed `depth` in `findSplits`, the five canvas calls of `drawConfidenceMarks` made one short call each (the function reads the colours and the band itself), `columnAt` reused in the depth drag, the `SplitZoom.vue` header, a feature bullet taken out of `docs/architecture.md`, and `{` and `}` now leave the key to the browser when the walk goes nowhere (as `[` and `]` do). Left, with reasons:
  - `gaps` and `gapDepths` as parallel arrays: the gap type is shared with the whole-file view and the depth is the store's derived data, so moving it onto `Gap` touches every gap consumer for no behaviour.
  - `confidenceQueue` and `inTimeOrder` without `Array#sort`: lint forbids `sort` and `toSorted` is outside the specs' TS lib (see ticket 06).
  - The colour of the moving line (`ink`, no new token), `gapSplitTimes` folded into `propose-splits.ts`, and `buildDepth` called from the split store's `open()` rather than the source-file entity (the source-file store cannot be read by `split`, and the split store holds the curve): all decisions in tickets 02 and 04.
  - A chain of gap proposals within 15 s (A–B–C) keeps the deeper of each neighbouring pair as the walk meets them; the spec gives the rule for pairs only.
  - A split checked and then moved counts two edits: two things the user did.
  - The six regenerated e2e fixtures: the 15 s boundary spacing needed boundaries further apart (ticket 02).
- **Final tier:** `pnpm verify` (2379 tests, build) -> pass; `pnpm lint` -> pass (after a cognitive-complexity fix in `SplitZoom.vue`); `pnpm knip` -> pass (after un-exporting two constants in `depth.ts`); `pnpm depcruise` -> pass.
