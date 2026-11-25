/*
A split Find splits was less than sure of (GLOSSARY.md: Confidence) is marked at the foot of its
line: a hollow ring for a likely one, a filled disc, the stronger mark, for a doubtful one. A sure
split, and any split the user placed, has no mark and looks as it always did.
*/
export type SplitMark = 'ring' | 'disc'

// The band names that `entities/split` gives a confidence (the canvases may not import it).
export function markOfBand(
  band: 'sure' | 'likely' | 'doubtful' | null | undefined,
): SplitMark | null {
  if (band === 'likely') return 'ring'
  return band === 'doubtful' ? 'disc' : null
}

// DESIGN.md: a mark is 8 px across (a doubtful disc 9), 7 px up from the foot of its line.
const RING_RADIUS = 3.25
const DISC_RADIUS = 4
const MARK_LINE_WIDTH = 1.5
const FOOT_DISTANCE = 7

/*
One mark at the foot of each line that has one, centred on its x, over the vertical extent `top` to
`top + height`. `ringFill` is the panel's surface colour, so a ring reads as hollow over bars and
lands, and the lines keep the same extent as `drawSplitLines`.
*/
export function drawConfidenceMarks(
  context: CanvasRenderingContext2D,
  xs: readonly number[],
  marks: readonly (SplitMark | null)[],
  color: string,
  ringFill: string,
  top: number,
  height: number,
) {
  const y = top + height - FOOT_DISTANCE
  context.strokeStyle = color
  context.lineWidth = MARK_LINE_WIDTH
  for (const [index, x] of xs.entries()) {
    const mark = marks[index]
    if (mark === null || mark === undefined) continue
    context.beginPath()
    context.arc(x, y, mark === 'ring' ? RING_RADIUS : DISC_RADIUS, 0, 2 * Math.PI)
    context.fillStyle = mark === 'ring' ? ringFill : color
    context.fill()
    context.stroke()
  }
}
