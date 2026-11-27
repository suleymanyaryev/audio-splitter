/*
A split Find splits was less than sure of (GLOSSARY.md: Confidence) is marked at the foot of its
line: a hollow ring for a likely one, a filled disc, the stronger mark, for a doubtful one. A sure
split, and any split the user placed, has no mark and looks as it always did.
*/
export type SplitMark = 'ring' | 'disc'

// The band names that `entities/split` gives a confidence (the canvases may not import it).
function markOfBand(band: 'sure' | 'likely' | 'doubtful' | null | undefined): SplitMark | null {
  if (band === 'likely') return 'ring'
  return band === 'doubtful' ? 'disc' : null
}

// DESIGN.md: a ring 6.5 px across, a disc 8 px, 7 px up from the foot of the line.
const RING_RADIUS = 3.25
const DISC_RADIUS = 4
const MARK_LINE_WIDTH = 1.5
const FOOT_DISTANCE = 7

// What a canvas needs of a split to mark it: the band of its confidence, if it has one.
interface MarkedSplit {
  confidence: { band: 'sure' | 'likely' | 'doubtful' } | null
}

/*
One mark at the foot of each line that has one, centred on its x (`xs[i]` is the line of `splits[i]`),
over the vertical extent `top` to `top + height`, which is the lines' extent in `drawSplitLines`. The
colours are the theme's: a ring is filled with the panel's surface, so it reads as hollow over bars
and lands.
*/
export function drawConfidenceMarks(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  splits: readonly MarkedSplit[],
  xs: readonly number[],
  top: number,
  height: number,
) {
  const color = style.getPropertyValue('--color-split')
  const ringFill = style.getPropertyValue('--color-surface')
  const y = top + height - FOOT_DISTANCE
  context.strokeStyle = color
  context.lineWidth = MARK_LINE_WIDTH
  for (const [index, x] of xs.entries()) {
    const mark = markOfBand(splits[index]?.confidence?.band)
    if (mark === null) continue
    context.beginPath()
    context.arc(x, y, mark === 'ring' ? RING_RADIUS : DISC_RADIUS, 0, 2 * Math.PI)
    context.fillStyle = mark === 'ring' ? ringFill : color
    context.fill()
    context.stroke()
  }
}
