// DESIGN.md: the whole canvas is framed in 1.5 px ink. The views keep their bars inside it.
export const FRAME_WIDTH = 1.5
// The playhead is one CSS pixel of ink.
const PLAYHEAD_WIDTH = 1

/*
The playhead (GLOSSARY.md): a column of ink over the canvas's height, snapped to a whole CSS pixel
so the line is not smeared over two. A view draws it over its split lines and its mark, which it
must stay readable against, and under the frame.
*/
export function drawPlayhead(
  context: CanvasRenderingContext2D,
  x: number,
  colour: string,
  height: number,
) {
  context.fillStyle = colour
  context.fillRect(Math.round(x - PLAYHEAD_WIDTH / 2), 0, PLAYHEAD_WIDTH, height)
}

// The frame around the whole canvas, the outermost line a view draws, inset so none of it is cut.
export function drawFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  colour: string,
) {
  context.strokeStyle = colour
  context.lineWidth = FRAME_WIDTH
  context.strokeRect(FRAME_WIDTH / 2, FRAME_WIDTH / 2, width - FRAME_WIDTH, height - FRAME_WIDTH)
}
