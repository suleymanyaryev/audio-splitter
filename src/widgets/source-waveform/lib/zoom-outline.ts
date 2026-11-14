import { timeToX } from '@/shared/lib/canvas/time-axis.ts'

export interface ZoomOutline {
  left: number
  right: number
}

/*
The zoom window as a horizontal extent on the whole-file canvas. Near the file's ends the window
reaches past 0 s or the duration (the zoom view shows that part as empty ground), but the outline
is clipped to the canvas so it never draws outside it.
*/
export function zoomOutline(
  centreSeconds: number,
  windowSeconds: number,
  durationSeconds: number,
  width: number,
): ZoomOutline {
  const half = windowSeconds / 2
  return {
    left: Math.max(0, timeToX(centreSeconds - half, durationSeconds, width)),
    right: Math.min(width, timeToX(centreSeconds + half, durationSeconds, width)),
  }
}
