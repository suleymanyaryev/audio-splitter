// The whole-file canvases put 0 s on the left edge and the file's end on the right edge.
export function timeToX(seconds: number, durationSeconds: number, width: number): number {
  return durationSeconds > 0 ? (seconds / durationSeconds) * width : 0
}
