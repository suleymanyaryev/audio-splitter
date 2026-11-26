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
