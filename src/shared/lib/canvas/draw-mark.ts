import { DASH_PATTERN } from './dash-pattern.ts'

// DESIGN.md: the mark is one CSS pixel of dashed ink.
const MARK_WIDTH = 1

/*
The mark (GLOSSARY.md): a dashed line over the canvas's height, never mistaken for a split line or
the playhead. Snapped to the middle of a whole CSS pixel, so the line is not smeared over two.
*/
export function drawMark(
  context: CanvasRenderingContext2D,
  x: number,
  color: string,
  height: number,
) {
  const snapped = Math.round(x - MARK_WIDTH / 2) + MARK_WIDTH / 2
  context.strokeStyle = color
  context.lineWidth = MARK_WIDTH
  context.setLineDash(DASH_PATTERN)
  context.beginPath()
  context.moveTo(snapped, 0)
  context.lineTo(snapped, height)
  context.stroke()
  context.setLineDash([])
}
