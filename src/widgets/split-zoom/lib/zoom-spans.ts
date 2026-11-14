import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'

export interface Span {
  left: number
  right: number
}

export interface GapInSeconds {
  startSeconds: number
  endSeconds: number
}

/*
The horizontal extent of every gap that is in the zoom window, at its true width: the zoom view
never widens a land (DESIGN.md's Land Rule is for whole-file views). A gap that crosses an edge of
the window is cut there, and one wholly outside it is left out.
*/
export function landSpansInWindow(
  gaps: readonly GapInSeconds[],
  centreSeconds: number,
  windowSeconds: number,
  width: number,
): Span[] {
  const spans: Span[] = []
  for (const gap of gaps) {
    const left = Math.max(0, zoomTimeToX(gap.startSeconds, centreSeconds, windowSeconds, width))
    const right = Math.min(width, zoomTimeToX(gap.endSeconds, centreSeconds, windowSeconds, width))
    if (right > left) spans.push({ left, right })
  }
  return spans
}

/*
The parts of the zoom canvas that are not the file: before 0 s and past the duration. The window
stays centred on its split near the file's ends, so these are empty ground rather than a shifted
window.
*/
export function outsideFileSpans(
  centreSeconds: number,
  windowSeconds: number,
  durationSeconds: number,
  width: number,
): Span[] {
  const spans: Span[] = []
  const fileStart = Math.min(
    width,
    Math.max(0, zoomTimeToX(0, centreSeconds, windowSeconds, width)),
  )
  const fileEnd = Math.max(
    0,
    Math.min(width, zoomTimeToX(durationSeconds, centreSeconds, windowSeconds, width)),
  )
  if (fileStart > 0) spans.push({ left: 0, right: fileStart })
  if (fileEnd < width) spans.push({ left: fileEnd, right: width })
  return spans
}
