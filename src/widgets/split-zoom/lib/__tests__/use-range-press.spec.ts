import { describe, it, expect, vi } from 'vitest'

import { useRangePress } from '../use-range-press.ts'

// A canvas whose left edge is 100 px across the page.
const LEFT = 100

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasX: number) {
  const setPointerCapture = vi.fn()
  const event = {
    clientX: LEFT + canvasX,
    pointerId: 5,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

// The playhead is at x = 450; a pointer at x is x / 10 seconds.
function pressOf(playheadX: number | null) {
  const seconds = vi.fn((x: number) => x / 10)
  const grab = vi.fn()
  const move = vi.fn()
  const drop = vi.fn()
  const press = useRangePress({ playheadX: () => playheadX, seconds, grab, move, drop })
  return { ...press, seconds, grab, move, drop }
}

describe('useRangePress', () => {
  describe('the playhead', () => {
    it('is taken hold of by a press within 6 px, with the pointer captured', () => {
      const press = pressOf(450)
      const down = pointerAt(456)

      press.onPointerDown(down.event)

      expect(down.setPointerCapture).toHaveBeenCalledWith(5)
      expect(press.dragging.value).toBe(true)
      expect(press.grab).toHaveBeenCalledOnce()
    })

    it('is not taken hold of by a press 7 px away, or with no playhead to take', () => {
      const far = pressOf(450)
      const down = pointerAt(457)

      far.onPointerDown(down.event)
      far.onPointerMove(pointerAt(600).event)

      expect(down.setPointerCapture).not.toHaveBeenCalled()
      expect(far.grab).not.toHaveBeenCalled()
      expect(far.move).not.toHaveBeenCalled()

      const none = pressOf(null)
      none.onPointerDown(pointerAt(450).event)
      expect(none.grab).not.toHaveBeenCalled()
    })

    it('moves as the pointer moves, keeping the distance it was grabbed at', () => {
      const press = pressOf(450)

      // Grabbed 5 px right of the playhead.
      press.onPointerDown(pointerAt(455).event)
      press.onPointerMove(pointerAt(605).event)

      expect(press.seconds).toHaveBeenLastCalledWith(600)
      expect(press.move).toHaveBeenLastCalledWith(60)
    })

    it('is dropped once, when the pointer is released', () => {
      const press = pressOf(450)

      press.onPointerDown(pointerAt(450).event)
      press.onPointerEnd()
      press.onPointerEnd()
      press.onPointerMove(pointerAt(600).event)

      expect(press.dragging.value).toBe(false)
      expect(press.drop).toHaveBeenCalledOnce()
      expect(press.move).not.toHaveBeenCalled()
    })

    it('is not dropped by a release that took hold of nothing', () => {
      const press = pressOf(450)

      press.onPointerDown(pointerAt(300).event)
      press.onPointerEnd()

      expect(press.drop).not.toHaveBeenCalled()
    })

    it('shows the resize cursor only while the pointer is near it', () => {
      const press = pressOf(450)

      press.onPointerMove(pointerAt(445).event)
      expect(press.overPlayhead.value).toBe(true)

      press.onPointerMove(pointerAt(300).event)
      expect(press.overPlayhead.value).toBe(false)
    })
  })
})
