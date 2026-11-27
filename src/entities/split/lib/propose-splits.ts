import type { ContrastPeak } from '@/shared/lib/audio/contrast.ts'
import { CONTRAST_AGREEMENT_SECONDS } from '../config/confidence-bands.ts'
import {
  BOUNDARY_SPACING_SECONDS,
  CONTRAST_ROOM_SECONDS,
  LIMIT_TOLERANCE,
  MINIMUM_DISTANCE_SECONDS,
} from '../config/split-room.ts'
import type { Dip } from './find-dips.ts'
import type { Gap } from './find-gaps.ts'

/*
A gap or a dip, with how deep the boundary is, in dB. A dip with a contrast peak beside it carries
that peak's contrast, which is how the two agreeing is known (a gap never does).
*/
type DepthProposal = { seconds: number; kind: 'gap' | 'dip'; depth: number; contrast?: number }
// Which detector proposed a split: a gap or a dip, or a contrast peak (with its contrast, in dB).
export type Proposal = DepthProposal | { seconds: number; kind: 'contrast'; contrast: number }

// A gap and its depth, in dB (GLOSSARY.md: Depth).
interface MeasuredGap extends Gap {
  depth: number
}

export interface ProposalInput {
  gaps: MeasuredGap[]
  dips: Dip[]
  // The contrast peaks that reach the contrast threshold: none while contrast is off.
  contrastPeaks?: ContrastPeak[]
  splitSeconds: number[]
  durationSeconds: number
}

// Whether two times are a boundary's width apart, so that both can have a split.
function areApart(first: number, second: number, spacing: number) {
  return Math.abs(first - second) >= spacing - LIMIT_TOLERANCE
}

const middleOf = (gap: Gap) => (gap.startSeconds + gap.endSeconds) / 2

// The contrast peak nearest this time, if one is within 5 s of it.
function nearestPeak(peaks: ContrastPeak[], seconds: number) {
  let nearest: ContrastPeak | null = null
  for (const peak of peaks) {
    const distance = Math.abs(peak.seconds - seconds)
    if (
      distance <= CONTRAST_AGREEMENT_SECONDS + LIMIT_TOLERANCE &&
      (nearest === null || distance < Math.abs(nearest.seconds - seconds))
    ) {
      nearest = peak
    }
  }
  return nearest
}

/*
The splits Find splits would add, in time order. Three detectors propose, and a boundary gets one
split (docs/concepts/13-adaptive-threshold.md, docs/concepts/15-contrast.md):

1. Each gap that has a track on both sides and holds no split proposes its middle, as Find gaps
   did, with the gap's depth.
2. Of gap proposals within 15 s of each other, the deepest gap's stays; at equal depth, the earlier one.
3. A dip within 15 s of a gap proposal is dropped, and one within 15 s of the middle of a gap that
   holds a split: that gap is the boundary, wherever in it the split is. The other dips propose
   their own time.
4. A proposal within 15 s of a split that exists is dropped, and one within 1 s of the file's ends.
5. A dip with a contrast peak within 5 s carries that peak's contrast: the two agree.
6. A contrast peak proposes its time, unless a gap or dip proposal that stands, the middle of a gap
   that holds a split or a split that exists is within 60 s. Contrast peaks are 15 s apart already.
*/
export function proposeSplits(input: ProposalInput): Proposal[] {
  const { gaps, dips, contrastPeaks = [], splitSeconds, durationSeconds } = input
  const holdsSplit = (gap: Gap) =>
    splitSeconds.some((seconds) => seconds >= gap.startSeconds && seconds <= gap.endSeconds)
  const innerGaps = gaps.filter((gap) => gap.edge === null)

  /*
  Walking in time, a gap within 15 s of the last one kept takes its place when it is deeper, and
  is dropped otherwise (so of equal depth the earlier stays). The one it replaces was 15 s or more
  from the one before, and the new one is further still, so it needs no second look.
  */
  const kept: DepthProposal[] = []
  for (const gap of innerGaps) {
    if (holdsSplit(gap)) continue
    const proposal: DepthProposal = { seconds: middleOf(gap), depth: gap.depth, kind: 'gap' }
    const last = kept.at(-1)
    if (last === undefined || areApart(last.seconds, proposal.seconds, BOUNDARY_SPACING_SECONDS)) {
      kept.push(proposal)
    } else if (proposal.depth > last.depth) {
      kept[kept.length - 1] = proposal
    }
  }

  const heldMiddles = innerGaps.filter((gap) => holdsSplit(gap)).map((gap) => middleOf(gap))
  const boundaries = [...kept.map((proposal) => proposal.seconds), ...heldMiddles]
  const dipsAway = dips
    .filter((dip) =>
      boundaries.every((seconds) => areApart(seconds, dip.seconds, BOUNDARY_SPACING_SECONDS)),
    )
    .map(({ seconds, depth }): DepthProposal => {
      const agreeing = nearestPeak(contrastPeaks, seconds)
      return agreeing === null
        ? { seconds, depth, kind: 'dip' }
        : { seconds, depth, kind: 'dip', contrast: agreeing.contrast }
    })

  const proposals = [...kept, ...dipsAway]
  proposals.sort((first, second) => first.seconds - second.seconds)
  const standing = proposals.filter(
    ({ seconds }) =>
      areApart(seconds, 0, MINIMUM_DISTANCE_SECONDS) &&
      areApart(seconds, durationSeconds, MINIMUM_DISTANCE_SECONDS) &&
      splitSeconds.every((split) => areApart(split, seconds, BOUNDARY_SPACING_SECONDS)),
  )

  const roomAround = [...standing.map(({ seconds }) => seconds), ...heldMiddles, ...splitSeconds]
  const contrasts = contrastPeaks
    .filter(
      ({ seconds }) =>
        areApart(seconds, 0, MINIMUM_DISTANCE_SECONDS) &&
        areApart(seconds, durationSeconds, MINIMUM_DISTANCE_SECONDS) &&
        roomAround.every((other) => areApart(other, seconds, CONTRAST_ROOM_SECONDS)),
    )
    .map(({ seconds, contrast }): Proposal => ({ seconds, contrast, kind: 'contrast' }))
  const all: Proposal[] = [...standing, ...contrasts]
  all.sort((first, second) => first.seconds - second.seconds)
  return all
}
