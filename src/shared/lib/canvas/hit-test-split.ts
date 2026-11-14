// A click counts as a click on a split within this many pixels of its line, in every view.
const HIT_TOLERANCE = 6

/*
The index of the split whose line is nearest to a click, when that is within `HIT_TOLERANCE` px,
otherwise null. Two lines can sit under one click on the whole-file view; the nearer one wins, and
the earlier one when they are equally near.
*/
export function hitTestSplit(clickX: number, splitXs: readonly number[]): number | null {
  let nearest: number | null = null
  let nearestDistance = Infinity
  for (const [index, splitX] of splitXs.entries()) {
    const distance = Math.abs(clickX - splitX)
    if (distance > HIT_TOLERANCE || distance >= nearestDistance) continue
    nearest = index
    nearestDistance = distance
  }
  return nearest
}
