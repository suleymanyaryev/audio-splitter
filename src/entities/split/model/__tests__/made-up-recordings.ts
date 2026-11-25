// Made-up loudness curves for the "Find duplicates" specs: recordings, and playlists of them.

export const QUIET = -50
// 4 s of quiet between recordings: a gap that Find splits splits in the middle.
export const GAP_WINDOWS = 80
export const WINDOWS_PER_SECOND = 20

// A made-up number between 0 and 1 from a seed and an index, the same on every run.
function unit(seed: number, index: number) {
  const x = Math.sin(seed * 127.1 + index * 311.7) * 43_758.5453
  return x - Math.floor(x)
}

/*
A made-up recording: its level moves every second, between −30 and −10 dB, in a shape that only
its seed gives. `gain` is added to every window, as a louder copy has it, and `noise` moves each
window by up to that many dB either way, as a different master would.
*/
export function recording(seed: number, seconds: number, gain = 0, noise = 0) {
  return Array.from({ length: seconds * WINDOWS_PER_SECOND }, (_, window) => {
    const level = -30 + 20 * unit(seed, Math.floor(window / WINDOWS_PER_SECOND))
    return level + gain + (unit(seed + 1000, window) - 0.5) * 2 * noise
  })
}

// The recordings one after another, a gap between each two.
export function playlist(...recordings: number[][]) {
  return Float32Array.from(
    recordings.flatMap((windows, index) =>
      index === 0 ? windows : [...Array.from({ length: GAP_WINDOWS }, () => QUIET), ...windows],
    ),
  )
}

// Three recordings, A to C, each 40 s or more.
export const A = () => recording(1, 40)
export const B = () => recording(2, 50)
export const C = () => recording(3, 60)

// A recording of 80 s.
export const LONG = () => recording(2, 80)

// A stretch of other music, 30 s.
export const FOREIGN = () => recording(9, 30)
