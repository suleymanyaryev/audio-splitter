import type { TimeRange } from '@/entities/split/lib/range-between.ts'

/*
The range as the window the zoom helpers already draw: the Range view maps the range onto the
whole canvas exactly as the zoom view maps its 20 s, so `zoomBars`, `landSpansInWindow` and
`zoomTimeToX` take this centre and length.
*/
export function rangeWindow(range: TimeRange) {
  return {
    centreSeconds: (range.startSeconds + range.endSeconds) / 2,
    windowSeconds: range.endSeconds - range.startSeconds,
  }
}
