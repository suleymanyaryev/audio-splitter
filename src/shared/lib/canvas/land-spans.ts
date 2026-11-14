import { timeToX } from './time-axis.ts'

// DESIGN.md's Land Rule: a gap is never narrower than this in a whole-file view.
const MIN_LAND_WIDTH = 12

export interface LandGap {
  startSeconds: number
  endSeconds: number
  edge: 'lead-in' | 'run-out' | null
}

export interface LandSpan {
  left: number
  right: number
}

/*
The horizontal extent of every gap on a whole-file canvas. A 2 s gap in an hour is a pixel wide, so
one narrower than `MIN_LAND_WIDTH` widens around its middle (which is its split) to that width,
moved inwards only as far as the canvas edge needs. An edge gap has no split and grows away from its
edge: a lead-in from the left edge, a run-out from the right edge.

Widening can make neighbours overlap. The spans are returned as they are: lands are one flat
colour, so overlapping ones read as one band, and each split line still sits at its own time.
*/
export function landSpans(
  gaps: readonly LandGap[],
  durationSeconds: number,
  width: number,
): LandSpan[] {
  const spans: LandSpan[] = []
  for (const gap of gaps) {
    const left = timeToX(gap.startSeconds, durationSeconds, width)
    const right = timeToX(gap.endSeconds, durationSeconds, width)
    if (right - left >= MIN_LAND_WIDTH) {
      spans.push({ left, right })
    } else if (gap.edge === 'lead-in') {
      spans.push({ left: 0, right: MIN_LAND_WIDTH })
    } else if (gap.edge === 'run-out') {
      spans.push({ left: width - MIN_LAND_WIDTH, right: width })
    } else {
      const widenedLeft = Math.min(
        Math.max(0, (left + right) / 2 - MIN_LAND_WIDTH / 2),
        width - MIN_LAND_WIDTH,
      )
      spans.push({ left: widenedLeft, right: widenedLeft + MIN_LAND_WIDTH })
    }
  }
  return spans
}
