import { zoomXToTime } from '@/shared/lib/canvas/zoom-axis.ts'

// A drag lands on a bucket border, like the arrow keys do: 10 ms steps.
const SNAPS_PER_SECOND = 100

/*
The time a dragged split goes to: the pointer's x on the zoom canvas, less how far from the line
the pointer took hold of it (so the line does not jump), on the zoom map, rounded to the nearest
10 ms. The store then holds it to its limits.
*/
export function draggedTime(
  pointerX: number,
  grabOffset: number,
  centreSeconds: number,
  windowSeconds: number,
  width: number,
): number {
  const seconds = zoomXToTime(pointerX - grabOffset, centreSeconds, windowSeconds, width)
  return Math.round(seconds * SNAPS_PER_SECOND) / SNAPS_PER_SECOND
}
