/*
Merges 10 ms min/max buckets ([min0, max0, min1, max1, …]) into `barCount` bars of the same shape.
A bar takes the lowest min and the highest max of the buckets under it, so a merged picture still
shows every loud moment. An hour on a 900 px canvas puts about 1,200 buckets into each bar.
*/
export function mergePeaks(peaks: Float32Array, barCount: number): Float32Array {
  const bucketCount = peaks.length / 2
  const bars = new Float32Array(barCount * 2)

  for (let bar = 0; bar < barCount; bar++) {
    const first = Math.floor((bar * bucketCount) / barCount)
    // With fewer buckets than bars, a bar still shows the bucket it falls in.
    const end = Math.max(first + 1, Math.floor(((bar + 1) * bucketCount) / barCount))
    let min = Infinity
    let max = -Infinity
    for (let bucket = first; bucket < end; bucket++) {
      min = Math.min(min, peaks[bucket * 2] ?? 0)
      max = Math.max(max, peaks[bucket * 2 + 1] ?? 0)
    }
    bars[bar * 2] = min
    bars[bar * 2 + 1] = max
  }
  return bars
}
