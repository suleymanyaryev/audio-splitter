import { DIP_MARK_OUTLINE_WIDTH, DIP_MARK_SIZE } from './dip-marks.ts'

/*
DESIGN.md: a mark of what Find splits would add, on the loudness curve (a dip) or the contrast lane
(a contrast peak), is an 8 px `ink` diamond ringed in 1.5 px `surface`, so it reads over the line and
the fill. It is no split, so it is never rust.
*/
export function drawDiamondMarks(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  marks: readonly { x: number; y: number }[],
) {
  const half = DIP_MARK_SIZE / 2
  context.fillStyle = style.getPropertyValue('--color-ink')
  context.strokeStyle = style.getPropertyValue('--color-surface')
  context.lineWidth = DIP_MARK_OUTLINE_WIDTH
  // One diamond around the origin, moved to each mark.
  const diamond = new Path2D()
  diamond.moveTo(0, -half)
  diamond.lineTo(half, 0)
  diamond.lineTo(0, half)
  diamond.lineTo(-half, 0)
  diamond.closePath()
  for (const { x, y } of marks) {
    context.save()
    context.translate(x, y)
    context.stroke(diamond)
    context.fill(diamond)
    context.restore()
  }
}
