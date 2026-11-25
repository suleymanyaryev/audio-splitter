import { median } from './median.ts'

/*
How far each window of the loudness curve falls under the loudness around it, in dB (GLOSSARY.md:
Depth). The idea and the numbers are in docs/concepts/13-adaptive-threshold.md.

Every distance is in windows, which are 50 ms (see loudness-builder.ts).
*/

// Every value under this counts as this, so digital silence (-100 dB) cannot swamp a mean.
const FLOOR_DECIBELS = -60
// The smoothed level averages the window and 10 on either side: 21 windows, a second.
const SMOOTHING_RADIUS = 10
// The loudness around is the median of 400 windows on either side: 20 s before and 20 s after.
const AROUND_RADIUS = 400
// The median is taken every 10 windows (0.5 s) and held for the windows between.
const AROUND_STEP = 10

export interface DepthProfile {
  // The curve with every value held to the floor.
  floored: Float32Array
  // The mean energy of the second around each window, back in dB.
  smoothed: Float32Array
  // The median of the 40 s around each window.
  around: Float32Array
  // `around` minus `smoothed`.
  depth: Float32Array
}

function flooredCopy(curve: Float32Array) {
  return curve.map((decibels) => Math.max(decibels, FLOOR_DECIBELS))
}

/*
For each window, the mean of the powers of the 21 windows around it, back in dB. A power is
10^(dB / 10). The mean is of energy, not of dB, so a short drop barely moves it: a loud window
weighs far more than a quiet one. Near the file's ends the span is cut to the windows that exist.
*/
function smoothedLevel(floored: Float32Array) {
  const powers = floored.map((decibels) => 10 ** (decibels / 10))
  const smoothed = new Float32Array(floored.length)
  for (let index = 0; index < floored.length; index++) {
    const first = Math.max(0, index - SMOOTHING_RADIUS)
    const last = Math.min(floored.length - 1, index + SMOOTHING_RADIUS)
    let sum = 0
    for (let at = first; at <= last; at++) sum += powers[at] ?? 0
    smoothed[index] = 10 * Math.log10(sum / (last - first + 1))
  }
  return smoothed
}

/*
For each window, the median of the floored curve over the 400 windows on either side (a median
because a silence inside the span must not pull it down, as a mean would). It is worked out for the
first window of every 10 and held for the 9 after it.
*/
function loudnessAround(floored: Float32Array) {
  const around = new Float32Array(floored.length)
  for (let first = 0; first < floored.length; first += AROUND_STEP) {
    const value = median(
      floored.subarray(
        Math.max(0, first - AROUND_RADIUS),
        Math.min(floored.length, first + AROUND_RADIUS + 1),
      ),
    )
    around.fill(value, first, Math.min(floored.length, first + AROUND_STEP))
  }
  return around
}

// The depth of every window: the loudness around minus the smoothed level.
export function buildDepth(curve: Float32Array): DepthProfile {
  const floored = flooredCopy(curve)
  const smoothed = smoothedLevel(floored)
  const around = loudnessAround(floored)
  const depth = around.map((value, index) => value - (smoothed[index] ?? value))
  return { floored, smoothed, around, depth }
}

/*
The depth of a gap, from its first window to its last. Its own windows are left out of its
surroundings: the median of the 20 s before it and the 20 s after it, minus its quietest smoothed
level. A window inside a silence much longer than 40 s has the silence for its loudness around, so
no window is deep there, but the gap is.
*/
export function gapDepth(profile: DepthProfile, firstWindow: number, lastWindow: number) {
  const { floored, smoothed } = profile
  const before = floored.subarray(Math.max(0, firstWindow - AROUND_RADIUS), firstWindow)
  const after = floored.subarray(lastWindow + 1, lastWindow + 1 + AROUND_RADIUS)
  if (before.length + after.length === 0) return 0

  const around = new Float32Array(before.length + after.length)
  around.set(before)
  around.set(after, before.length)
  let quietest = Infinity
  for (let index = firstWindow; index <= lastWindow; index++) {
    quietest = Math.min(quietest, smoothed[index] ?? Infinity)
  }
  return median(around) - quietest
}
