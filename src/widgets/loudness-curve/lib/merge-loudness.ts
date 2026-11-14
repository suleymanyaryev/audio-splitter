/*
Merges 50 ms loudness windows (dB) into `columnCount` columns. A column takes the loudest window
under it, so a merged curve still shows every loud moment, as `mergePeaks` does for the waveform.
An hour on a 900 px canvas puts about 80 windows into each column.
*/
export function mergeLoudness(curve: Float32Array, columnCount: number): Float32Array {
  const windowCount = curve.length
  const columns = new Float32Array(columnCount)

  for (let column = 0; column < columnCount; column++) {
    const first = Math.floor((column * windowCount) / columnCount)
    // With fewer windows than columns, a column still shows the window it falls in.
    const end = Math.max(first + 1, Math.floor(((column + 1) * windowCount) / columnCount))
    let loudest = -Infinity
    for (let windowIndex = first; windowIndex < end; windowIndex++) {
      loudest = Math.max(loudest, curve[windowIndex] ?? -Infinity)
    }
    columns[column] = loudest
  }
  return columns
}
