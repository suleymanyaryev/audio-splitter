import { describe, it, expect, vi } from 'vitest'

import { contrastThresholdFromPointer, contrastY } from '../contrast-lane.ts'
import { curveY } from '../threshold-line.ts'
import { useThresholdDrag } from '../use-threshold-drag.ts'

// A canvas 120 px tall whose top edge is 40 px down the page.
const HEIGHT = 120
const TOP = 40

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasY: number) {
  const setPointerCapture = vi.fn()
  const releasePointerCapture = vi.fn()
  const event = {
    clientY: TOP + canvasY,
    pointerId: 7,
    currentTarget: {
      getBoundingClientRect: () => ({ top: TOP, height: HEIGHT }),
      setPointerCapture,
      releasePointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture, releasePointerCapture }
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

// The lane is 80 px tall, with its own scale.
const LANE_HEIGHT = 80

function laneEvent(canvasY: number) {
  const setPointerCapture = vi.fn()
  const event = {
    clientY: TOP + canvasY,
    pointerId: 7,
    currentTarget: {
      getBoundingClientRect: () => ({ top: TOP, height: LANE_HEIGHT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

function laneDragOf(initial: number | null) {
  let threshold = initial
  const set = vi.fn((decibels: number) => {
    threshold = decibels
  })
  const drag = useThresholdDrag({
    threshold: () => threshold,
    set,
    lineY: contrastY,
    valueAt: contrastThresholdFromPointer,
  })
  return { ...drag, set }
}

describe('useThresholdDrag on the contrast lane', () => {
  it('takes hold of the line on the lane’s scale and moves it in tenths of a dB', () => {
    const drag = laneDragOf(5.4)
    const { event, setPointerCapture } = laneEvent(contrastY(5.4, LANE_HEIGHT) + 2)

    drag.onPointerDown(event)
    drag.onPointerMove(laneEvent(contrastY(8, LANE_HEIGHT) + 2).event)

    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(drag.isDragging.value).toBe(true)
    expect(drag.set).toHaveBeenLastCalledWith(8)
  })

  it('holds the line to 3 to 12 dB however far the pointer goes', () => {
    const drag = laneDragOf(5.4)
    drag.onPointerDown(laneEvent(contrastY(5.4, LANE_HEIGHT)).event)

    drag.onPointerMove(laneEvent(-30).event)
    expect(drag.set).toHaveBeenLastCalledWith(12)

    drag.onPointerMove(laneEvent(LANE_HEIGHT + 30).event)
    expect(drag.set).toHaveBeenLastCalledWith(3)
  })

  it('has no line to take hold of while the threshold is null, as when contrast is off', () => {
    const drag = laneDragOf(null)
    const { event, setPointerCapture } = laneEvent(40)

    drag.onPointerDown(event)
    drag.onPointerMove(laneEvent(10).event)

    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(drag.set).not.toHaveBeenCalled()
    expect(drag.overLine.value).toBe(false)
  })
})
