/*
The middle value of the sorted values; for an even count, the mean of the two middle ones.
Sorts a copy, so the caller's curve keeps its time order.
*/
export function median(values: Float32Array): number {
  if (values.length === 0) throw new RangeError('The median of no values does not exist')

  const sorted = Float32Array.from(values)
  sorted.sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  // Both indices are inside the array: the length is at least 1.
  const upper = sorted[middle] ?? NaN
  const lower = sorted[middle - 1] ?? NaN
  return sorted.length % 2 === 1 ? upper : (lower + upper) / 2
}
