/*
Which spectrogram column each pixel of a strip shows, from the left edge: the column whose window
holds the pixel's middle, so a column is drawn across the moment it describes (column i covers
i × columnSeconds to (i + 1) × columnSeconds). -1 where the pixel falls before the file's start
or past its last column, which the strip leaves empty.
*/
export function columnsUnderPixels(view: {
  startSeconds: number
  endSeconds: number
  width: number
  columnSeconds: number
  columnCount: number
}): Int32Array {
  const { startSeconds, endSeconds, width, columnSeconds, columnCount } = view
  const columns = new Int32Array(width)
  const secondsPerPixel = (endSeconds - startSeconds) / width
  for (let x = 0; x < width; x++) {
    const index = Math.floor((startSeconds + (x + 0.5) * secondsPerPixel) / columnSeconds)
    columns[x] = index >= 0 && index < columnCount ? index : -1
  }
  return columns
}
