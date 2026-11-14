// 10 ms is fine enough for the zoom view (about one bucket per pixel) and small enough to keep.
export const PEAK_BUCKET_SECONDS = 0.01

/*
Builds the lowest and highest sample of every 10 ms bucket of a mono signal, as one array:
[min0, max0, min1, max1, …]. A screen cannot show millions of samples, but a line from a bucket's
min to its max shows everything that happened in it, so no loud moment disappears.

The signal arrives slice by slice with `push`. A bucket is a whole number of samples, so its length
is rounded (441 at 44.1 kHz, 480 at 48 kHz, 221 at 22.05 kHz), and a slice can end in the middle of
one. That open bucket is the leftover: the builder keeps its running min, max and sample count, and
the next `push` carries on from there. The min and max of the parts, combined, are the min and max of
the whole bucket, so this is the same as keeping the leftover samples themselves, and much smaller.
Only the last bucket of the file may be shorter than the rest.
*/
export function createPeaksBuilder(sampleRate: number) {
  const bucketSize = Math.round(sampleRate * PEAK_BUCKET_SECONDS)
  // One array of closed buckets per push, joined once in `finish`.
  const chunks: Float32Array[] = []
  let length = 0

  // The open bucket.
  let min = Infinity
  let max = -Infinity
  let count = 0

  return {
    push(mono: Float32Array): void {
      const closing = Math.floor((count + mono.length) / bucketSize)
      const chunk = new Float32Array(closing * 2)
      let closed = 0

      for (const sample of mono) {
        if (sample < min) min = sample
        if (sample > max) max = sample
        count++
        if (count < bucketSize) continue

        chunk[closed * 2] = min
        chunk[closed * 2 + 1] = max
        closed++
        min = Infinity
        max = -Infinity
        count = 0
      }
      chunks.push(chunk)
      length += chunk.length
    },

    // Closes the last, shorter bucket if it has samples, and returns every bucket's peaks.
    finish(): Float32Array {
      if (count > 0) {
        chunks.push(Float32Array.of(min, max))
        length += 2
        min = Infinity
        max = -Infinity
        count = 0
      }

      const peaks = new Float32Array(length)
      let offset = 0
      for (const chunk of chunks) {
        peaks.set(chunk, offset)
        offset += chunk.length
      }
      return peaks
    },
  }
}
