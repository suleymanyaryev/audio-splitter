import { describe, it, expect, vi } from 'vitest'

import { useRangePress } from '../use-range-press.ts'

// A canvas whose left edge is 100 px across the page.
const LEFT = 100

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasX: number, button = 0) {
  const setPointerCapture = vi.fn()
  const event = {
    button,
    clientX: LEFT + canvasX,
    pointerId: 5,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

/*
The playhead is at x = 450; a pointer at x is x / 10 seconds. The split lines are at the x given,
none by default.
*/
function pressOf(playheadX: number | null, splitXs: number[] = []) {
  const seconds = vi.fn((x: number) => x / 10)
  const grab = vi.fn()
  const move = vi.fn()
  const drop = vi.fn()
  const selectSplit = vi.fn()
  const placeMark = vi.fn()
  const press = useRangePress({
    playheadX: () => playheadX,
    splitXs: () => splitXs,
    seconds,
    grab,
    move,
    drop,
    selectSplit,
    placeMark,
  })
  return { ...press, seconds, grab, move, drop, selectSplit, placeMark }
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

  describe('a split line', () => {
    it('is selected by a press within 6 px of it, by its index, and places no mark', () => {
      const press = pressOf(450, [100, 300, 700])
      const down = pointerAt(305)

      press.onPointerDown(down.event)

      expect(press.selectSplit).toHaveBeenCalledExactlyOnceWith(1)
      expect(press.placeMark).not.toHaveBeenCalled()
      expect(press.grab).not.toHaveBeenCalled()
      expect(down.setPointerCapture).not.toHaveBeenCalled()
      expect(press.dragging.value).toBe(false)
    })

    it('is not selected by a press 7 px away', () => {
      const press = pressOf(450, [300])

      press.onPointerDown(pointerAt(307).event)

      expect(press.selectSplit).not.toHaveBeenCalled()
    })

    it('is the nearer one when two are within reach', () => {
      const press = pressOf(450, [300, 304])

      press.onPointerDown(pointerAt(303).event)

      expect(press.selectSplit).toHaveBeenCalledExactlyOnceWith(1)
    })

    it('loses to the playhead when both are within 6 px', () => {
      const press = pressOf(450, [452])

      press.onPointerDown(pointerAt(451).event)

      expect(press.grab).toHaveBeenCalledOnce()
      expect(press.selectSplit).not.toHaveBeenCalled()
      expect(press.placeMark).not.toHaveBeenCalled()
    })
  })

  describe('a press of another button than the primary one', () => {
    it('takes hold of nothing and places nothing', () => {
      const press = pressOf(450, [300])

      for (const x of [450, 300, 100]) press.onPointerDown(pointerAt(x, 2).event)

      expect(press.grab).not.toHaveBeenCalled()
      expect(press.selectSplit).not.toHaveBeenCalled()
      expect(press.placeMark).not.toHaveBeenCalled()
    })
  })

  describe('the mark', () => {
    it('is placed by a press away from the playhead and the split lines, at that time', () => {
      const press = pressOf(450, [100])

      press.onPointerDown(pointerAt(250).event)

      expect(press.placeMark).toHaveBeenCalledExactlyOnceWith(25)
      expect(press.selectSplit).not.toHaveBeenCalled()
      expect(press.grab).not.toHaveBeenCalled()
    })

    it('is placed with no split lines and no playhead, too', () => {
      const press = pressOf(null)

      press.onPointerDown(pointerAt(250).event)

      expect(press.placeMark).toHaveBeenCalledExactlyOnceWith(25)
    })

    it('does not start a drag: later moves and the release do nothing', () => {
      const press = pressOf(450)
      const down = pointerAt(250)

      press.onPointerDown(down.event)
      press.onPointerMove(pointerAt(300).event)
      press.onPointerEnd()

      expect(down.setPointerCapture).not.toHaveBeenCalled()
      expect(press.dragging.value).toBe(false)
      expect(press.move).not.toHaveBeenCalled()
      expect(press.drop).not.toHaveBeenCalled()
      expect(press.placeMark).toHaveBeenCalledOnce()
    })
  })
})
