import { ref } from 'vue'

// A press this close to the playhead, in pixels, takes hold of it: the same reach as a split's line.
const GRAB_REACH = 6

export interface RangePressSource {
  // Where the playhead is on the canvas, in pixels; null when there is none to take hold of.
  playheadX: () => number | null
  // The time for a pointer at `x` on the canvas.
  seconds: (x: number) => number
  // The playhead is taken hold of, moved to a time, and let go of.
  grab: () => void
  move: (seconds: number) => void
  drop: () => void
}

// The pointer's horizontal position in the canvas's own pixels.
function pointerX(event: PointerEvent) {
  const { left } = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return event.clientX - left
}

// Whether a pointer at `x` is within reach of a playhead at `playhead`, if there is one.
function isNear(x: number, playhead: number | null) {
  return playhead !== null && Math.abs(x - playhead) <= GRAB_REACH
}

/*
The pointer handlers of the Range view: what a press on it does. A press within 6 px of the
playhead takes hold of it, before anything else (spec stories 26–31); the view keeps the pointer
while the drag lasts, every move sets the playhead's time through `move` (the pointer's distance from
the line when it was grabbed is kept, so the line does not jump), and the release lets go. With no
drag on, a move only says whether the pointer is over the playhead, for the cursor.
*/
export function useRangePress({ playheadX, seconds, grab, move, drop }: RangePressSource) {
  const overPlayhead = ref(false)
  const dragging = ref(false)
  let grabOffset = 0

  function onPointerDown(event: PointerEvent) {
    const x = pointerX(event)
    const playhead = playheadX()
    if (playhead === null || !isNear(x, playhead)) return
    grabOffset = x - playhead
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    grab()
  }

  function onPointerMove(event: PointerEvent) {
    const x = pointerX(event)
    if (!dragging.value) {
      overPlayhead.value = isNear(x, playheadX())
      return
    }
    move(seconds(x - grabOffset))
  }

  function onPointerEnd() {
    if (!dragging.value) return
    dragging.value = false
    drop()
  }

  return { overPlayhead, dragging, onPointerDown, onPointerMove, onPointerEnd }
}
