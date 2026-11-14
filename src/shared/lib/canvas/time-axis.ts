// The whole-file canvases put 0 s on the left edge and the file's end on the right edge.
export function timeToX(seconds: number, durationSeconds: number, width: number): number {
  return durationSeconds > 0 ? (seconds / durationSeconds) * width : 0
}

// The inverse of `timeToX`: the time under a pixel of a whole-file canvas.
export function xToTime(x: number, durationSeconds: number, width: number): number {
  return width > 0 ? (x / width) * durationSeconds : 0
}
