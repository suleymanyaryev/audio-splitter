# 07: A dip with contrast is surer, and the order of review

**What to build:** while contrast is on, a dip with a contrast peak within 5 s goes up one band, and its tooltip shows both its depth and its contrast; a gap is never lifted. `{` and `}` go through every split with a confidence, doubtful first, then likely, then sure, with contrast splits first within a band.

**Blocked by:** 04.

**Status:** resolved

Spec: `.scratch/crossfade-changes/spec.md`, user stories 42 to 45 and 47 to 50; Implementation Decisions "Proposals" (the lift) and "The split store" (the confidence order).

- [x] The lift: while contrast is on, a dip proposal with a contrast peak at or over the threshold within 5 s goes up one band (doubtful to likely, likely to sure). Never a gap; nothing changes while contrast is off.
- [x] A lifted dip's confidence keeps its depth and its contrast; the tooltip shows both.
- [x] The order: by band (doubtful, likely, sure); within a band, contrast splits first, least contrast first, then the others, least deep first; ties by time. With no contrast split, it is exactly today's order.
- [x] Store specs: lifted with a peak 5 s away, not 6 s, not while off, never a gap; the order across bands and kinds, and today's order with no contrast split.
- [x] Checks: the Task tier after each loop, the Checkpoint tier at the end.
- [x] `CHANGELOG.md` gains its line under Unreleased.

## Comments

- A dip proposal carries the contrast of the nearest peak within 5 s (`contrast`, absent otherwise); `confidenceOf` lifts its band by one. The peaks it reads are the ones at or over the threshold, and none exist while contrast is off. "Within 5 s" includes exactly 5 s (to the tolerance of `LIMIT_TOLERANCE`); the store specs bracket it at 4.975 s and 5.975 s, since a peak lies on the 0.5 s grid and a dip on the 50 ms one.
- A "contrast split" for the order is one with no depth (proposed by contrast alone). A lifted dip has both measures and is ordered with the other dips, by its depth, in its lifted band.
- A dip lifted to sure shows no mark or tooltip, as for any sure split: the track list and the canvases show likely and doubtful only (DESIGN.md "Confidence mark").
- The order's specs set a split's confidence directly (as `TrackView.spec.ts` does) rather than building audio for every combination; the lift's specs go through real files.
- The cut-off for the 5 s agreement sits in `config/confidence-bands.ts` with the other confidence values.
