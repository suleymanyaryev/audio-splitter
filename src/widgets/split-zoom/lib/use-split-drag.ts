import { computed, ref } from 'vue'

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
  // The time for a pointer at `x` that took hold of the playhead: it goes where the pointer is.
  playheadSeconds: (x: number) => number
  // The playhead is taken hold of, moved to a time, and let go of.
  grabPlayhead: () => void
  movePlayhead: (seconds: number) => void
  dropPlayhead: () => void
}

// The pointer's horizontal position in the canvas's own pixels.
function pointerX(event: PointerEvent) {
  const { left } = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return event.clientX - left
}

/*
The pointer handlers of the Split view. They sit on the element that holds both the canvas and the
handle, so a press on the handle and a press on the line are the same. Only the primary button acts.
A press within reach of the selected split's line takes hold of the line (remembering how far from
its centre the pointer was), and every move sets the split's time through `move`. Any other press
takes hold of the playhead instead: it goes to the pointer at once, and follows it until the
release. The element keeps the pointer while either drag lasts, and the release, a move with no
button held (the release never came) or a lost pointer capture lets go. With no drag on, a move
only says whether the pointer is over the line, for the cursor.
*/
export function useSplitDrag({
  lineX,
  seconds,
  move,
  playheadSeconds,
  grabPlayhead,
  movePlayhead,
  dropPlayhead,
}: SplitDragSource) {
  const overLine = ref(false)
  const held = ref<'split' | 'playhead' | null>(null)
  // Only the split's drag shows the resize cursor: the playhead is not what the line's handle is.
  const dragging = computed(() => held.value === 'split')
  let grabOffset = 0

  function isOnLine(x: number) {
    const line = lineX()
    return line !== null && Math.abs(x - line) <= GRAB_REACH
  }

  function onPointerDown(event: PointerEvent) {
    // Only the primary button: a right-click opens the browser's menu and moves nothing.
    if (event.button !== 0) return
    // A press while something is held: the release never came, or a second finger. Let go first.
    onPointerEnd()
    const x = pointerX(event)
    const line = lineX()
    // With no split selected there is no audition to move the playhead in.
    if (line === null) return
    const frame = event.currentTarget as HTMLElement
    frame.setPointerCapture(event.pointerId)
    if (isOnLine(x)) {
      grabOffset = x - line
      held.value = 'split'
      return
    }
    held.value = 'playhead'
    grabPlayhead()
    movePlayhead(playheadSeconds(x))
  }

  function onPointerMove(event: PointerEvent) {
    const x = pointerX(event)
    if (held.value === null) {
      overLine.value = isOnLine(x)
      return
    }
    // No button held: the release never came (Chrome drops it under a context menu), so let go.
    if (event.buttons === 0) {
      onPointerEnd()
      return
    }
    if (held.value === 'split') move(seconds(x, grabOffset))
    else movePlayhead(playheadSeconds(x))
  }

  function onPointerEnd() {
    const was = held.value
    held.value = null
    if (was === 'playhead') dropPlayhead()
  }

  return { overLine, dragging, onPointerDown, onPointerMove, onPointerEnd }
}
