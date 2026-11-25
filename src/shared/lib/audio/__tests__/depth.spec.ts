import { describe, it, expect } from 'vitest'

import { buildDepth, gapDepth } from '../depth.ts'

// A curve from runs: [value, count] pairs, in order.
function curveOf(...runs: [number, number][]) {
  return Float32Array.from(
    runs.flatMap(([value, count]) => Array.from({ length: count }, () => value)),
  )
}

describe('depth', () => {
  it('is 0 everywhere on a flat curve', () => {
    const { depth } = buildDepth(curveOf([-10, 1000]))

    for (const value of depth) expect(value).toBeCloseTo(0, 4)
  })

  it('is the whole drop, 20 dB, at the middle of a 2 s drop of 20 dB', () => {
    // 40 windows from 480 to 519; the 21 windows around window 500 are all in the drop.
    const { depth } = buildDepth(curveOf([-10, 480], [-30, 40], [-10, 480]))

    expect(depth[500]).toBeCloseTo(20, 4)
  })

  it('reads a 0.5 s drop of 20 dB as 2.77 dB, by the 1 s mean of energy', () => {
    /*
    10 windows from 495 to 504. The 21 windows around window 500 hold all 10 of them and 11 flat
    ones, so the mean power is (11 × 1 + 10 × 0.01) / 21 = 0.5286 of the flat level, which is
    -2.769 dB: 10 × log10(21 / 11.1).
    */
    const { depth } = buildDepth(curveOf([-10, 495], [-30, 10], [-10, 495]))

    expect(depth[500]).toBeCloseTo(2.769, 3)
  })

  it('reads one 50 ms drum hit as almost nothing', () => {
    // One window of -30 among 20 flat ones: (20 + 0.01) / 21 is -0.21 dB.
    const { depth } = buildDepth(curveOf([-10, 500], [-30, 1], [-10, 499]))

    expect(depth[500]).toBeCloseTo(0.2094, 3)
  })

  it('counts every window under -60 dB as -60', () => {
    const digital = buildDepth(curveOf([-10, 480], [-100, 40], [-10, 480]))
    const floor = buildDepth(curveOf([-10, 480], [-60, 40], [-10, 480]))

    expect(digital.depth[500]).toBeCloseTo(50, 4)
    expect(floor.depth[500]).toBeCloseTo(50, 4)
  })

  it('leaves the loudness around unmoved by a short drop', () => {
    const { around } = buildDepth(curveOf([-10, 495], [-30, 10], [-10, 495]))

    // The median of 801 windows, 10 of them lower, is still -10.
    expect(around[500]).toBeCloseTo(-10, 6)
  })

  it('follows a quiet track: -30 dB around, a 20 dB drop in it is 20 deep', () => {
    const { depth, around } = buildDepth(curveOf([-30, 480], [-50, 40], [-30, 480]))

    expect(around[500]).toBeCloseTo(-30, 6)
    expect(depth[500]).toBeCloseTo(20, 4)
  })

  it('keeps the loudness around for 10 windows at a time', () => {
    // Windows 0 to 9 share one median, over the windows 0 to 400 that exist around window 0.
    const { around } = buildDepth(curveOf([-10, 405], [-40, 595]))

    for (let window = 1; window < 10; window++) expect(around[window]).toBe(around[0])
  })

  it('works on a curve shorter than the 40 s around', () => {
    const { depth } = buildDepth(curveOf([-10, 30], [-40, 3], [-10, 30]))

    expect(depth).toHaveLength(63)
    expect(Number.isFinite(depth[31])).toBe(true)
  })
})

describe('gapDepth', () => {
  it('is deep for a silence much longer than the 40 s around, where a window is blind', () => {
    // 800 loud windows, 60 s of silence (1200 windows), 800 loud windows.
    const profile = buildDepth(curveOf([-10, 800], [-100, 1200], [-10, 800]))

    // In the middle of the silence the loudness around is the silence itself.
    expect(profile.depth[1400]).toBeCloseTo(0, 4)
    // The gap's depth leaves its own windows out: the music 20 s either side, minus the silence.
    expect(gapDepth(profile, 800, 1999)).toBeCloseTo(50, 4)
  })

  it('reads the median of the 20 s before the gap and the 20 s after it', () => {
    // -10 dB before, -30 dB after, a short silence between: 400 windows of each, median -20 dB.
    const profile = buildDepth(curveOf([-10, 400], [-70, 40], [-30, 400]))

    expect(gapDepth(profile, 400, 439)).toBeCloseTo(40, 4)
  })

  it('uses the quietest smoothed level inside the gap', () => {
    // A gap of 2 s whose smoothed level bottoms out at -60 in its middle.
    const profile = buildDepth(curveOf([-10, 500], [-60, 40], [-10, 500]))
    const middle = profile.smoothed[520] ?? NaN

    expect(middle).toBeCloseTo(-60, 4)
    expect(gapDepth(profile, 500, 539)).toBeCloseTo(50, 4)
  })
})
