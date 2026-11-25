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
}

export interface ProposalInput {
  gaps: Gap[]
  // The depth of each gap, in the gaps' order.
  gapDepths: number[]
  dips: Dip[]
  splitSeconds: number[]
  durationSeconds: number
}

// Whether two times are a boundary's width apart, so that both can have a split.
function areApart(first: number, second: number, spacing: number) {
  return Math.abs(first - second) >= spacing - LIMIT_TOLERANCE
}

/*
The splits Find splits would add, in time order. Two detectors propose, and a boundary gets one split
(concept note 13):

1. Each gap that has a track on both sides and holds no split proposes its middle, as Find gaps
   did, with the gap's depth.
2. Of gap proposals within 15 s of each other, the deepest gap's stays; at equal depth, the earlier one.
3. A dip within 15 s of a gap proposal is dropped. The other dips propose their own time.
4. A proposal within 15 s of a split that exists is dropped, and one within 1 s of the file's ends.
*/
export function proposeSplits(input: ProposalInput): Proposal[] {
  const { gaps, gapDepths, dips, splitSeconds, durationSeconds } = input

  // In time order, as the gaps are.
  const candidates = gaps
    .map((gap, index) => ({
      gap,
      seconds: (gap.startSeconds + gap.endSeconds) / 2,
      depth: gapDepths[index] ?? 0,
    }))
    .filter(
      ({ gap }) =>
        gap.edge === null &&
        splitSeconds.every((seconds) => seconds < gap.startSeconds || seconds > gap.endSeconds),
    )

  /*
  Walking in time, a gap within 15 s of the last one kept takes its place when it is deeper, and
  is dropped otherwise (so of equal depth the earlier stays). The one it replaces was 15 s or more
  from the one before, and the new one is further still, so it needs no second look.
  */
  const kept: Proposal[] = []
  for (const { seconds, depth } of candidates) {
    const last = kept.at(-1)
    if (last === undefined || areApart(last.seconds, seconds, BOUNDARY_SPACING_SECONDS)) {
      kept.push({ seconds, depth })
    } else if (depth > last.depth) {
      kept[kept.length - 1] = { seconds, depth }
    }
  }
  const dipsAway = dips.filter((dip) =>
    kept.every((other) => areApart(other.seconds, dip.seconds, BOUNDARY_SPACING_SECONDS)),
  )

  return inTimeOrder(kept, dipsAway).filter(
    ({ seconds }) =>
      areApart(seconds, 0, MINIMUM_DISTANCE_SECONDS) &&
      areApart(seconds, durationSeconds, MINIMUM_DISTANCE_SECONDS) &&
      splitSeconds.every((split) => areApart(split, seconds, BOUNDARY_SPACING_SECONDS)),
  )
}

// Two lists that are each in time order, merged into one.
function inTimeOrder(first: Proposal[], second: Proposal[]) {
  const merged: Proposal[] = []
  let firstAt = 0
  let secondAt = 0
  while (firstAt < first.length || secondAt < second.length) {
    const next = first[firstAt]
    const other = second[secondAt]
    if (other === undefined || (next !== undefined && next.seconds <= other.seconds)) {
      if (next !== undefined) merged.push(next)
      firstAt++
    } else {
      merged.push(other)
      secondAt++
    }
  }
  return merged
}
