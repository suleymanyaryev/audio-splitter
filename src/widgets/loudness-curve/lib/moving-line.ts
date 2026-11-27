import { DEPTH_MAX_DB, DEPTH_MIN_DB, THRESHOLD_MIN_DB } from '@/entities/split/config/defaults.ts'
import { curveY, decibelsAt, isOnThresholdLine } from './threshold-line.ts'

/*
The moving line (docs/concepts/13-adaptive-threshold.md): at each pixel column, the loudness around
minus the depth. It is the fixed threshold line's counterpart, a line that follows the music. Drawn
dashed in `ink`, and dragged up or down to change the depth.
*/

// The column of a pointer at `x` over `columnCount` columns, kept inside them.
export function columnAt(x: number, columnCount: number): number {
  return Math.min(Math.max(Math.floor(x), 0), columnCount - 1)
}

/*
The loudness around, one value per pixel column, at the column's middle. The curve is far longer
than the canvas is wide, and the loudness around changes slowly, so a sample of it is enough.
*/
export function aroundByColumn(around: Float32Array, columnCount: number): Float32Array {
  const columns = new Float32Array(columnCount)
  if (around.length === 0) return columns
  for (let column = 0; column < columnCount; column++) {
    const index = Math.floor(((column + 0.5) / columnCount) * around.length)
    columns[column] = around[Math.min(index, around.length - 1)] ?? 0
  }
  return columns
}

// The line's level at each column: the loudness around less the depth, in dB.
export function movingLineColumns(
  around: Float32Array,
  depth: number,
  columnCount: number,
): Float32Array {
  return aroundByColumn(around, columnCount).map((decibels) => decibels - depth)
}

/*
Whether any of the line is on the panel: a column under the −60 dB floor is left out, so a line
wholly under it is not drawn at all.
*/
export function isOnPanel(decibels: number): boolean {
  return decibels >= THRESHOLD_MIN_DB
}

// Whether a pointer is within reach of the line at its own column (a column off the panel never is).
export function isOnMovingLine(
  pointerX: number,
  pointerY: number,
  line: Float32Array,
  height: number,
): boolean {
  if (line.length === 0) return false
  const decibels = line[columnAt(pointerX, line.length)] ?? THRESHOLD_MIN_DB - 1
  return isOnPanel(decibels) && isOnThresholdLine(pointerY, curveY(decibels, height))
}

/*
The depth a drag sets: the line at the column where it was grabbed follows the pointer, less the
distance at which it was grabbed. So the depth is the loudness around there minus the loudness
under the pointer, in tenths of a dB as the slider's step, held to the slider's range.
*/
export function depthFromPointer(
  aroundAtGrab: number,
  pointerY: number,
  grabOffset: number,
  height: number,
): number {
  const depth = Math.round((aroundAtGrab - decibelsAt(pointerY - grabOffset, height)) * 10) / 10
  return Math.min(Math.max(depth, DEPTH_MIN_DB), DEPTH_MAX_DB)
}
