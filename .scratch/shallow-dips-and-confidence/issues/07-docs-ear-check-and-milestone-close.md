# 07: Docs, the ear check and closing the milestone

**What to build:** the docs that describe the app as it now is, and the by-ear check that the bands mean what they say, then the milestone's close.

**Blocked by:** 03, 04, 06.

**Status:** ready-for-agent

Spec: Implementation Decisions "Docs that this changes"; Testing Decisions "By ear, in the browser"; Further Notes. Run the `finish-feature` skill for the doc sync.

- [ ] `docs/architecture.md`: the split store's row (confidence, the depth setting, proposals) and the Find splits flow.
- [ ] `README.md`: the "What it does" line for finding gaps becomes finding splits.
- [ ] Concept note 13's "Where it lives in the code" section is filled in.
- [ ] By ear, with the user: `sample1.m4a` gives its 33 splits, all sure; f14 and f16 gain their short-silence boundaries without double splits.
- [ ] By ear, with the user: the 22 dips of 15 dB and more in `sample-crossfade.mp3`, heard one by one, each called a track change or not. The result goes into `analysis.md`; if it moves the 15 and 9 dB cut-offs, the config, its comment and note 13 change with it.
- [ ] The Final checks of `AGENTS.md` pass: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [ ] The milestone entry and issue #16's acceptance criteria are checked against what was built, and the user confirms the milestone.
