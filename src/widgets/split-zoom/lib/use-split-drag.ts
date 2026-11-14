import { ref } from 'vue'

/*
DESIGN.md's handle is 14 px wide, so a press 7 px either side of the line is on the handle; the
line itself is 3 px wide. One reach covers both.
*/
const GRAB_REACH = 8

export interface SplitDragSource {
  // Where the selected split's line is on the canvas, in pixels; null with no split selected.
  lineX: () => number | null
  // The time for a pointer at `x` that took hold of the line `grabOffset` px from its centre.
  seconds: (x: number, grabOffset: number) => number
  move: (seconds: number) => void
}

// The pointer's horizontal position in the canvas's own pixels.
function pointerX(event: PointerEvent) {
  const { left } = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return event.clientX - left
}

/*
The pointer handlers that let the selected split be dragged along the zoom view. They sit on the
element that holds both the canvas and the handle, so a press on the handle and a press on the
line are the same. A press within reach of the line takes hold of it (remembering how far from its
centre the pointer was), the element keeps the pointer while the drag lasts, and every move sets
the split's time through `move`. With no drag on, a move only says whether the pointer is over the
line, for the cursor.
*/
export function useSplitDrag({ lineX, seconds, move }: SplitDragSource) {
  const overLine = ref(false)
  const dragging = ref(false)
  let grabOffset = 0

  function isOnLine(x: number) {
    const line = lineX()
    return line !== null && Math.abs(x - line) <= GRAB_REACH
  }

  function onPointerDown(event: PointerEvent) {
    const x = pointerX(event)
    const line = lineX()
    if (line === null || !isOnLine(x)) return
    grabOffset = x - line
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    const x = pointerX(event)
    if (!dragging.value) {
      overLine.value = isOnLine(x)
      return
    }
    move(seconds(x, grabOffset))
  }

  function onPointerEnd() {
    dragging.value = false
  }

  return { overLine, dragging, onPointerDown, onPointerMove, onPointerEnd }
}
