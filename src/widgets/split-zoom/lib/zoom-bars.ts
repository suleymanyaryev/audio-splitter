import { mergePeaks } from '@/shared/lib/audio/merge-peaks.ts'

/*
The bars of the zoom view, [min0, max0, min1, max1, …] from the left edge of the canvas. A bar is
`barPitch` px of the window wide, so a window of 20 s on 900 px puts about 6.7 buckets under each
bar of a 3 px pitch. The count is rounded up so the last pixels have a bar; the last bar may reach
a little past the window. Where the window reaches before 0 s or past the file's end the bars are
empty (see `mergePeaks`).

`bucketSeconds` is the source file's own bucket length (`peakBucketSeconds`), a little over 10 ms
at 22.05 kHz: a rounded 0.01 would put bucket i at the wrong time, further off the later it is.
*/
export function zoomBars(
  peaks: Float32Array,
  bucketSeconds: number,
  centreSeconds: number,
  windowSeconds: number,
  width: number,
  barPitch: number,
): Float32Array {
  const barCount = Math.ceil(width / barPitch)
  const startBucket = (centreSeconds - windowSeconds / 2) / bucketSeconds
  const bucketsPerPixel = windowSeconds / bucketSeconds / width
  return mergePeaks(
    peaks,
    barCount,
    startBucket,
    startBucket + barCount * barPitch * bucketsPerPixel,
  )
}
