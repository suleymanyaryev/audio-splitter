import { describe, expect, it, vi } from 'vitest'

import { drawPeakBars } from '../draw-peak-bars.ts'

function recordingContext() {
  const fillRect = vi.fn()
  return { context: { fillRect, fillStyle: '' } as unknown as CanvasRenderingContext2D, fillRect }
}

describe('drawPeakBars', () => {
  it('draws each bar from its min to its max around the middle, on a 3 px pitch', () => {
    const { context, fillRect } = recordingContext()

    // Bar 0 spans −0.5 to 1, bar 1 spans 0 to 0.5; a sample of ±1 reaches 40 px from the middle.
    drawPeakBars(context, new Float32Array([-0.5, 1, 0, 0.5]), '#123456', 50, 40)

    expect(fillRect.mock.calls).toEqual([
      [0, 10, 2, 60],
      [3, 30, 2, 20],
    ])
  })

  it('paints in the given colour', () => {
    const { context } = recordingContext()

    drawPeakBars(context, new Float32Array([-1, 1]), '#123456', 50, 40)

    expect(context.fillStyle).toBe('#123456')
  })

  it('draws nothing for no bars', () => {
    const { context, fillRect } = recordingContext()

    drawPeakBars(context, new Float32Array(), '#123456', 50, 40)

    expect(fillRect).not.toHaveBeenCalled()
  })
})
