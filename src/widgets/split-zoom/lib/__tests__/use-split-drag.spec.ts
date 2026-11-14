import { describe, it, expect, vi } from 'vitest'

import { useSplitDrag } from '../use-split-drag.ts'

// A canvas whose left edge is 100 px across the page.
const LEFT = 100

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasX: number) {
  const setPointerCapture = vi.fn()
  const event = {
    clientX: LEFT + canvasX,
    pointerId: 3,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

// The split's line is at x = 450; a pointer at x is x / 10 seconds, after the grab offset.
function dragOf(lineX: number | null) {
  const seconds = vi.fn((x: number, grabOffset: number) => (x - grabOffset) / 10)
  const move = vi.fn()
  return { ...useSplitDrag({ lineX: () => lineX, seconds, move }), seconds, move }
}

describe('useSplitDrag', () => {
  it('shows the resize cursor only while the pointer is near the line', () => {
    const drag = dragOf(450)

    drag.onPointerMove(pointerAt(455).event)
    expect(drag.overLine.value).toBe(true)

    drag.onPointerMove(pointerAt(300).event)
    expect(drag.overLine.value).toBe(false)
  })

  it('does not take hold of anything away from the line', () => {
    const drag = dragOf(450)
    const { event, setPointerCapture } = pointerAt(300)

    drag.onPointerDown(event)
    drag.onPointerMove(pointerAt(200).event)

    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(drag.move).not.toHaveBeenCalled()
  })

  it('does nothing without a selected split', () => {
    const drag = dragOf(null)
    const { event, setPointerCapture } = pointerAt(450)

    drag.onPointerDown(event)
    drag.onPointerMove(event)

    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(drag.overLine.value).toBe(false)
    expect(drag.move).not.toHaveBeenCalled()
  })

  it('captures the pointer on a press on the line and moves the split as the pointer moves', () => {
    const drag = dragOf(450)
    const press = pointerAt(450)

    drag.onPointerDown(press.event)
    drag.onPointerMove(pointerAt(600).event)

    expect(press.setPointerCapture).toHaveBeenCalledWith(3)
    expect(drag.dragging.value).toBe(true)
    expect(drag.move).toHaveBeenLastCalledWith(60)
  })

  it('holds the line at the distance from the pointer it was grabbed at', () => {
    const drag = dragOf(450)

    // Grabbed on the handle, 6 px right of the line.
    drag.onPointerDown(pointerAt(456).event)
    drag.onPointerMove(pointerAt(606).event)

    expect(drag.seconds).toHaveBeenLastCalledWith(606, 6)
    expect(drag.move).toHaveBeenLastCalledWith(60)
  })

  it('stops moving the split once the pointer is released', () => {
    const drag = dragOf(450)

    drag.onPointerDown(pointerAt(450).event)
    drag.onPointerEnd()
    drag.onPointerMove(pointerAt(600).event)

    expect(drag.dragging.value).toBe(false)
    expect(drag.move).not.toHaveBeenCalled()
  })
})
