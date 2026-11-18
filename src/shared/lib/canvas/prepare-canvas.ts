export type PreparedCanvas = {
  context: CanvasRenderingContext2D
  // The canvas's size in CSS pixels, which is the unit the drawing code works in.
  width: number
  height: number
}

/*
Clears a canvas for a new draw and returns its 2D context with the CSS size. The backing store is
sized to the screen's real pixel density and the context scaled to match, so bars and lines stay
sharp on a Retina display while the caller draws in CSS pixels. Null when there is no 2D context.
*/
export function prepareCanvas(element: HTMLCanvasElement): PreparedCanvas | null {
  const context = element.getContext('2d')
  if (!context) return null

  const { width, height } = element.getBoundingClientRect()
  const scale = globalThis.devicePixelRatio || 1
  element.width = Math.round(width * scale)
  element.height = Math.round(height * scale)
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.clearRect(0, 0, width, height)
  return { context, width, height }
}
