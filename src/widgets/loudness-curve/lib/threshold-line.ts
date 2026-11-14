import { decibelsToY, yToDecibels } from './decibels-to-y.ts'

// DESIGN.md: the curve is a 1.5 px line.
export const CURVE_LINE_WIDTH = 1.5

/*
The curve is inset by half its line width, so a window at 0 dB or at the floor is not half cut
off by the canvas edge. The threshold line uses the same mapping, so a window exactly at the
threshold sits on the line.
*/
const INSET = CURVE_LINE_WIDTH / 2

// How far from the line, in pixels, a pointer still grabs it.
const HIT_DISTANCE = 6

// DESIGN.md: the label's plate is 17 px tall and the handle 18 × 10 px.
export const LABEL_PLATE_HEIGHT = 17
export const HANDLE_WIDTH = 18
export const HANDLE_HEIGHT = 10

// Where a loudness value is drawn on a canvas `height` pixels tall.
export function curveY(decibels: number, height: number): number {
  return INSET + decibelsToY(decibels, height - CURVE_LINE_WIDTH)
}

// The loudness at a vertical pixel of the same canvas.
export function decibelsAt(y: number, height: number): number {
  return yToDecibels(y - INSET, height - CURVE_LINE_WIDTH)
}

// Whether a pointer at `pointerY` is close enough to the line at `lineY` to grab it.
export function isOnThresholdLine(pointerY: number, lineY: number): boolean {
  return Math.abs(pointerY - lineY) <= HIT_DISTANCE
}

/*
The threshold a drag sets: where the pointer is, less the distance at which it grabbed the line
(so the line does not jump under the pointer), in whole tenths of a dB as the Slider's step.
Always inside the drawn range.
*/
export function thresholdFromPointer(pointerY: number, grabOffset: number, height: number): number {
  const decibels = decibelsAt(pointerY - grabOffset, height)
  // `|| 0` turns a −0 from rounding a hair under zero into 0.
  return Math.round(decibels * 10) / 10 || 0
}

// Top of the label's plate: above the line, or below it when the line is too close to the top edge.
export function labelPlateTop(lineY: number): number {
  const above = lineY - LABEL_PLATE_HEIGHT - 2
  return above >= 0 ? above : lineY + 2
}

// Top of the handle: centred on the line, kept inside the canvas where the line is at an edge.
export function handleTop(lineY: number, height: number): number {
  return Math.min(Math.max(0, lineY - HANDLE_HEIGHT / 2), height - HANDLE_HEIGHT)
}
