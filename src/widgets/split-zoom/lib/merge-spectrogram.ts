import type { Spectrogram } from '@/shared/lib/audio/spectrum-builder.ts'

// Float noise in a column's start time must not move it into the next pixel.
const EPSILON = 1e-9

/*
The band values each pixel of a strip shows, `bandCount` per pixel from the left edge, band 0
first. A pixel covers `(endSeconds - startSeconds) / width` seconds; it keeps each band's loudest
value over the columns that start in it, so a short drum hit stays visible when a long stretch is
squeezed (column i starts at i × columnSeconds). A pixel narrower than a column, where none starts,
shows the column under its middle. -1 where the pixel falls before the file's start or past its
last column, which the strip leaves empty.
*/
export function mergeSpectrogram(
  spectrogram: Pick<Spectrogram, 'bands' | 'bandCount'>,
  view: { startSeconds: number; endSeconds: number; width: number; columnSeconds: number },
): Int16Array {
  const { bands, bandCount } = spectrogram
  const { startSeconds, endSeconds, width, columnSeconds } = view
  const columnCount = bands.length / bandCount
  const merged = new Int16Array(width * bandCount).fill(-1)
  const secondsPerPixel = (endSeconds - startSeconds) / width
  for (let x = 0; x < width; x++) {
    const left = (startSeconds + x * secondsPerPixel) / columnSeconds
    const right = (startSeconds + (x + 1) * secondsPerPixel) / columnSeconds
    let first = Math.max(0, Math.ceil(left - EPSILON))
    let end = Math.min(columnCount, Math.ceil(right - EPSILON))
    if (end <= first) {
      first = Math.floor((left + right) / 2)
      end = first + 1
      if (first < 0 || first >= columnCount) continue
    }
    for (let band = 0; band < bandCount; band++) {
      let loudest = 0
      for (let column = first; column < end; column++) {
        loudest = Math.max(loudest, bands[column * bandCount + band] ?? 0)
      }
      merged[x * bandCount + band] = loudest
    }
  }
  return merged
}
