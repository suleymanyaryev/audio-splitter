export interface SplitNumberLabel {
  // Where the split's line is, in canvas pixels.
  x: number
  // How wide its number is set.
  textWidth: number
}

export interface PlacedSplitNumber {
  // Position in the input: the split's index, so its number is index + 1.
  index: number
  // Left edge of the number, in canvas pixels.
  left: number
}

// The clear space kept between two numbers.
const NUMBER_GAP = 4

/*
Where to set each split's number in the band above the whole-file waveform: centred on its line,
moved inwards where that would cut it off at a canvas edge. Dozens of splits crowd the band (an
hour at 15 dB and 1 s has 65 on about 1,200 px), so the numbers go left to right and one that would
come within `NUMBER_GAP` of the last number shown is left out. The first split always shows, and
the thinning changes only when the splits or the width do. A line without a number still marks its
split.
*/
export function placeSplitNumbers(
  labels: readonly SplitNumberLabel[],
  canvasWidth: number,
): PlacedSplitNumber[] {
  const placed: PlacedSplitNumber[] = []
  let lastRight = -Infinity
  for (const [index, { x, textWidth }] of labels.entries()) {
    const left = Math.min(Math.max(0, x - textWidth / 2), Math.max(0, canvasWidth - textWidth))
    if (left < lastRight + NUMBER_GAP) continue
    placed.push({ index, left })
    lastRight = left + textWidth
  }
  return placed
}
