// DESIGN.md: bars 2 px wide on a 3 px pitch.
const BAR_WIDTH = 2
export const BAR_PITCH = 3

/*
Draws waveform bars from the left edge of the canvas, one per [min, max] pair of `bars`
([min0, max0, min1, max1, …], each between −1 and 1; see `mergePeaks`). A sample of ±1 reaches
`halfHeight` above or below `middle`.
*/
export function drawPeakBars(
  context: CanvasRenderingContext2D,
  bars: Float32Array,
  color: string,
  middle: number,
  halfHeight: number,
) {
  context.fillStyle = color
  for (let bar = 0; bar < bars.length / 2; bar++) {
    const min = bars[bar * 2] ?? 0
    const max = bars[bar * 2 + 1] ?? 0
    const top = middle - max * halfHeight
    const bottom = middle - min * halfHeight
    context.fillRect(bar * BAR_PITCH, top, BAR_WIDTH, bottom - top)
  }
}
