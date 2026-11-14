import type { LandSpan } from './land-spans.ts'

// DESIGN.md: split lines are 1.5 px wide.
export const SPLIT_LINE_WIDTH = 1.5

/*
Lands (one flat colour each) over the vertical extent `top` to `top + height`. Overlapping spans
paint over each other, so they read as one band.
*/
export function drawLands(
  context: CanvasRenderingContext2D,
  spans: readonly LandSpan[],
  color: string,
  top: number,
  height: number,
) {
  context.fillStyle = color
  for (const { left, right } of spans) {
    context.fillRect(left, top, right - left, height)
  }
}

// One split line centred on each x, over the same kind of vertical extent.
export function drawSplitLines(
  context: CanvasRenderingContext2D,
  xs: readonly number[],
  color: string,
  top: number,
  height: number,
) {
  context.fillStyle = color
  for (const x of xs) {
    context.fillRect(x - SPLIT_LINE_WIDTH / 2, top, SPLIT_LINE_WIDTH, height)
  }
}
