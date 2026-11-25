// The pointer's place in the canvas's own pixels, and the canvas's size.
export function pointerPosition(event: PointerEvent) {
  const { left, top, width, height } = (
    event.currentTarget as HTMLCanvasElement
  ).getBoundingClientRect()
  return { x: event.clientX - left, y: event.clientY - top, width, height }
}
