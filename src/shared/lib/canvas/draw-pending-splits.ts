// DESIGN.md: a pending split is a 2 px ink line with a diamond at each end; the selected one is
// 4 px with larger diamonds. No split line, mark or playhead has diamonds, and none is vermilion.
const LINE_WIDTH = 2
const SELECTED_LINE_WIDTH = 4
const DIAMOND_SIZE = 8
const SELECTED_DIAMOND_SIZE = 12

// A diamond of `size` px from point to point, centred on (x, y).
function drawDiamond(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const half = size / 2
  const diamond = new Path2D()
  diamond.moveTo(x, y - half)
  diamond.lineTo(x + half, y)
  diamond.lineTo(x, y + half)
  diamond.lineTo(x - half, y)
  diamond.closePath()
  context.fill(diamond)
}

/*
One pending split (GLOSSARY.md) centred on each x, over the canvas's height. The one at index
`selectedIndex`, if any (null is none), is drawn heavier. The diamonds sit wholly inside the canvas.
*/
export function drawPendingSplits(
  context: CanvasRenderingContext2D,
  xs: readonly number[],
  color: string,
  height: number,
  selectedIndex: number | null,
) {
  context.fillStyle = color
  for (const [index, x] of xs.entries()) {
    const isSelected = index === selectedIndex
    const width = isSelected ? SELECTED_LINE_WIDTH : LINE_WIDTH
    const size = isSelected ? SELECTED_DIAMOND_SIZE : DIAMOND_SIZE
    context.fillRect(x - width / 2, 0, width, height)
    drawDiamond(context, x, size / 2, size)
    drawDiamond(context, x, height - size / 2, size)
  }
}
