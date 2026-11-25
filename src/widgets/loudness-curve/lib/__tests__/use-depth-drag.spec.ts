import { describe, it, expect, vi } from 'vitest'

import { useDepthDrag } from '../use-depth-drag.ts'
import { curveY } from '../threshold-line.ts'

// A canvas 100 px wide and 120 px tall, 20 px from the left of the page and 40 px down it.
const WIDTH = 100
const HEIGHT = 120
const LEFT = 20
const TOP = 40

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasX: number, canvasY: number) {
  const setPointerCapture = vi.fn()
  const event = {
    clientX: LEFT + canvasX,
    clientY: TOP + canvasY,
    pointerId: 3,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT, top: TOP, width: WIDTH, height: HEIGHT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

// A loudness around of -20 dB in the first half of the file and -40 dB in the second.
const AROUND = Float32Array.from({ length: 200 }, (_, index) => (index < 100 ? -20 : -40))

// The depth starts at 15 dB.
function dragOf(around: Float32Array | null = AROUND) {
  let depth = 15
  const set = vi.fn((decibels: number) => {
    depth = decibels
  })
  return { ...useDepthDrag({ around: () => around, depth: () => depth, set }), set }
}

describe('useDepthDrag', () => {
  it('shows the resize cursor only near the line, which follows the music', () => {
    const drag = dragOf()

    drag.onPointerMove(pointerAt(10, curveY(-35, HEIGHT) + 4).event)
    expect(drag.overLine.value).toBe(true)

    // At the right the line is at -55 dB, so the level it has at the left is no line there.
    drag.onPointerMove(pointerAt(90, curveY(-35, HEIGHT)).event)
    expect(drag.overLine.value).toBe(false)
    drag.onPointerMove(pointerAt(90, curveY(-55, HEIGHT)).event)
    expect(drag.overLine.value).toBe(true)
  })

  it('does not take hold away from the line, or before there is a curve', () => {
    const away = dragOf()
    const { event, setPointerCapture } = pointerAt(10, curveY(-35, HEIGHT) + 40)
    away.onPointerDown(event)
    away.onPointerMove(pointerAt(10, 10).event)
    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(away.set).not.toHaveBeenCalled()

    const none = dragOf(null)
    none.onPointerDown(pointerAt(10, 60).event)
    expect(none.overLine.value).toBe(false)
    expect(none.isDragging.value).toBe(false)
  })

  it('captures the pointer on a press on the line and sets the depth as it moves', () => {
    const drag = dragOf()
    const { event, setPointerCapture } = pointerAt(10, curveY(-35, HEIGHT))

    drag.onPointerDown(event)
    expect(setPointerCapture).toHaveBeenCalledWith(3)
    expect(drag.isDragging.value).toBe(true)

    // Dragged up to -30 dB: 10 dB under the -20 dB around there.
    drag.onPointerMove(pointerAt(10, curveY(-30, HEIGHT)).event)
    expect(drag.set).toHaveBeenLastCalledWith(10)

    // The drag goes on past the column it started in, and is still about that column's level.
    drag.onPointerMove(pointerAt(95, curveY(-25, HEIGHT)).event)
    expect(drag.set).toHaveBeenLastCalledWith(5)
  })

  it('keeps the offset it was grabbed at, so the line does not jump', () => {
    const drag = dragOf()

    drag.onPointerDown(pointerAt(10, curveY(-35, HEIGHT) + 5).event)
    drag.onPointerMove(pointerAt(10, curveY(-35, HEIGHT) + 5).event)

    expect(drag.set).not.toHaveBeenCalled()
  })

  it('holds the depth to the slider, and stops when the pointer is let go', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(10, curveY(-35, HEIGHT)).event)

    drag.onPointerMove(pointerAt(10, 119).event)
    expect(drag.set).toHaveBeenLastCalledWith(30)

    drag.onPointerEnd()
    expect(drag.isDragging.value).toBe(false)
    drag.set.mockClear()
    drag.onPointerMove(pointerAt(10, 10).event)
    expect(drag.set).not.toHaveBeenCalled()
  })
})
