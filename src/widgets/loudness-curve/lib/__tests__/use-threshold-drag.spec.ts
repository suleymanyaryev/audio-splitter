import { describe, it, expect, vi } from 'vitest'

import { curveY } from '../threshold-line.ts'
import { useThresholdDrag } from '../use-threshold-drag.ts'

// A canvas 120 px tall whose top edge is 40 px down the page.
const HEIGHT = 120
const TOP = 40

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasY: number) {
  const setPointerCapture = vi.fn()
  const event = {
    clientY: TOP + canvasY,
    pointerId: 7,
    currentTarget: {
      getBoundingClientRect: () => ({ top: TOP, height: HEIGHT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

function dragOf(initial: number | null) {
  let threshold = initial
  const set = vi.fn((decibels: number) => {
    threshold = decibels
  })
  return { ...useThresholdDrag({ threshold: () => threshold, set }), set }
}

describe('useThresholdDrag', () => {
  it('shows the resize cursor only while the pointer is near the line', () => {
    const drag = dragOf(-30)
    const line = curveY(-30, HEIGHT)

    drag.onPointerMove(pointerAt(line + 4).event)
    expect(drag.overLine.value).toBe(true)

    drag.onPointerMove(pointerAt(line + 30).event)
    expect(drag.overLine.value).toBe(false)
  })

  it('does not take hold of anything away from the line', () => {
    const drag = dragOf(-30)
    const { event, setPointerCapture } = pointerAt(curveY(-30, HEIGHT) + 40)

    drag.onPointerDown(event)
    drag.onPointerMove(pointerAt(10).event)

    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(drag.set).not.toHaveBeenCalled()
  })

  it('does nothing before there is a threshold', () => {
    const drag = dragOf(null)
    const { event, setPointerCapture } = pointerAt(60)

    drag.onPointerDown(event)
    drag.onPointerMove(event)

    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(drag.overLine.value).toBe(false)
    expect(drag.set).not.toHaveBeenCalled()
  })

  it('captures the pointer on a press on the line and sets the threshold as it moves', () => {
    const drag = dragOf(-30)
    const line = curveY(-30, HEIGHT)
    const press = pointerAt(line)

    drag.onPointerDown(press.event)
    drag.onPointerMove(pointerAt(curveY(-45, HEIGHT)).event)

    expect(press.setPointerCapture).toHaveBeenCalledWith(7)
    expect(drag.set).toHaveBeenLastCalledWith(-45)
  })

  it('keeps the line under the pointer by the distance it grabbed it at', () => {
    const drag = dragOf(-30)
    const line = curveY(-30, HEIGHT)

    // Pressed 5 px under the line: moving to 5 px under the -45 dB position means -45 dB.
    drag.onPointerDown(pointerAt(line + 5).event)
    drag.onPointerMove(pointerAt(curveY(-45, HEIGHT) + 5).event)

    expect(drag.set).toHaveBeenLastCalledWith(-45)
  })

  it('does not set the same threshold twice in a row', () => {
    const drag = dragOf(-30)
    const line = curveY(-30, HEIGHT)

    drag.onPointerDown(pointerAt(line).event)
    drag.onPointerMove(pointerAt(line).event)

    expect(drag.set).not.toHaveBeenCalled()
  })

  it('stays inside the drawn range when the pointer leaves the canvas', () => {
    const drag = dragOf(-30)

    drag.onPointerDown(pointerAt(curveY(-30, HEIGHT)).event)
    drag.onPointerMove(pointerAt(-500).event)
    expect(drag.set).toHaveBeenLastCalledWith(0)

    drag.onPointerMove(pointerAt(900).event)
    expect(drag.set).toHaveBeenLastCalledWith(-60)
  })

  it('stops following the pointer when the press ends', () => {
    const drag = dragOf(-30)

    drag.onPointerDown(pointerAt(curveY(-30, HEIGHT)).event)
    drag.onPointerEnd()
    drag.onPointerMove(pointerAt(curveY(-45, HEIGHT)).event)

    expect(drag.set).not.toHaveBeenCalled()
  })
})
