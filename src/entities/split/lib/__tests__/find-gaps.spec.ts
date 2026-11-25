import { describe, it, expect } from 'vitest'

import { findGaps } from '../find-gaps.ts'

const LOUD = -10
const QUIET = -50

// A curve from runs: [value, count] pairs, in order.
function curveOf(...runs: [number, number][]) {
  return Float32Array.from(
    runs.flatMap(([value, count]) => Array.from({ length: count }, () => value)),
  )
}

// 50 ms windows over a file as long as the curve, threshold -30 dB, minimum gap 1 s (20 windows).
function gapsIn(curve: Float32Array, options: Partial<Parameters<typeof findGaps>[1]> = {}) {
  return findGaps(curve, {
    windowSeconds: 0.05,
    durationSeconds: curve.length * 0.05,
    silenceThreshold: -30,
    minimumGapLength: 1,
    ...options,
  })
}

describe('findGaps', () => {
  it('finds a quiet run of at least the minimum length between two loud stretches', () => {
    // 40 loud windows (2 s), 24 quiet (1.2 s), 40 loud.
    const gaps = gapsIn(curveOf([LOUD, 40], [QUIET, 24], [LOUD, 40]))

    expect(gaps).toEqual([{ startSeconds: 2, endSeconds: 3.2, edge: null }])
  })

  it('finds nothing in a file that stays loud', () => {
    expect(gapsIn(curveOf([LOUD, 100]))).toEqual([])
  })

  it('drops a quiet run shorter than the minimum gap length', () => {
    // 19 quiet windows are 0.95 s.
    expect(gapsIn(curveOf([LOUD, 40], [QUIET, 19], [LOUD, 40]))).toEqual([])
  })

  it('keeps a quiet run of exactly the minimum, although 20 × 0.05 is not exactly 1 in floats', () => {
    const gaps = gapsIn(curveOf([LOUD, 40], [QUIET, 20], [LOUD, 40]))

    expect(gaps).toHaveLength(1)
    expect(gaps[0]?.startSeconds).toBeCloseTo(2, 9)
    expect(gaps[0]?.endSeconds).toBeCloseTo(3, 9)
  })

  it('keeps a minimum that is not a whole number of windows when the run reaches it', () => {
    // 1.02 s needs 21 windows.
    expect(
      gapsIn(curveOf([LOUD, 40], [QUIET, 20], [LOUD, 40]), { minimumGapLength: 1.02 }),
    ).toEqual([])
    expect(
      gapsIn(curveOf([LOUD, 40], [QUIET, 21], [LOUD, 40]), { minimumGapLength: 1.02 }),
    ).toHaveLength(1)
  })

  it('counts a window as quiet only when it is strictly under the threshold', () => {
    // 19 windows under the threshold and one exactly on it: the run is 19 windows, not 20.
    expect(gapsIn(curveOf([LOUD, 40], [QUIET, 19], [-30, 1], [LOUD, 40]))).toEqual([])
    // The window on the threshold ends a longer run; it is not part of it.
    const gaps = gapsIn(curveOf([LOUD, 40], [QUIET, 24], [-30, 1], [LOUD, 40]))
    expect(gaps).toEqual([{ startSeconds: 2, endSeconds: 3.2, edge: null }])
  })

  it('does not join two runs that a single loud window separates', () => {
    const gaps = gapsIn(curveOf([LOUD, 40], [QUIET, 20], [LOUD, 1], [QUIET, 20], [LOUD, 40]))

    expect(gaps).toHaveLength(2)
  })

  it('finds every gap of a file, in time order', () => {
    const gaps = gapsIn(curveOf([LOUD, 40], [QUIET, 20], [LOUD, 40], [QUIET, 40], [LOUD, 40]))

    expect(gaps.map((gap) => gap.startSeconds)).toEqual([2, 5])
  })

  it('flags a gap at the start of the file as a lead-in and one at the end as a run-out', () => {
    const gaps = gapsIn(curveOf([QUIET, 30], [LOUD, 40], [QUIET, 30]))

    expect(gaps).toEqual([
      { startSeconds: 0, endSeconds: 1.5, edge: 'lead-in' },
      { startSeconds: 3.5, endSeconds: 5, edge: 'run-out' },
    ])
  })

  it('does not flag a gap that only comes near an edge', () => {
    const gaps = gapsIn(curveOf([LOUD, 1], [QUIET, 30], [LOUD, 40], [QUIET, 30], [LOUD, 1]))

    expect(gaps.map((gap) => gap.edge)).toEqual([null, null])
  })

  it('ends the last gap at the end of the file when the last window is shorter', () => {
    // 61 windows would reach 3.05 s, but the file ends at 3.02 s: the last window is 0.02 s short.
    const gaps = gapsIn(curveOf([LOUD, 40], [QUIET, 21]), { durationSeconds: 3.02 })

    expect(gaps).toEqual([{ startSeconds: 2, endSeconds: 3.02, edge: 'run-out' }])
  })

  it('takes window times from the window length, which at 22.05 kHz is not 0.05 s', () => {
    const windowSeconds = 1103 / 22_050
    const gaps = gapsIn(curveOf([LOUD, 10], [QUIET, 30], [LOUD, 10]), {
      windowSeconds,
      durationSeconds: 50 * windowSeconds,
      minimumGapLength: 1,
    })

    expect(gaps).toHaveLength(1)
    expect(gaps[0]?.startSeconds).toBeCloseTo(10 * windowSeconds, 12)
    expect(gaps[0]?.endSeconds).toBeCloseTo(40 * windowSeconds, 12)
  })

  it('treats a file that is quiet from start to end as one gap, flagged as a lead-in', () => {
    expect(gapsIn(curveOf([QUIET, 40]))).toEqual([
      { startSeconds: 0, endSeconds: 2, edge: 'lead-in' },
    ])
  })

  it('finds nothing in an empty curve', () => {
    expect(gapsIn(new Float32Array(0))).toEqual([])
  })
})
