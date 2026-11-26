import { CONTRAST_MAX_DB, CONTRAST_MIN_DB } from '@/entities/split/config/defaults.ts'
import { timeToX } from '@/shared/lib/canvas/time-axis.ts'
import { columnAt } from './moving-line.ts'
import { CURVE_LINE_WIDTH } from './threshold-line.ts'

/*
The contrast lane's scale runs from 0 dB at the bottom edge to this at the top, above the contrast
threshold slider's top (12 dB) so its line has room over it. A higher peak sits on the top edge.
*/
export const CONTRAST_TOP_DB = 15

// Where a contrast is drawn on a lane `height` pixels tall, inset by half the line width as the
// loudness curve is, so a value at either end of the scale is not cut off by the canvas edge.
export function contrastY(contrast: number, height: number): number {
  const fraction = Math.min(1, Math.max(0, contrast / CONTRAST_TOP_DB))
  const drawn = height - CURVE_LINE_WIDTH
  return CURVE_LINE_WIDTH / 2 + (1 - fraction) * drawn
}

// The contrast at a vertical pixel of the lane, the inverse of `contrastY`, held to the scale.
function contrastAt(y: number, height: number): number {
  const drawn = height - CURVE_LINE_WIDTH
  const fraction = Math.min(1, Math.max(0, (y - CURVE_LINE_WIDTH / 2) / drawn))
  return (1 - fraction) * CONTRAST_TOP_DB
}

/*
The contrast threshold a drag sets: where the pointer is, less the distance at which it grabbed the
line (so the line does not jump under the pointer), in whole tenths of a dB as the slider's step and
inside the slider's range, 3 to 12 dB.
*/
export function contrastThresholdFromPointer(
  pointerY: number,
  grabOffset: number,
  height: number,
): number {
  const tenths = Math.round(contrastAt(pointerY - grabOffset, height) * 10) / 10
  return Math.min(Math.max(tenths, CONTRAST_MIN_DB), CONTRAST_MAX_DB)
}

export interface ContrastMark {
  x: number
  y: number
}

/*
Where each contrast peak that would propose a split is marked: on the curve, at the peak's time.
`columns` are the lane's merged pixel columns, as drawn, so the mark sits on the line and not beside it.
*/
export function contrastMarks(
  seconds: readonly number[],
  durationSeconds: number,
  columns: Float32Array,
  width: number,
  height: number,
): ContrastMark[] {
  if (columns.length === 0) return []
  return seconds.map((time) => {
    const x = timeToX(time, durationSeconds, width)
    return { x, y: contrastY(columns[columnAt(x, columns.length)] ?? 0, height) }
  })
}
