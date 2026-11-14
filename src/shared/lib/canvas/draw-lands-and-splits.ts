import type { LandSpan } from './land-spans.ts'

// DESIGN.md: split lines are 1.5 px wide.
export const SPLIT_LINE_WIDTH = 1.5
// DESIGN.md: the selected split is 3 px wide.
export const SELECTED_SPLIT_LINE_WIDTH = 3

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

/*
One split line centred on each x, over the same kind of vertical extent. The line at index
`selectedIndex`, if any (null is none), is drawn wider.
*/
export function drawSplitLines(
  context: CanvasRenderingContext2D,
  xs: readonly number[],
  color: string,
  top: number,
  height: number,
  selectedIndex: number | null = null,
) {
  context.fillStyle = color
  for (const [index, x] of xs.entries()) {
    const width = index === selectedIndex ? SELECTED_SPLIT_LINE_WIDTH : SPLIT_LINE_WIDTH
    context.fillRect(x - width / 2, top, width, height)
  }
}
