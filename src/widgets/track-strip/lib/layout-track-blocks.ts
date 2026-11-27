// The split item between two blocks, which is the land between them: 8 px (DESIGN.md).
export const SPLIT_ITEM_PX = 8
// A block never gets narrower than this, so a very short track stays a block that can be clicked.
const MIN_BLOCK_PX = 12
// From this width a block shows its name (the text is cut with an ellipsis if it is longer).
const NAME_FROM_PX = 32
// From this width a block shows its length under the name.
const LENGTH_FROM_PX = 72

export function layoutTrackBlocks(
  lengthsSeconds: readonly number[],
  stripWidthPx: number,
): { widthPx: number; showName: boolean; showLength: boolean }[] {
  const count = lengthsSeconds.length
  const available = Math.max(0, stripWidthPx - SPLIT_ITEM_PX * Math.max(0, count - 1))
  const widths = proportionalWidths(lengthsSeconds, available)
  return widths.map((widthPx) => ({
    widthPx,
    showName: widthPx >= NAME_FROM_PX,
    showLength: widthPx >= LENGTH_FROM_PX,
  }))
}

/*
Widths proportional to the lengths, summing to `available`. A block that would fall under
the minimum is pinned to it and the others share what is left, until none is left under.
*/
function proportionalWidths(lengths: readonly number[], available: number): number[] {
  if (lengths.length === 0) return []
  const total = sumOf(lengths)
  // No length to go by (or no room for even the minimums): equal blocks.
  if (total <= 0 || available <= lengths.length * MIN_BLOCK_PX) {
    return lengths.map(() => available / lengths.length)
  }

  const pinned = new Set<number>()
  for (;;) {
    const free = available - pinned.size * MIN_BLOCK_PX
    const freeLength = sumOf(lengths.filter((_length, index) => !pinned.has(index)))
    const tooNarrow = lengths.flatMap((length, index) =>
      !pinned.has(index) && (length / freeLength) * free < MIN_BLOCK_PX ? [index] : [],
    )
    if (tooNarrow.length === 0) {
      return lengths.map((length, index) =>
        pinned.has(index) ? MIN_BLOCK_PX : (length / freeLength) * free,
      )
    }
    for (const index of tooNarrow) pinned.add(index)
  }
}

function sumOf(values: readonly number[]): number {
  let sum = 0
  for (const value of values) sum += value
  return sum
}
