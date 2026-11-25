import { BOUNDARY_SPACING_SECONDS, DIP_EDGE_SECONDS } from '../config/split-room.ts'

export interface Dip {
  // The middle of the dip's window.
  seconds: number
  // The depth there, in dB.
  depth: number
}

export interface DipSettings {
  // Seconds per window, from the sample count (see shared/lib/audio/loudness-builder.ts).
  windowSeconds: number
  durationSeconds: number
  // A dip is at least this deep, in dB.
  depthSetting: number
}

// Whether no window within the radius is deeper than this one, or as deep and earlier.
function isDeepest(depth: Float32Array, index: number, radius: number) {
  const value = depth[index] ?? -Infinity
  const last = Math.min(depth.length - 1, index + radius)
  for (let other = Math.max(0, index - radius); other <= last; other++) {
    const otherValue = depth[other] ?? -Infinity
    if (otherValue > value || (otherValue === value && other < index)) return false
  }
  return true
}

/*
Every window whose depth reaches the setting and is the deepest within 15 s either way: one point
for each boundary, however wide its fade. Of two windows equally deep, the earlier one is the dip.
None in the file's first or last 10 s. The result is in time order.
*/
export function findDips(depth: Float32Array, settings: DipSettings): Dip[] {
  const { windowSeconds, durationSeconds, depthSetting } = settings
  const radius = Math.round(BOUNDARY_SPACING_SECONDS / windowSeconds)
  const dips: Dip[] = []

  for (const [index, value] of depth.entries()) {
    const seconds = (index + 0.5) * windowSeconds
    if (
      value < depthSetting ||
      seconds < DIP_EDGE_SECONDS ||
      seconds > durationSeconds - DIP_EDGE_SECONDS
    ) {
      continue
    }

    if (isDeepest(depth, index, radius)) dips.push({ seconds, depth: value })
  }
  return dips
}
