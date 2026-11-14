export interface SplitNumberLabel {
  // Where the split's line is, in canvas pixels.
  x: number
  // How wide its number is set.
  textWidth: number
}

export interface PlacedSplitNumber {
  // Position in the input: the split's index, so its number is index + 1.
  index: number
  // Left edge of the number (or of the selected split's circle), in canvas pixels.
  left: number
}

// DESIGN.md: the selected split's number sits in a filled circle 20 px across.
export const CHIP_DIAMETER = 20

// The clear space kept between two numbers.
const NUMBER_GAP = 4

/*
Where to set each split's number in the band above the whole-file waveform: centred on its line,
moved inwards where that would cut it off at a canvas edge. Dozens of splits crowd the band (an
hour at 15 dB and 1 s has 65 on about 1,200 px), so the numbers go left to right and one that would
come within `NUMBER_GAP` of the last number shown is left out. The first split always shows, and
the thinning changes only when the splits or the width do. A line without a number still marks its
split.

The selected split's number is always shown, in a circle `CHIP_DIAMETER` wide: the numbers that
would touch it are the ones left out, and the first split gives way to it.
*/
export function placeSplitNumbers(
  labels: readonly SplitNumberLabel[],
  canvasWidth: number,
  selectedIndex: number | null = null,
): PlacedSplitNumber[] {
  const placed: PlacedSplitNumber[] = []
  let lastRight = -Infinity
  const selected = selectedIndex === null ? undefined : labels[selectedIndex]
  const chipLeft =
    selected === undefined
      ? 0
      : Math.min(
          Math.max(0, selected.x - CHIP_DIAMETER / 2),
          Math.max(0, canvasWidth - CHIP_DIAMETER),
        )

  for (const [index, { x, textWidth }] of labels.entries()) {
    if (selected !== undefined && index === selectedIndex) {
      placed.push({ index, left: chipLeft })
      lastRight = chipLeft + CHIP_DIAMETER
      continue
    }
    const left = Math.min(Math.max(0, x - textWidth / 2), Math.max(0, canvasWidth - textWidth))
    if (left < lastRight + NUMBER_GAP) continue
    /*
    A number after the circle must also clear it, which `lastRight` already holds; one before
    it must end a gap short of the circle's left edge.
    */
    if (
      selected !== undefined &&
      index < (selectedIndex ?? 0) &&
      left + textWidth + NUMBER_GAP > chipLeft
    )
      continue
    placed.push({ index, left })
    lastRight = left + textWidth
  }
  return placed
}
