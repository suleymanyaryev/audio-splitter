import { ref } from 'vue'

import { hitTestSplit } from '@/shared/lib/canvas/hit-test-split.ts'

// A press this close to the playhead, in pixels, takes hold of it: the same reach as a split's line.
const GRAB_REACH = 6

export interface RangePressSource {
  // Where the playhead is on the canvas, in pixels; null when there is none to take hold of.
  playheadX: () => number | null
  // Where each split's line is on the canvas, in pixels, in the order of the splits.
  splitXs: () => readonly number[]
  // The time for a pointer at `x` on the canvas.
  seconds: (x: number) => number
  // The playhead is taken hold of, moved to a time, and let go of.
  grab: () => void
  move: (seconds: number) => void
  drop: () => void
  // A double-click on the split at that index of `splitXs` selects it.
  selectSplit: (index: number) => void
  // A single press puts the mark at a time.
  placeMark: (seconds: number) => void
}

// The pointer's horizontal position in the canvas's own pixels.
function pointerX(event: MouseEvent) {
  const { left } = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return event.clientX - left
}

// Whether a pointer at `x` is within reach of a playhead at `playhead`, if there is one.
function isNear(x: number, playhead: number | null) {
  return playhead !== null && Math.abs(x - playhead) <= GRAB_REACH
}

/*
The pointer handlers of the Range view: a single press takes hold of the playhead within 6 px of it,
and otherwise places the mark. A split line is never hit by a single press, so pointing next to one
does not leave the view. A double-click selects the split whose line is within 6 px, and otherwise
moves the playhead there. Only the playhead is dragged: the view keeps the pointer while the
drag lasts, every move sets the playhead's time through `move` (the pointer's distance from the line
when it was grabbed is kept, so the line does not jump), and the release lets go. With no drag on, a
move only says whether the pointer is over the playhead, for the cursor.
*/
export function useRangePress({
  playheadX,
  splitXs,
  seconds,
  grab,
  move,
  drop,
  selectSplit,
  placeMark,
}: RangePressSource) {
  const overPlayhead = ref(false)
  const dragging = ref(false)
  let grabOffset = 0

  function onPointerDown(event: PointerEvent) {
    // Only the primary button: a right-click opens the browser's menu, not a mark.
    if (event.button !== 0) return
    // A press while the playhead is held: the release never came, or a second finger. Let go first.
    onPointerEnd()
    const x = pointerX(event)
    const playhead = playheadX()
    if (playhead !== null && isNear(x, playhead)) {
      grabOffset = x - playhead
      dragging.value = true
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      grab()
      return
    }
    placeMark(seconds(x))
  }

  function onDoubleClick(event: MouseEvent) {
    if (event.button !== 0) return
    const x = pointerX(event)
    const line = hitTestSplit(x, splitXs())
    if (line === null) move(seconds(x))
    else selectSplit(line)
  }

  function onPointerMove(event: PointerEvent) {
    const x = pointerX(event)
    if (!dragging.value) {
      overPlayhead.value = isNear(x, playheadX())
      return
    }
    // No button held: the release never came (Chrome drops it under a context menu), so let go.
    if (event.buttons === 0) {
      onPointerEnd()
      return
    }
    move(seconds(x - grabOffset))
  }

  function onPointerEnd() {
    if (!dragging.value) return
    dragging.value = false
    drop()
  }

  return { overPlayhead, dragging, onPointerDown, onPointerMove, onPointerEnd, onDoubleClick }
}
