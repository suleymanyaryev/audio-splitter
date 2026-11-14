/*
Merges 10 ms min/max buckets ([min0, max0, min1, max1, …]) into `barCount` bars of the same shape.
A bar takes the lowest min and the highest max of the buckets under it, so a merged picture still
shows every loud moment. An hour on a 900 px canvas puts about 1,200 buckets into each bar.

The bars cover `startBucket` to `endBucket` (the whole array by default), which may be fractional
and may reach before the first bucket or past the last, as a zoom window near the file's ends does.
A bar with no bucket under it is [0, 0], which draws nothing.
*/
export function mergePeaks(
  peaks: Float32Array,
  barCount: number,
  startBucket = 0,
  endBucket = peaks.length / 2,
): Float32Array {
  const bucketCount = peaks.length / 2
  const bucketsPerBar = (endBucket - startBucket) / barCount
  const bars = new Float32Array(barCount * 2)

  for (let bar = 0; bar < barCount; bar++) {
    const first = Math.floor(startBucket + bar * bucketsPerBar)
    // With fewer buckets than bars, a bar still shows the bucket it falls in.
    const end = Math.max(first + 1, Math.floor(startBucket + (bar + 1) * bucketsPerBar))
    let min = Infinity
    let max = -Infinity
    for (let bucket = Math.max(first, 0); bucket < Math.min(end, bucketCount); bucket++) {
      min = Math.min(min, peaks[bucket * 2] ?? 0)
      max = Math.max(max, peaks[bucket * 2 + 1] ?? 0)
    }
    const isEmpty = min === Infinity
    bars[bar * 2] = isEmpty ? 0 : min
    bars[bar * 2 + 1] = isEmpty ? 0 : max
  }
  return bars
}
