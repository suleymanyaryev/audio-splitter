import { describe, it, expect } from 'vitest'

import { mergePeaks } from '../merge-peaks.ts'

describe('mergePeaks', () => {
  it('gives each bar the lowest min and highest max of the buckets under it', () => {
    // Four buckets [min, max] into two bars.
    const peaks = Float32Array.of(-0.1, 0.2, -0.4, 0.1, 0, 0, -0.05, 0.3)

    expect(mergePeaks(peaks, 2)).toEqual(Float32Array.of(-0.4, 0.2, -0.05, 0.3))
  })

  it('keeps a short loud moment visible when thousands of buckets share a bar', () => {
    // 3,000 buckets (30 s) of silence with one loud bucket, into 300 bars of 10 buckets.
    const peaks = new Float32Array(3000 * 2)
    peaks[2 * 1234] = -0.9
    peaks[2 * 1234 + 1] = 0.8

    const bars = mergePeaks(peaks, 300)

    expect(bars).toHaveLength(600)
    expect([bars[2 * 123], bars[2 * 123 + 1]]).toEqual([
      expect.closeTo(-0.9, 6),
      expect.closeTo(0.8, 6),
    ])
    expect([bars[2 * 124], bars[2 * 124 + 1]]).toEqual([0, 0])
  })

  it('spreads uneven buckets over the bars without leaving any out', () => {
    // Five buckets into two bars: the first bar gets two, the second three.
    const peaks = Float32Array.of(0, 0.1, 0, 0.2, 0, 0.3, 0, 0.4, -0.5, 0)

    expect(mergePeaks(peaks, 2)).toEqual(Float32Array.of(0, 0.2, -0.5, 0.4))
  })

  it('repeats a bucket across bars when there are fewer buckets than bars', () => {
    const peaks = Float32Array.of(-0.1, 0.1, -0.2, 0.2)

    expect(mergePeaks(peaks, 4)).toEqual(
      Float32Array.of(-0.1, 0.1, -0.1, 0.1, -0.2, 0.2, -0.2, 0.2),
    )
  })
})
