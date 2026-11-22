export interface EdgeRect {
  x: number
  y: number
  width: number
  height: number
}

// DESIGN.md: a 2 px stem, 16 px long at the top and the bottom, and an 8 px foot pointing inward.
const EDGE_STEM_WIDTH = 2
const EDGE_STEM_LENGTH = 16
const EDGE_FOOT_LENGTH = 8

/*
The rectangles of one edge of the audition: a stem down from the top of the canvas and up from the
bottom, each ending in a foot that points at the audition, so the pair reads as a bracket and not as
the full-height playhead. `inward` is 1 for the start edge (the foot points right) and -1 for the
end edge. The stem is snapped to a whole pixel, as the playhead is.
*/
export function auditionEdgeRects(x: number, inward: 1 | -1, height: number): EdgeRect[] {
  const stemX = Math.round(x - EDGE_STEM_WIDTH / 2)
  const footX = inward === 1 ? stemX : stemX + EDGE_STEM_WIDTH - EDGE_FOOT_LENGTH
  const topFootY = EDGE_STEM_LENGTH - EDGE_STEM_WIDTH
  const bottomFootY = height - EDGE_STEM_LENGTH
  return [
    { x: stemX, y: 0, width: EDGE_STEM_WIDTH, height: EDGE_STEM_LENGTH },
    { x: footX, y: topFootY, width: EDGE_FOOT_LENGTH, height: EDGE_STEM_WIDTH },
    { x: stemX, y: bottomFootY, width: EDGE_STEM_WIDTH, height: EDGE_STEM_LENGTH },
    { x: footX, y: bottomFootY, width: EDGE_FOOT_LENGTH, height: EDGE_STEM_WIDTH },
  ]
}
