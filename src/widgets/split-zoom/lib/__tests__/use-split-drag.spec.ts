import { describe, it, expect, vi } from 'vitest'

import { useSplitDrag } from '../use-split-drag.ts'

// A canvas whose left edge is 100 px across the page.
const LEFT = 100

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasX: number, init: { button?: number; buttons?: number } = {}) {
  const setPointerCapture = vi.fn()
  const event = {
    button: 0,
    buttons: 1,
    ...init,
    clientX: LEFT + canvasX,
    pointerId: 3,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

// The split's line is at x = 450; a pointer at x is x / 10 seconds, after the grab offset. The
// playhead's calls land in `calls` by name, in order, and its moves keep their time in `movePlayhead`.
function dragOf(lineX: number | null) {
  const seconds = vi.fn((x: number, grabOffset: number) => (x - grabOffset) / 10)
  const move = vi.fn()
  const calls: string[] = []
  const movePlayhead = vi.fn<(seconds: number) => void>(() => {
    calls.push('move')
  })
  const drag = useSplitDrag({
    lineX: () => lineX,
    seconds,
    move,
    playheadSeconds: (x) => x / 10,
    grabPlayhead: () => {
      calls.push('grab')
    },
    movePlayhead,
    dropPlayhead: () => {
      calls.push('drop')
    },
  })
  return { ...drag, seconds, move, movePlayhead, calls }
}

describe('useSplitDrag', () => {
  it('shows the resize cursor only while the pointer is near the line', () => {
    const drag = dragOf(450)

    drag.onPointerMove(pointerAt(455).event)
    expect(drag.overLine.value).toBe(true)

    drag.onPointerMove(pointerAt(300).event)
    expect(drag.overLine.value).toBe(false)
  })

  it('does not take hold of the split away from the line', () => {
    const drag = dragOf(450)

    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(200).event)

    expect(drag.dragging.value).toBe(false)
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

  describe('the playhead', () => {
    it('is grabbed by a press away from the line, and goes to the pointer without taking the split', () => {
      const drag = dragOf(450)
      const press = pointerAt(300)

      drag.onPointerDown(press.event)

      expect(drag.calls).toEqual(['grab', 'move'])
      expect(drag.movePlayhead.mock.lastCall?.[0]).toBeCloseTo(30)
      expect(press.setPointerCapture).toHaveBeenCalledWith(3)
      expect(drag.move).not.toHaveBeenCalled()
    })

    it('follows the pointer while held', () => {
      const drag = dragOf(450)

      drag.onPointerDown(pointerAt(300).event)
      drag.onPointerMove(pointerAt(200).event)
      drag.onPointerMove(pointerAt(250).event)

      expect(drag.calls).toEqual(['grab', 'move', 'move', 'move'])
      expect(drag.movePlayhead.mock.lastCall?.[0]).toBeCloseTo(25)
      expect(drag.move).not.toHaveBeenCalled()
    })

    it('is dropped once on release, and not again by a lost pointer capture after it', () => {
      const drag = dragOf(450)

      drag.onPointerDown(pointerAt(300).event)
      drag.onPointerEnd()
      drag.onPointerEnd()

      expect(drag.calls.filter((call) => call === 'drop')).toHaveLength(1)
    })

    it('stops following once released', () => {
      const drag = dragOf(450)

      drag.onPointerDown(pointerAt(300).event)
      drag.onPointerEnd()
      drag.onPointerMove(pointerAt(200).event)

      expect(drag.calls).toEqual(['grab', 'move', 'drop'])
    })

    it('is never grabbed by a press within reach of the line, which takes the split', () => {
      const drag = dragOf(450)

      drag.onPointerDown(pointerAt(455).event)
      drag.onPointerMove(pointerAt(600).event)
      drag.onPointerEnd()

      expect(drag.calls).toEqual([])
      expect(drag.move).toHaveBeenCalledTimes(1)
    })

    it('keeps the resize cursor off while held, and on for a split drag', () => {
      const playhead = dragOf(450)
      const split = dragOf(450)

      playhead.onPointerDown(pointerAt(300).event)
      split.onPointerDown(pointerAt(450).event)

      expect(playhead.dragging.value).toBe(false)
      expect(split.dragging.value).toBe(true)
    })

    it('is not grabbed by a press of a non-primary button', () => {
      const drag = dragOf(450)
      const press = pointerAt(300, { button: 2, buttons: 2 })

      drag.onPointerDown(press.event)

      expect(drag.calls).toEqual([])
      expect(press.setPointerCapture).not.toHaveBeenCalled()
    })

    it('is let go once by a move with no button held', () => {
      const drag = dragOf(450)

      drag.onPointerDown(pointerAt(300).event)
      drag.onPointerMove(pointerAt(200, { button: 0, buttons: 0 }).event)
      drag.onPointerMove(pointerAt(250).event)

      expect(drag.calls).toEqual(['grab', 'move', 'drop'])
    })

    it('is let go once before a press while held grabs it again', () => {
      const drag = dragOf(450)

      drag.onPointerDown(pointerAt(300).event)
      drag.onPointerDown(pointerAt(200).event)

      expect(drag.calls).toEqual(['grab', 'move', 'drop', 'grab', 'move'])
      expect(drag.movePlayhead.mock.lastCall?.[0]).toBeCloseTo(20)
    })

    it('is not grabbed with no split selected', () => {
      const drag = dragOf(null)
      const press = pointerAt(300)

      drag.onPointerDown(press.event)
      drag.onPointerMove(pointerAt(200).event)
      drag.onPointerEnd()

      expect(drag.calls).toEqual([])
      expect(press.setPointerCapture).not.toHaveBeenCalled()
    })
  })
})
