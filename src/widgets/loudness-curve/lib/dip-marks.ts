import { timeToX } from '@/shared/lib/canvas/time-axis.ts'
import { columnAt } from './moving-line.ts'
import { curveY } from './threshold-line.ts'

// DESIGN.md: a dip mark is an 8 px diamond, ringed 1.5 px wide.
export const DIP_MARK_SIZE = 8
export const DIP_MARK_OUTLINE_WIDTH = 1.5

export interface DipMark {
  x: number
  y: number
}

/*
Where each dip that would propose a split is marked: on the curve, at the dip's time. `columns` are
the curve's merged pixel columns, as drawn, so the mark sits on the line and not beside it.
*/
export function dipMarks(
  seconds: readonly number[],
  durationSeconds: number,
  columns: Float32Array,
  width: number,
  height: number,
): DipMark[] {
  if (columns.length === 0) return []
  return seconds.map((time) => {
    const x = timeToX(time, durationSeconds, width)
    return { x, y: curveY(columns[columnAt(x, columns.length)] ?? 0, height) }
  })
}
