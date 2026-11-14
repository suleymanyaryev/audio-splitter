import { PEAK_BUCKET_SECONDS } from '@/shared/lib/audio/peaks-builder.ts'
import { mergePeaks } from '@/shared/lib/audio/merge-peaks.ts'

/*
The bars of the zoom view, [min0, max0, min1, max1, …] from the left edge of the canvas. A bar is
`barPitch` px of the window wide, so a window of 20 s on 900 px puts about 6.7 buckets under each
bar of a 3 px pitch. The count is rounded up so the last pixels have a bar; the last bar may reach
a little past the window. Where the window reaches before 0 s or past the file's end the bars are
empty (see `mergePeaks`).
*/
export function zoomBars(
  peaks: Float32Array,
  centreSeconds: number,
  windowSeconds: number,
  width: number,
  barPitch: number,
): Float32Array {
  const barCount = Math.ceil(width / barPitch)
  const startBucket = (centreSeconds - windowSeconds / 2) / PEAK_BUCKET_SECONDS
  const bucketsPerPixel = windowSeconds / PEAK_BUCKET_SECONDS / width
  return mergePeaks(
    peaks,
    barCount,
    startBucket,
    startBucket + barCount * barPitch * bucketsPerPixel,
  )
}
