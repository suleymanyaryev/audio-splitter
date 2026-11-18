import { afterEach, describe, expect, it, vi } from 'vitest'

import { prepareCanvas } from '../prepare-canvas.ts'

function canvasOfSize(width: number, height: number) {
  const context = { setTransform: vi.fn(), clearRect: vi.fn() }
  const element = document.createElement('canvas')
  vi.spyOn(element, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width, height } as DOMRect)
  return { element, context }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('prepareCanvas', () => {
  it('sizes the backing store to the pixel density and draws in CSS pixels', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const { element, context } = canvasOfSize(300, 120)

    const prepared = prepareCanvas(element)

    expect([element.width, element.height]).toEqual([600, 240])
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 300, 120)
    expect(prepared).toEqual({ context, width: 300, height: 120 })
  })

  it('rounds a fractional backing store to whole pixels', () => {
    vi.stubGlobal('devicePixelRatio', 1.5)
    const { element } = canvasOfSize(101, 41)

    prepareCanvas(element)

    expect([element.width, element.height]).toEqual([152, 62])
  })

  it('draws at one device pixel per CSS pixel when the density is unknown', () => {
    vi.stubGlobal('devicePixelRatio', 0)
    const { element, context } = canvasOfSize(200, 50)

    prepareCanvas(element)

    expect([element.width, element.height]).toEqual([200, 50])
    expect(context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0)
  })

  it('returns null when the canvas has no 2D context', () => {
    const element = document.createElement('canvas')
    vi.spyOn(element, 'getContext').mockReturnValue(null)

    expect(prepareCanvas(element)).toBeNull()
  })
})
