# 02: Find splits finds short silences, one split per boundary

**What to build:** "Find gaps" becomes "Find splits (N)". A press proposes a split at every gap, as today, and at every dip at least 15 dB deep, so the short silences between tracks that the minimum gap length drops become splits. Proposals within 15 s of each other give one split, so a short sound inside a gap no longer makes a 5 s track. The depth is fixed at 15 dB here; ticket 03 adds its slider.

**Blocked by:** 01 (the concept note is confirmed).

**Status:** ready-for-agent

Spec: `.scratch/shallow-dips-and-confidence/spec.md`, user stories 1 to 13 and 42 to 43; Implementation Decisions "Depth", "Finding splits" and the store's `findSplits` and preview.

- [ ] The depth maths is a hand-written pure module beside the median and the loudness builder: the smoothed level, the loudness around, depth per window, and a gap's depth against the 20 s on either side. Its spec has the hand-checkable cases the spec lists.
- [ ] The smoothed level and the loudness around are computed once per source file and kept; the time on `sample3h.m4a` is measured and reported in the ticket's comments.
- [ ] Dips: the deepest window within ±15 s with depth ≥ 15 dB, never in the first or last 10 s.
- [ ] Proposals: gap middles as today; of two gaps within 15 s the deeper one's middle; a dip within 15 s of a gap proposal dropped; nothing within 15 s of an existing split; the 1 s room from the file's ends kept.
- [ ] The store's `findSplits` replaces `addGapSplits`, with the same question about pending splits; the button reads "Find splits (N)".
- [ ] Store specs cover: a short silence becomes a split, a shallow passage doesn't, a long silence splits at its middle, a gap and a dip give one split, two gaps around a short sound give one, nothing near an existing split or in the file's first or last 10 s.
- [ ] In the browser: `sample1.m4a` at the defaults gives its 33 splits at the same times; f14 (`quiet solitude`) and f16 (`what it feels like to be alone`) gain the short-silence boundaries the analysis lists and lose their double splits.
- [ ] If a gap's depth puts any of `sample1.m4a`'s 33 splits under 15 dB, that is reported before going on (spec, Further Notes).
- [ ] `CHANGELOG.md` gains its line under Unreleased; `GLOSSARY.md` already says Find splits.
