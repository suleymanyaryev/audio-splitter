import { describe, it, expect, vi } from 'vitest'

import { drawConfidenceMarks } from '../draw-confidence-marks.ts'

function contextOf() {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  }
}

const style = {
  getPropertyValue: (name: string) => (name === '--color-split' ? 'rust' : 'white'),
} as CSSStyleDeclaration

const withBand = (band: 'sure' | 'likely' | 'doubtful' | null) => ({
  confidence: band === null ? null : { band },
})

describe('drawConfidenceMarks', () => {
  it('draws one mark at the foot of each line that has one, and none for the others', () => {
    const context = contextOf()

    drawConfidenceMarks(
      context as unknown as CanvasRenderingContext2D,
      style,
      [withBand('likely'), withBand(null), withBand('doubtful'), withBand('sure')],
      [10, 20, 30, 40],
      0,
      100,
    )

    expect(context.arc).toHaveBeenCalledTimes(2)
    expect(context.arc.mock.calls.map(([x, y]) => [x, y])).toEqual([
      [10, 93],
      [30, 93],
    ])
  })

  it('draws a doubtful disc bigger than a likely ring, and filled in the line’s colour', () => {
    const ring = contextOf()
    const disc = contextOf()

    drawConfidenceMarks(
      ring as unknown as CanvasRenderingContext2D,
      style,
      [withBand('likely')],
      [5],
      0,
      50,
    )
    drawConfidenceMarks(
      disc as unknown as CanvasRenderingContext2D,
      style,
      [withBand('doubtful')],
      [5],
      0,
      50,
    )

    expect(disc.arc.mock.calls[0]![2]).toBeGreaterThan(ring.arc.mock.calls[0]![2] as number)
    expect(ring.fillStyle).toBe('white')
    expect(disc.fillStyle).toBe('rust')
  })
})
