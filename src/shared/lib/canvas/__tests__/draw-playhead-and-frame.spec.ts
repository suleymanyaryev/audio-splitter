import { describe, it, expect } from 'vitest'

import { drawFrame, drawPlayhead, FRAME_WIDTH } from '../draw-playhead-and-frame.ts'

// jsdom has no canvas, so this records what the drawing asks of the 2D context.
function recordingContext() {
  const filled: { fillStyle: string; rect: [number, number, number, number] }[] = []
  const stroked: {
    strokeStyle: string
    lineWidth: number
    rect: [number, number, number, number]
  }[] = []
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    fillRect: (x: number, y: number, width: number, height: number) => {
      filled.push({ fillStyle: context.fillStyle, rect: [x, y, width, height] })
    },
    strokeRect: (x: number, y: number, width: number, height: number) => {
      stroked.push({
        strokeStyle: context.strokeStyle,
        lineWidth: context.lineWidth,
        rect: [x, y, width, height],
      })
    },
  }
  return { context: context as unknown as CanvasRenderingContext2D, filled, stroked }
}

describe('drawPlayhead', () => {
  it('fills a 1 px column in the colour over the whole height', () => {
    const { context, filled } = recordingContext()

    drawPlayhead(context, 100, '#123', 160)

    expect(filled).toEqual([{ fillStyle: '#123', rect: [100, 0, 1, 160] }])
  })

  it('snaps the column to a whole pixel, so it is not smeared over two', () => {
    const { context, filled } = recordingContext()

    drawPlayhead(context, 100.4, '#123', 160)
    drawPlayhead(context, 100.6, '#123', 160)

    expect(filled.map((fill) => fill.rect[0])).toEqual([100, 100])
  })
})

describe('drawFrame', () => {
  it('strokes a 1.5 px rectangle in the colour, inset by half its width', () => {
    const { context, stroked } = recordingContext()

    drawFrame(context, 800, 160, '#456')

    expect(stroked).toEqual([
      { strokeStyle: '#456', lineWidth: 1.5, rect: [0.75, 0.75, 798.5, 158.5] },
    ])
  })

  it('shares its width, for the views that keep their bars inside it', () => {
    expect(FRAME_WIDTH).toBe(1.5)
  })
})
