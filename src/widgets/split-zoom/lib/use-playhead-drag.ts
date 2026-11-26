import { ref } from 'vue'

import { usePlayerStore } from '../model/player.ts'
import { pointerX } from './pointer-x.ts'
import type { StretchAxis } from './stretch-axis.ts'

// A press this close to the playhead, in pixels, takes hold of it: the same reach as a split's line.
const GRAB_REACH = 6

/*
Dragging the playhead along a stretch, for the Range view and the Track view. `tryGrab` is what a
view's pointer-down asks first: it answers whether the press took hold of the playhead, and what any
other press means is the view's to say. The view keeps the pointer while the drag lasts, every move
seeks the player to the time under the pointer (the pointer's distance from the line when it was
grabbed is kept, so the line does not jump), and the release lets go, which the player needs to
resume a playing stretch. With no drag on, a move only says whether the pointer is over the
playhead, for the cursor. The axis is a getter so a resize is always seen; it is null with nothing on
show.
*/
export function usePlayheadDrag(axis: () => StretchAxis | null) {
  const player = usePlayerStore()
  const overPlayhead = ref(false)
  const dragging = ref(false)
  let grabOffset = 0

  // Where the playhead is on the canvas, in pixels; null with nothing on show.
  function playheadX() {
    return axis()?.toX(player.playheadSeconds() ?? 0) ?? null
  }

  function isNear(x: number) {
    const playhead = playheadX()
    return playhead !== null && Math.abs(x - playhead) <= GRAB_REACH
  }

  function tryGrab(event: PointerEvent) {
    // Only the primary button: a right-click opens the browser's menu, not a mark.
    if (event.button !== 0) return false
    // A press while the playhead is held: the release never came, or a second finger. Let go first.
    onPointerEnd()
    const x = pointerX(event)
    const playhead = playheadX()
    if (playhead === null || !isNear(x)) return false
    grabOffset = x - playhead
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    player.grabPlayhead()
    return true
  }

  function onPointerMove(event: PointerEvent) {
    const x = pointerX(event)
    if (!dragging.value) {
      overPlayhead.value = isNear(x)
      return
    }
    // No button held: the release never came (Chrome drops it under a context menu), so let go.
    if (event.buttons === 0) {
      onPointerEnd()
      return
    }
    const seconds = axis()?.toSeconds(x - grabOffset)
    if (seconds !== undefined) player.seek(seconds)
  }

  // A release, a cancel and a lost capture all end the drag.
  function onPointerEnd() {
    if (!dragging.value) return
    dragging.value = false
    player.dropPlayhead()
  }

  return { overPlayhead, dragging, tryGrab, onPointerMove, onPointerEnd }
}
