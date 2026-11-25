import { computed, ref } from 'vue'

import {
  aroundByColumn,
  depthFromPointer,
  isOnMovingLine,
  movingLineColumns,
} from './moving-line.ts'
import { curveY } from './threshold-line.ts'

export interface DepthDragSource {
  // The loudness around, one value per window, null before the file opens.
  around: () => Float32Array | null
  // The current depth in dB.
  depth: () => number
  set: (decibels: number) => void
}

// The pointer's place in the canvas's own pixels, and the canvas's size.
function pointerPosition(event: PointerEvent) {
  const { left, top, width, height } = (
    event.currentTarget as HTMLCanvasElement
  ).getBoundingClientRect()
  return { x: event.clientX - left, y: event.clientY - top, width, height }
}

/*
The pointer handlers that let the moving line be dragged up and down, as `useThresholdDrag` does for
the fixed one. The line is a curve, so a press takes hold of it at the column it was pressed on and
that column's level follows the pointer, which moves the whole line by the same number of dB. Every
move sets the depth in tenths of a dB through `set`. The caller lets the threshold line go first,
where both are under the pointer.
*/
export function useDepthDrag({ around, depth, set }: DepthDragSource) {
  const overLine = ref(false)
  // While a drag is on: where the line was grabbed, and how far under it the pointer was.
  const grab = ref<{ aroundAtGrab: number; offset: number } | null>(null)

  function lineAt(width: number) {
    const loudness = around()
    return loudness === null ? null : movingLineColumns(loudness, depth(), Math.floor(width))
  }

  function onPointerDown(event: PointerEvent) {
    const { x, y, width, height } = pointerPosition(event)
    const loudness = around()
    const line = lineAt(width)
    if (loudness === null || line === null || !isOnMovingLine(x, y, line, height)) return
    const column = Math.min(Math.max(Math.floor(x), 0), line.length - 1)
    const aroundAtGrab = aroundByColumn(loudness, line.length)[column] ?? 0
    grab.value = { aroundAtGrab, offset: y - curveY(aroundAtGrab - depth(), height) }
    ;(event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    const { x, y, width, height } = pointerPosition(event)
    if (grab.value === null) {
      const line = lineAt(width)
      overLine.value = line !== null && isOnMovingLine(x, y, line, height)
      return
    }
    const decibels = depthFromPointer(grab.value.aroundAtGrab, y, grab.value.offset, height)
    if (decibels !== depth()) set(decibels)
  }

  function onPointerEnd() {
    grab.value = null
  }

  // Whether a drag of the line is on.
  const isDragging = computed(() => grab.value !== null)

  return { overLine, isDragging, onPointerDown, onPointerMove, onPointerEnd }
}
