// 10 ms is fine enough for the zoom view (about one bucket per pixel) and small enough to keep.
const BUCKET_SECONDS = 0.01

/*
The lowest and highest sample of every 10 ms bucket of a mono signal, as one array:
[min0, max0, min1, max1, …]. A screen cannot show millions of samples, but a line from a bucket's
min to its max shows everything that happened in it, so no loud moment disappears.

A bucket is a whole number of samples, so its length is rounded (441 at 44.1 kHz, 480 at 48 kHz).
The last bucket may be shorter and is kept.
*/
export function minMaxPeaks(mono: Float32Array, sampleRate: number): Float32Array {
  const bucketSize = Math.round(sampleRate * BUCKET_SECONDS)
  const bucketCount = Math.ceil(mono.length / bucketSize)
  const peaks = new Float32Array(bucketCount * 2)

  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = bucket * bucketSize
    const end = Math.min(start + bucketSize, mono.length)
    let min = Infinity
    let max = -Infinity
    for (let index = start; index < end; index++) {
      const sample = mono[index] ?? 0
      if (sample < min) min = sample
      if (sample > max) max = sample
    }
    peaks[bucket * 2] = min
    peaks[bucket * 2 + 1] = max
  }
  return peaks
}
