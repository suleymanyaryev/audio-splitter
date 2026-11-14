import { describe, it, expect } from 'vitest'

import { drawLands, drawSplitLines, SPLIT_LINE_WIDTH } from '../draw-lands-and-splits.ts'

interface FilledRect {
  fillStyle: string
  rect: [number, number, number, number]
}

// jsdom has no canvas, so this records what the drawing asks of the 2D context.
function recordingContext() {
  const filled: FilledRect[] = []
  const context = {
    fillStyle: '',
    fillRect: (x: number, y: number, width: number, height: number) => {
      filled.push({ fillStyle: context.fillStyle, rect: [x, y, width, height] })
    },
  }
  return { context: context as unknown as CanvasRenderingContext2D, filled }
}

describe('drawLands', () => {
  it('fills one rectangle per span, in the colour, over the vertical extent', () => {
    const { context, filled } = recordingContext()

    drawLands(
      context,
      [
        { left: 10, right: 22 },
        { left: 100, right: 140 },
      ],
      '#abc',
      22,
      98,
    )

    expect(filled).toEqual([
      { fillStyle: '#abc', rect: [10, 22, 12, 98] },
      { fillStyle: '#abc', rect: [100, 22, 40, 98] },
    ])
  })

  it('draws nothing without spans', () => {
    const { context, filled } = recordingContext()

    drawLands(context, [], '#abc', 0, 120)

    expect(filled).toEqual([])
  })
})

describe('drawSplitLines', () => {
  it('fills a line centred on each x, in the colour, over the vertical extent', () => {
    const { context, filled } = recordingContext()

    drawSplitLines(context, [50, 300.5], '#f60', 0, 120)

    expect(SPLIT_LINE_WIDTH).toBe(1.5)
    expect(filled).toEqual([
      { fillStyle: '#f60', rect: [49.25, 0, 1.5, 120] },
      { fillStyle: '#f60', rect: [299.75, 0, 1.5, 120] },
    ])
  })
})
