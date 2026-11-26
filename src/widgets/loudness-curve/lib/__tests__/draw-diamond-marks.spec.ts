import { afterEach, describe, it, expect, vi } from 'vitest'

import { DIP_MARK_OUTLINE_WIDTH, DIP_MARK_SIZE } from '../dip-marks.ts'
import { drawDiamondMarks } from '../draw-diamond-marks.ts'

// jsdom has no Path2D: this one records the points of the path it is given.
class FakePath2D {
  points: [number, number][] = []
  moveTo(x: number, y: number) {
    this.points.push([x, y])
  }
  lineTo(x: number, y: number) {
    this.points.push([x, y])
  }
  closePath() {}
}

function contextOf() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  }
}

const style = {
  getPropertyValue: (name: string) =>
    ({ '--color-ink': 'graphite', '--color-surface': 'paper' })[name],
} as CSSStyleDeclaration

describe('drawDiamondMarks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('draws an 8 px diamond at each mark, ringed in the surface colour and filled in ink', () => {
    vi.stubGlobal('Path2D', FakePath2D)
    const context = contextOf()

    drawDiamondMarks(context as unknown as CanvasRenderingContext2D, style, [
      { x: 50, y: 20 },
      { x: 90, y: 30 },
    ])

    const half = DIP_MARK_SIZE / 2
    expect(context.fillStyle).toBe('graphite')
    expect(context.strokeStyle).toBe('paper')
    expect(context.lineWidth).toBe(DIP_MARK_OUTLINE_WIDTH)
    expect(context.translate.mock.calls).toEqual([
      [50, 20],
      [90, 30],
    ])
    const [diamond] = context.fill.mock.calls[0] as [FakePath2D]
    expect(diamond.points).toEqual([
      [0, -half],
      [half, 0],
      [0, half],
      [-half, 0],
    ])
    expect(context.stroke).toHaveBeenCalledTimes(2)
    expect(context.fill).toHaveBeenCalledTimes(2)
    expect(context.restore).toHaveBeenCalledTimes(2)
  })

  it('draws nothing for no marks', () => {
    vi.stubGlobal('Path2D', FakePath2D)
    const context = contextOf()

    drawDiamondMarks(context as unknown as CanvasRenderingContext2D, style, [])

    expect(context.fill).not.toHaveBeenCalled()
  })
})
