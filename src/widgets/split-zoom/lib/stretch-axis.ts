import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { draggedTime } from './dragged-time.ts'
import { rangeWindow } from './range-window.ts'

/*
The map of a stretch, the range or a track, onto the canvas that shows all of it. `toX` and
`toSeconds` are each other's inverse, except that `toSeconds` rounds to 10 ms as a dragged split
does, so a mark, a split or a seek made from a click lands on the same grid. `centreSeconds` and
`windowSeconds` are what the zoom helpers (`zoomBars`, `landSpansInWindow`) take. A view builds it
when it needs it, from the player's extent and the frame's width then, so a resize is always seen.
*/
export function stretchAxis(extent: TimeRange, width: number): StretchAxis
// With nothing on show there is no axis.
export function stretchAxis(extent: TimeRange | null, width: number): StretchAxis | null
export function stretchAxis(extent: TimeRange | null, width: number): StretchAxis | null {
  if (extent === null) return null
  const { centreSeconds, windowSeconds } = rangeWindow(extent)
  return {
    centreSeconds,
    windowSeconds,
    toX: (seconds) => zoomTimeToX(seconds, centreSeconds, windowSeconds, width),
    toSeconds: (x) => draggedTime(x, 0, centreSeconds, windowSeconds, width),
  }
}

export interface StretchAxis {
  centreSeconds: number
  windowSeconds: number
  toX: (seconds: number) => number
  toSeconds: (x: number) => number
}
