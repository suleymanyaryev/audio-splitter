import { ref } from 'vue'

import { curveY, isOnThresholdLine, thresholdFromPointer } from './threshold-line.ts'

export interface ThresholdDragSource {
  // The current threshold in dB, null before the first detection.
  threshold: () => number | null
  // Returns false when the change was held back (to ask about it first), which ends the drag.
  set: (decibels: number) => boolean
}

// The pointer's vertical position and the canvas height, in the canvas's own pixels.
function pointerPosition(event: PointerEvent) {
  const { top, height } = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect()
  return { y: event.clientY - top, height }
}

/*
The pointer handlers that let the dashed threshold line be dragged up and down on its canvas.
A press within reach of the line takes hold of it (remembering how far under it the pointer was, so
the line does not jump), the canvas keeps the pointer while the drag lasts, and every move sets the
threshold in tenths of a dB through `set`; a `set` that holds the change back lets the pointer
go, so one press asks once. With no drag on, a move only says whether the pointer
is over the line, for the cursor.
*/
export function useThresholdDrag({ threshold, set }: ThresholdDragSource) {
  // The pointer is on the line, or dragging it: the cursor says the line moves up and down.
  const overLine = ref(false)
  // While a drag is on: how far under the line the pointer took hold of it.
  const grabOffset = ref<number | null>(null)

  function lineY(height: number): number | null {
    const decibels = threshold()
    return decibels === null ? null : curveY(decibels, height)
  }

  function onPointerDown(event: PointerEvent) {
    const { y, height } = pointerPosition(event)
    const line = lineY(height)
    if (line === null || !isOnThresholdLine(y, line)) return
    grabOffset.value = y - line
    ;(event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    const { y, height } = pointerPosition(event)
    if (grabOffset.value === null) {
      const line = lineY(height)
      overLine.value = line !== null && isOnThresholdLine(y, line)
      return
    }
    const decibels = thresholdFromPointer(y, grabOffset.value, height)
    if (decibels === threshold() || set(decibels)) return
    grabOffset.value = null
    ;(event.currentTarget as HTMLCanvasElement).releasePointerCapture(event.pointerId)
  }

  function onPointerEnd() {
    grabOffset.value = null
  }

  return { overLine, onPointerDown, onPointerMove, onPointerEnd }
}
