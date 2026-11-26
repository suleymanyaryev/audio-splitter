import type { Spectrogram } from '@/shared/lib/audio/spectrogram-builder.ts'

// Float noise in a column's middle must not move it into the next pixel.
const EPSILON = 1e-9

/*
The band values each pixel of a strip shows, `bandCount` per pixel from the left edge, band 0
first. A pixel covers `(endSeconds - startSeconds) / width` seconds; it keeps each band's loudest
value over the columns whose middle falls in it, so a short drum hit stays visible when a long
stretch is squeezed, and a column is drawn at the middle of the moment it describes (column i
covers i × columnSeconds to (i + 1) × columnSeconds). A pixel narrower than a column, where no
middle falls, shows the column under its own middle. -1 where the pixel falls before the file's start or past its
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
    // Column i's middle is at i + 0.5 columns: it falls in the pixel when left ≤ i + 0.5 < right.
    let first = Math.max(0, Math.ceil(left - 0.5 - EPSILON))
    let end = Math.min(columnCount, Math.ceil(right - 0.5 - EPSILON))
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
