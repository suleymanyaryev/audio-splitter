import { LIMIT_TOLERANCE, MINIMUM_DISTANCE_SECONDS } from '../config/split-room.ts'

export interface Gap {
  startSeconds: number
  endSeconds: number
  /*
  A gap that starts at the file's first window is a lead-in, one that includes its last window
  is a run-out; neither proposes a split. A file quiet from start to end is one lead-in.
  */
  edge: 'lead-in' | 'run-out' | null
}

export interface GapSettings {
  // Seconds per window, from the sample count (see shared/lib/audio/loudness-builder.ts).
  windowSeconds: number
  durationSeconds: number
  // A window is quiet when its dB is strictly under this.
  silenceThreshold: number
  minimumGapLength: number
}

// Float error in times such as 20 × 0.05 is around 1e-15; no real setting sits this close.
const TOLERANCE_SECONDS = 1e-9

/*
Walks the loudness curve once and returns every gap: a maximal run of quiet windows lasting at
least the minimum gap length. The first quiet window's start to the last quiet window's end, which
is never past the end of the file (its last window may be shorter than the others).
*/
export function findGaps(curve: Float32Array, settings: GapSettings): Gap[] {
  const { windowSeconds, durationSeconds, silenceThreshold, minimumGapLength } = settings
  const gaps: Gap[] = []

  function close(first: number, last: number) {
    const startSeconds = first * windowSeconds
    const endSeconds = Math.min((last + 1) * windowSeconds, durationSeconds)
    if (endSeconds - startSeconds < minimumGapLength - TOLERANCE_SECONDS) return

    let edge: Gap['edge'] = null
    if (first === 0) edge = 'lead-in'
    else if (last === curve.length - 1) edge = 'run-out'
    gaps.push({ startSeconds, endSeconds, edge })
  }

  let runStart = -1
  for (const [index, element] of curve.entries()) {
    const isQuiet = element < silenceThreshold
    if (isQuiet && runStart === -1) runStart = index
    if (isQuiet || runStart === -1) {
      continue
    }

    close(runStart, index - 1)
    runStart = -1
  }
  if (runStart !== -1) close(runStart, curve.length - 1)

  return gaps
}

/*
The times where Find gaps would add a split: the middle of each gap that has a track on both sides,
so both neighbours lose about the same fade tail. A gap is skipped when it already holds a split, and
a middle is skipped when it has no room: 1 s from every split, from the file's ends and from the
middles taken before it. The gaps come in time order, so the result does too.
*/
export function gapSplitTimes(
  gaps: Gap[],
  splitSeconds: number[],
  durationSeconds: number,
): number[] {
  const taken: number[] = []
  for (const gap of gaps) {
    if (
      gap.edge !== null ||
      splitSeconds.some((seconds) => seconds >= gap.startSeconds && seconds <= gap.endSeconds)
    ) {
      continue
    }
    const middle = (gap.startSeconds + gap.endSeconds) / 2
    const isClearOf = (other: number) =>
      Math.abs(other - middle) >= MINIMUM_DISTANCE_SECONDS - LIMIT_TOLERANCE
    const hasRoom =
      isClearOf(0) &&
      isClearOf(durationSeconds) &&
      splitSeconds.every((seconds) => isClearOf(seconds)) &&
      taken.every((seconds) => isClearOf(seconds))
    if (hasRoom) taken.push(middle)
  }
  return taken
}
