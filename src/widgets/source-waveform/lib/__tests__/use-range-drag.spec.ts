import { describe, it, expect, vi } from 'vitest'

import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { useRangeDrag, type RangeDragSource } from '../use-range-drag.ts'

// A canvas whose left edge is 100 px across the page.
const LEFT = 100

// What the handlers read from a pointer event, without a browser's PointerEvent.
function pointerAt(canvasX: number, button = 0, pointerId = 7) {
  const setPointerCapture = vi.fn()
  const event = {
    clientX: LEFT + canvasX,
    pointerId,
    button,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

/*
A pointer at x is x / 10 seconds. The drag's range is what a 1 hour file would hold, without the
10 min limit: from the earlier to the later time, or none under 1 s.
*/
function dragOf(isAccepted = true) {
  const rangeBetween = vi.fn((anchor: number, pointer: number): TimeRange | null =>
    Math.abs(pointer - anchor) < 1
      ? null
      : { startSeconds: Math.min(anchor, pointer), endSeconds: Math.max(anchor, pointer) },
  )
  const commit = vi.fn<RangeDragSource['commit']>(() => isAccepted)
  const click = vi.fn()
  const drag = useRangeDrag({
    timeAt: (x) => x / 10,
    rangeBetween,
    commit,
    click,
  })
  return { ...drag, rangeBetween, commit, click }
}

describe('useRangeDrag', () => {
  it('captures the pointer on a press, so the drag goes on past the canvas', () => {
    const drag = dragOf()
    const press = pointerAt(300)

    drag.onPointerDown(press.event)

    expect(press.setPointerCapture).toHaveBeenCalledWith(7)
  })

  it('is a click when the pointer is released where it was pressed', () => {
    const drag = dragOf()

    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerUp(pointerAt(300).event)

    expect(drag.click).toHaveBeenCalledExactlyOnceWith(300)
    expect(drag.commit).not.toHaveBeenCalled()
    expect(drag.liveRange.value).toBeNull()
  })

  it('stays a click while the pointer moves less than 4 px, and the range stays hidden', () => {
    const drag = dragOf()

    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(303).event)
    expect(drag.liveRange.value).toBeNull()
    drag.onPointerUp(pointerAt(303).event)

    expect(drag.click).toHaveBeenCalledExactlyOnceWith(300)
    expect(drag.commit).not.toHaveBeenCalled()
  })

  it('becomes a drag at 4 px of movement, to either side', () => {
    const drag = dragOf()

    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(296).event)

    // 4 px is only 0.4 s here, under the 1 s minimum, so there is still nothing to draw.
    expect(drag.rangeBetween).toHaveBeenCalledWith(30, 29.6)
    expect(drag.liveRange.value).toBeNull()

    drag.onPointerMove(pointerAt(250).event)
    expect(drag.liveRange.value).toEqual({ startSeconds: 25, endSeconds: 30 })
  })

  it('reports the live range as the pointer moves, in either direction', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(300).event)

    drag.onPointerMove(pointerAt(500).event)
    expect(drag.liveRange.value).toEqual({ startSeconds: 30, endSeconds: 50 })

    drag.onPointerMove(pointerAt(100).event)
    expect(drag.liveRange.value).toEqual({ startSeconds: 10, endSeconds: 30 })
  })

  it('keeps being a drag when the pointer comes back within 4 px of the press', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(400).event)

    drag.onPointerMove(pointerAt(302).event)
    drag.onPointerUp(pointerAt(302).event)

    expect(drag.commit).toHaveBeenCalledOnce()
    expect(drag.click).not.toHaveBeenCalled()
  })

  it('passes a pointer outside the canvas on, for the range to be held to the file', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(20).event)

    drag.onPointerMove(pointerAt(-80).event)
    drag.onPointerUp(pointerAt(-80).event)

    expect(drag.rangeBetween).toHaveBeenCalledWith(2, -8)
    expect(drag.commit).toHaveBeenCalledExactlyOnceWith(2, -8)
  })

  it('commits the range from the press to the release, and clears the live one', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(500).event)

    drag.onPointerUp(pointerAt(520).event)

    expect(drag.commit).toHaveBeenCalledExactlyOnceWith(30, 52)
    expect(drag.click).not.toHaveBeenCalled()
    expect(drag.liveRange.value).toBeNull()
  })

  it('is a click at the press when the committed range is refused as too short', () => {
    const drag = dragOf(false)
    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(306).event)

    drag.onPointerUp(pointerAt(306).event)

    expect(drag.commit).toHaveBeenCalledExactlyOnceWith(30, 30.6)
    expect(drag.click).toHaveBeenCalledExactlyOnceWith(300)
    expect(drag.liveRange.value).toBeNull()
  })

  it('starts a drag on a press on a split’s line like anywhere else', () => {
    // The composable knows nothing of splits: a press is a press.
    const drag = dragOf()
    drag.onPointerDown(pointerAt(450).event)
    drag.onPointerMove(pointerAt(600).event)

    expect(drag.liveRange.value).toEqual({ startSeconds: 45, endSeconds: 60 })
  })

  it('ignores moves and releases with no press', () => {
    const drag = dragOf()

    drag.onPointerMove(pointerAt(500).event)
    drag.onPointerUp(pointerAt(500).event)

    expect(drag.liveRange.value).toBeNull()
    expect(drag.rangeBetween).not.toHaveBeenCalled()
    expect(drag.commit).not.toHaveBeenCalled()
    expect(drag.click).not.toHaveBeenCalled()
  })

  it('ignores a press with another button than the main one', () => {
    const drag = dragOf()
    const press = pointerAt(300, 2)

    drag.onPointerDown(press.event)
    drag.onPointerUp(pointerAt(300, 2).event)

    expect(press.setPointerCapture).not.toHaveBeenCalled()
    expect(drag.click).not.toHaveBeenCalled()
  })

  it('follows only the pointer that pressed', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(300).event)

    // Another pointer (a second finger, a pen) presses, moves and releases meanwhile.
    const second = pointerAt(100, 0, 8)
    drag.onPointerDown(second.event)
    drag.onPointerMove(pointerAt(900, 0, 8).event)
    drag.onPointerUp(pointerAt(900, 0, 8).event)

    expect(second.setPointerCapture).not.toHaveBeenCalled()
    expect(drag.liveRange.value).toBeNull()
    expect(drag.commit).not.toHaveBeenCalled()
    expect(drag.click).not.toHaveBeenCalled()

    drag.onPointerMove(pointerAt(500).event)
    drag.onPointerUp(pointerAt(500).event)
    expect(drag.commit).toHaveBeenCalledExactlyOnceWith(30, 50)
  })

  it('does nothing after the release until the next press', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(500).event)
    drag.onPointerUp(pointerAt(500).event)

    drag.onPointerMove(pointerAt(700).event)
    drag.onPointerUp(pointerAt(700).event)

    expect(drag.liveRange.value).toBeNull()
    expect(drag.commit).toHaveBeenCalledOnce()
    expect(drag.click).not.toHaveBeenCalled()
  })

  it('drops a drag that the browser cancels, with neither a range nor a click', () => {
    const drag = dragOf()
    drag.onPointerDown(pointerAt(300).event)
    drag.onPointerMove(pointerAt(500).event)

    drag.onPointerCancel()

    expect(drag.liveRange.value).toBeNull()
    expect(drag.commit).not.toHaveBeenCalled()
    expect(drag.click).not.toHaveBeenCalled()
  })
})
