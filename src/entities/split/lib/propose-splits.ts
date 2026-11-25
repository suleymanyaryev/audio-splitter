import {
  BOUNDARY_SPACING_SECONDS,
  LIMIT_TOLERANCE,
  MINIMUM_DISTANCE_SECONDS,
} from '../config/split-room.ts'
import type { Dip } from './find-dips.ts'
import type { Gap } from './find-gaps.ts'

export interface Proposal {
  seconds: number
  // How deep the boundary is, in dB: the gap's depth, or the dip's.
  depth: number
  // Which detector proposed it: the middle of a gap, or the deepest point of a dip.
  kind: 'gap' | 'dip'
}

// A gap and its depth, in dB (GLOSSARY.md: Depth).
interface MeasuredGap extends Gap {
  depth: number
}

export interface ProposalInput {
  gaps: MeasuredGap[]
  dips: Dip[]
  splitSeconds: number[]
  durationSeconds: number
}

// Whether two times are a boundary's width apart, so that both can have a split.
function areApart(first: number, second: number, spacing: number) {
  return Math.abs(first - second) >= spacing - LIMIT_TOLERANCE
}

const middleOf = (gap: Gap) => (gap.startSeconds + gap.endSeconds) / 2

/*
The splits Find splits would add, in time order. Two detectors propose, and a boundary gets one split
(concept note 13):

1. Each gap that has a track on both sides and holds no split proposes its middle, as Find gaps
   did, with the gap's depth.
2. Of gap proposals within 15 s of each other, the deepest gap's stays; at equal depth, the earlier one.
3. A dip within 15 s of a gap proposal is dropped, and one within 15 s of the middle of a gap that
   holds a split: that gap is the boundary, wherever in it the split is. The other dips propose
   their own time.
4. A proposal within 15 s of a split that exists is dropped, and one within 1 s of the file's ends.
*/
export function proposeSplits(input: ProposalInput): Proposal[] {
  const { gaps, dips, splitSeconds, durationSeconds } = input
  const holdsSplit = (gap: Gap) =>
    splitSeconds.some((seconds) => seconds >= gap.startSeconds && seconds <= gap.endSeconds)
  const innerGaps = gaps.filter((gap) => gap.edge === null)

  /*
  Walking in time, a gap within 15 s of the last one kept takes its place when it is deeper, and
  is dropped otherwise (so of equal depth the earlier stays). The one it replaces was 15 s or more
  from the one before, and the new one is further still, so it needs no second look.
  */
  const kept: Proposal[] = []
  for (const gap of innerGaps) {
    if (holdsSplit(gap)) continue
    const proposal: Proposal = { seconds: middleOf(gap), depth: gap.depth, kind: 'gap' }
    const last = kept.at(-1)
    if (last === undefined || areApart(last.seconds, proposal.seconds, BOUNDARY_SPACING_SECONDS)) {
      kept.push(proposal)
    } else if (proposal.depth > last.depth) {
      kept[kept.length - 1] = proposal
    }
  }

  const boundaries = [
    ...kept.map((proposal) => proposal.seconds),
    ...innerGaps.filter((gap) => holdsSplit(gap)).map((gap) => middleOf(gap)),
  ]
  const dipsAway = dips
    .filter((dip) =>
      boundaries.every((seconds) => areApart(seconds, dip.seconds, BOUNDARY_SPACING_SECONDS)),
    )
    .map(({ seconds, depth }): Proposal => ({ seconds, depth, kind: 'dip' }))

  const proposals = [...kept, ...dipsAway]
  proposals.sort((first, second) => first.seconds - second.seconds)
  return proposals.filter(
    ({ seconds }) =>
      areApart(seconds, 0, MINIMUM_DISTANCE_SECONDS) &&
      areApart(seconds, durationSeconds, MINIMUM_DISTANCE_SECONDS) &&
      splitSeconds.every((split) => areApart(split, seconds, BOUNDARY_SPACING_SECONDS)),
  )
}
