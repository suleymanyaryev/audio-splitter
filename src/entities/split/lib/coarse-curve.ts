/*
The loudness curve at a coarser step, for comparing tracks (docs/concepts/11-finding-repeats.md,
"Time"): every value under `floor` counts as `floor`, then each `factor` windows are averaged into
one. The mean is taken in dB, so the same track louder is still the same curve plus a constant. The last
value averages what is left, when the curve does not divide evenly.
*/
export function coarseCurve(curve: Float32Array, factor: number, floor: number): Float32Array {
  const coarse = new Float32Array(Math.ceil(curve.length / factor))
  for (const [target] of coarse.entries()) {
    const windows = curve.subarray(target * factor, (target + 1) * factor)
    let sum = 0
    for (const decibels of windows) sum += Math.max(decibels, floor)
    coarse[target] = sum / windows.length
  }
  return coarse
}
