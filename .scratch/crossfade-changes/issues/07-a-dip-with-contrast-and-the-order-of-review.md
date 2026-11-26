# 07: A dip with contrast is surer, and the order of review

**What to build:** while contrast is on, a dip with a contrast peak within 5 s goes up one band, and its tooltip shows both its depth and its contrast; a gap is never lifted. `{` and `}` go through every split with a confidence, doubtful first, then likely, then sure, with contrast splits first within a band.

**Blocked by:** 04.

**Status:** ready-for-agent

Spec: `.scratch/crossfade-changes/spec.md`, user stories 42 to 45 and 47 to 50; Implementation Decisions "Proposals" (the lift) and "The split store" (the confidence order).

- [ ] The lift: while contrast is on, a dip proposal with a contrast peak at or over the threshold within 5 s goes up one band (doubtful to likely, likely to sure). Never a gap; nothing changes while contrast is off.
- [ ] A lifted dip's confidence keeps its depth and its contrast; the tooltip shows both.
- [ ] The order: by band (doubtful, likely, sure); within a band, contrast splits first, least contrast first, then the others, least deep first; ties by time. With no contrast split, it is exactly today's order.
- [ ] Store specs: lifted with a peak 5 s away, not 6 s, not while off, never a gap; the order across bands and kinds, and today's order with no contrast split.
- [ ] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [ ] `CHANGELOG.md` gains its line under Unreleased.
