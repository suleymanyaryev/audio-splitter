import { ref } from 'vue'

import type { TimeRange } from '@/entities/split/lib/range-between.ts'

// A press that moves less than this stays a click, so a shaky click selects a split as before.
const DRAG_THRESHOLD_PX = 4

export interface RangeDragSource {
  // The time under a pointer at `x`, in the canvas's pixels; it may lie outside the file.
  timeAt: (x: number) => number
  // The range a drag from `anchor` to `pointer` makes, as the split store would hold it, or null.
  rangeBetween: (anchorSeconds: number, pointerSeconds: number) => TimeRange | null
  // Holds the range; false when it is refused, which makes the drag a click.
  commit: (anchorSeconds: number, pointerSeconds: number) => boolean
  // What a click at `x` does: select a split, or move the zoom window.
  click: (x: number) => void
}

// The pointer's horizontal position in the canvas's own pixels.
function pointerX(event: PointerEvent) {
  const { left } = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return event.clientX - left
}

/*
The pointer handlers that tell a click from a drag on the whole-file view (GLOSSARY.md, Range). A
press takes hold of the pointer, so a drag that leaves the canvas goes on, and nothing happens
until it has moved 4 px: then every move sets `liveRange` for the overlay. A release ends it as a
range when `commit` accepts it, else as a click where the press began: a press that never moved
4 px, and a drag under 1 s, are both clicks. A press anywhere starts a drag, a split's line
included, so the whole-file view never moves a split by accident.
*/
export function useRangeDrag({ timeAt, rangeBetween, commit, click }: RangeDragSource) {
  // Null with no press, and while the pointer has not left the click's 4 px: nothing to draw.
  const liveRange = ref<TimeRange | null>(null)
  let pressX: number | null = null
  // Only the pointer that pressed counts: a second finger or pen must not move or end the drag.
  let pressPointerId = 0
  let anchorSeconds = 0
  let isDragging = false

  function resetPress() {
    pressX = null
    isDragging = false
    liveRange.value = null
  }

  function onPointerDown(event: PointerEvent) {
    // A second press while one is held would move the anchor under a drag.
    if (pressX !== null || event.button !== 0) return
    pressPointerId = event.pointerId
    pressX = pointerX(event)
    anchorSeconds = timeAt(pressX)
    isDragging = false
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (pressX === null || event.pointerId !== pressPointerId) return
    const x = pointerX(event)
    // Once a drag, always a drag: coming back to the press must not turn it into a click.
    if (!isDragging && Math.abs(x - pressX) < DRAG_THRESHOLD_PX) return
    isDragging = true
    liveRange.value = rangeBetween(anchorSeconds, timeAt(x))
  }

  function onPointerUp(event: PointerEvent) {
    if (pressX === null || event.pointerId !== pressPointerId) return
    const startedAt = pressX
    const committed = isDragging && commit(anchorSeconds, timeAt(pointerX(event)))
    resetPress()
    if (!committed) click(startedAt)
  }

  // The browser took the pointer away (a gesture, a lost capture): neither a range nor a click.
  function onPointerCancel() {
    resetPress()
  }

  return { liveRange, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
