import { describe, it, expect, vi } from 'vitest'

import { useRangePress } from '../use-range-press.ts'

// A canvas whose left edge is 100 px across the page.
const LEFT = 100

// What the handlers read from a pointer event, without a browser's PointerEvent.
// `buttons` is the buttons held: 1 while the main one is down, 0 once the pointer is only hovering.
function pointerAt(canvasX: number, button = 0, buttons = 1) {
  const setPointerCapture = vi.fn()
  const event = {
    button,
    buttons,
    clientX: LEFT + canvasX,
    pointerId: 5,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

// What the double-click handler reads: a `dblclick` has no pointer id and captures nothing.
function doubleClickAt(canvasX: number, button = 0) {
  return {
    button,
    clientX: LEFT + canvasX,
    currentTarget: { getBoundingClientRect: () => ({ left: LEFT }) },
  } as unknown as MouseEvent
}

/*
The playhead is at x = 450; a pointer at x is x / 10 seconds. The split lines are at the x given,
none by default.
*/
function pressOf(playheadX: number | null, splitXs: number[] = [], pendingXs?: number[]) {
  const seconds = vi.fn((x: number) => x / 10)
  const grab = vi.fn()
  const move = vi.fn()
  const drop = vi.fn()
  const selectSplit = vi.fn()
  const selectPending = vi.fn()
  const placeMark = vi.fn()
  const press = useRangePress({
    playheadX: () => playheadX,
    splitXs: () => splitXs,
    ...(pendingXs !== undefined && { pendingXs: () => pendingXs, selectPending }),
    seconds,
    grab,
    move,
    drop,
    selectSplit,
    placeMark,
  })
  return { ...press, seconds, grab, move, drop, selectSplit, selectPending, placeMark }
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

    it('is dropped by a move with no button held, when the release never came', () => {
      const press = pressOf(450)
      press.onPointerDown(pointerAt(450).event)

      press.onPointerMove(pointerAt(600, 0, 0).event)
      press.onPointerMove(pointerAt(650).event)

      expect(press.dragging.value).toBe(false)
      expect(press.drop).toHaveBeenCalledOnce()
      expect(press.move).not.toHaveBeenCalled()
    })

    it('is dropped by a second press before that press does its own work', () => {
      const press = pressOf(450)
      press.onPointerDown(pointerAt(450).event)

      press.onPointerDown(pointerAt(200).event)

      expect(press.drop).toHaveBeenCalledOnce()
      expect(press.dragging.value).toBe(false)
      expect(press.placeMark).toHaveBeenCalledExactlyOnceWith(20)
      expect(press.drop.mock.invocationCallOrder[0]).toBeLessThan(
        press.placeMark.mock.invocationCallOrder[0]!,
      )
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

  describe('a split line, under a single press', () => {
    it('is not hit: a press on its line places the mark there, and selects nothing', () => {
      const press = pressOf(450, [100, 300, 700])
      const down = pointerAt(300)

      press.onPointerDown(down.event)

      expect(press.placeMark).toHaveBeenCalledExactlyOnceWith(30)
      expect(press.selectSplit).not.toHaveBeenCalled()
      expect(press.grab).not.toHaveBeenCalled()
      expect(down.setPointerCapture).not.toHaveBeenCalled()
      expect(press.dragging.value).toBe(false)
    })

    it('loses to the playhead when both are within 6 px', () => {
      const press = pressOf(450, [452])

      press.onPointerDown(pointerAt(451).event)

      expect(press.grab).toHaveBeenCalledOnce()
      expect(press.selectSplit).not.toHaveBeenCalled()
      expect(press.placeMark).not.toHaveBeenCalled()
    })
  })

  describe('a pending split', () => {
    it('is selected by a press within 6 px, by its index, and nothing else happens', () => {
      const press = pressOf(450, [], [100, 300, 700])
      const down = pointerAt(305)

      press.onPointerDown(down.event)

      expect(press.selectPending).toHaveBeenCalledExactlyOnceWith(1)
      expect(press.placeMark).not.toHaveBeenCalled()
      expect(press.grab).not.toHaveBeenCalled()
      expect(down.setPointerCapture).not.toHaveBeenCalled()
      expect(press.dragging.value).toBe(false)
    })

    it('selects the nearer one when two are within reach', () => {
      const press = pressOf(450, [], [300, 304])

      press.onPointerDown(pointerAt(303).event)

      expect(press.selectPending).toHaveBeenCalledExactlyOnceWith(1)
    })

    it('loses to the playhead when both are within 6 px', () => {
      const press = pressOf(450, [], [452])

      press.onPointerDown(pointerAt(451).event)

      expect(press.grab).toHaveBeenCalledOnce()
      expect(press.selectPending).not.toHaveBeenCalled()
      expect(press.placeMark).not.toHaveBeenCalled()
    })

    it('beats the mark: a press 7 px away places the mark instead', () => {
      const press = pressOf(450, [], [300])

      press.onPointerDown(pointerAt(307).event)

      expect(press.selectPending).not.toHaveBeenCalled()
      expect(press.placeMark).toHaveBeenCalledExactlyOnceWith(30.7)
    })

    it('is not hit by a double-click, which keeps its own order', () => {
      const press = pressOf(450, [100], [300])

      press.onDoubleClick(doubleClickAt(300))
      press.onDoubleClick(doubleClickAt(103))

      expect(press.selectPending).not.toHaveBeenCalled()
      expect(press.move).toHaveBeenCalledExactlyOnceWith(30)
      expect(press.selectSplit).toHaveBeenCalledExactlyOnceWith(0)
    })

    it('is ignored for any button but the primary one', () => {
      const press = pressOf(450, [], [300])

      press.onPointerDown(pointerAt(300, 2).event)

      expect(press.selectPending).not.toHaveBeenCalled()
      expect(press.placeMark).not.toHaveBeenCalled()
    })
  })

  describe('a double-click', () => {
    it('selects the split whose line is within 6 px, by its index, and moves nothing', () => {
      const press = pressOf(450, [100, 300, 700])

      press.onDoubleClick(doubleClickAt(305))

      expect(press.selectSplit).toHaveBeenCalledExactlyOnceWith(1)
      expect(press.move).not.toHaveBeenCalled()
    })

    it('selects the nearer split when two are within reach', () => {
      const press = pressOf(450, [300, 304])

      press.onDoubleClick(doubleClickAt(303))

      expect(press.selectSplit).toHaveBeenCalledExactlyOnceWith(1)
    })

    it('moves the playhead to that time when no line is within 6 px', () => {
      const press = pressOf(450, [300])

      press.onDoubleClick(doubleClickAt(307))

      expect(press.move).toHaveBeenCalledExactlyOnceWith(30.7)
      expect(press.selectSplit).not.toHaveBeenCalled()
    })

    it('moves the playhead with no split lines and no playhead drawn, too', () => {
      const press = pressOf(null)

      press.onDoubleClick(doubleClickAt(250))

      expect(press.move).toHaveBeenCalledExactlyOnceWith(25)
    })

    it('places no mark and takes hold of nothing', () => {
      const press = pressOf(450, [300])

      press.onDoubleClick(doubleClickAt(250))
      press.onDoubleClick(doubleClickAt(450))

      expect(press.placeMark).not.toHaveBeenCalled()
      expect(press.grab).not.toHaveBeenCalled()
      expect(press.dragging.value).toBe(false)
    })

    it('is ignored for any button but the primary one', () => {
      const press = pressOf(450, [300])

      press.onDoubleClick(doubleClickAt(300, 2))
      press.onDoubleClick(doubleClickAt(250, 2))

      expect(press.selectSplit).not.toHaveBeenCalled()
      expect(press.move).not.toHaveBeenCalled()
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
    it('is placed by a press away from the playhead, at that time', () => {
      const press = pressOf(450, [100])

      press.onPointerDown(pointerAt(250).event)

      expect(press.placeMark).toHaveBeenCalledExactlyOnceWith(25)
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
