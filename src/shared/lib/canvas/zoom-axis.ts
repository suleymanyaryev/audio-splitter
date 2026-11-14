/*
The zoom view's map: a window `windowSeconds` wide centred on `centreSeconds` fills the canvas, so
the centre is always at half the width. The window may reach before 0 s or past the file's end;
those times map to pixels like any other. The window's width is data, not a constant, because it
belongs to the split slice and shared code cannot import it.
*/
export function zoomTimeToX(
  seconds: number,
  centreSeconds: number,
  windowSeconds: number,
  width: number,
): number {
  return ((seconds - (centreSeconds - windowSeconds / 2)) / windowSeconds) * width
}

// The inverse of `zoomTimeToX`: the time under a pixel of the zoom canvas.
export function zoomXToTime(
  x: number,
  centreSeconds: number,
  windowSeconds: number,
  width: number,
): number {
  const startSeconds = centreSeconds - windowSeconds / 2
  return width > 0 ? startSeconds + (x / width) * windowSeconds : startSeconds
}
