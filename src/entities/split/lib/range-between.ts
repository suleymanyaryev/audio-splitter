import { MAXIMUM_RANGE_SECONDS, MINIMUM_RANGE_SECONDS } from '../config/range-limits.ts'

export interface TimeRange {
  startSeconds: number
  endSeconds: number
}

// A range of exactly the minimum can sit an ulp under it after the pixel maths.
const LIMIT_TOLERANCE = 1e-9

/*
The range a drag from `anchorSeconds` (where the press began) to `pointerSeconds` makes. It is held
to the file's start and end and to 10 min from the anchor, whichever way the drag goes, and it is
null under 1 s: that is a click. The whole-file view draws it live from this, and the split store
holds the one it returns, so the overlay and the range never disagree.
*/
export function rangeBetween(
  anchorSeconds: number,
  pointerSeconds: number,
  durationSeconds: number,
): TimeRange | null {
  const anchor = Math.min(Math.max(anchorSeconds, 0), durationSeconds)
  const lowest = Math.max(0, anchor - MAXIMUM_RANGE_SECONDS)
  const highest = Math.min(durationSeconds, anchor + MAXIMUM_RANGE_SECONDS)
  const pointer = Math.min(Math.max(pointerSeconds, lowest), highest)
  const startSeconds = Math.min(anchor, pointer)
  const endSeconds = Math.max(anchor, pointer)
  return endSeconds - startSeconds < MINIMUM_RANGE_SECONDS - LIMIT_TOLERANCE
    ? null
    : { startSeconds, endSeconds }
}
