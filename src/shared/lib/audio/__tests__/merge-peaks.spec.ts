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

  describe('over a range of buckets', () => {
    // Ten buckets whose max is its own index / 10, so the bucket under a bar can be read off it.
    const ramp = new Float32Array(20)
    for (let bucket = 0; bucket < 10; bucket++) ramp[bucket * 2 + 1] = bucket / 10

    it('merges only the buckets from the range start to its end', () => {
      // Buckets 2 to 6, two bars: the first takes buckets 2 and 3 (up to 0.3), the second 4 and 5.
      expect(mergePeaks(ramp, 2, 2, 6)).toEqual(Float32Array.of(0, 0.3, 0, 0.5))
    })

    it('gives a bucket to the bar its start falls in, so neighbouring bars share none', () => {
      /*
      1.5 to 3.5 in two bars: 1.5 to 2.5 takes bucket 1 (start 1.5 is inside it), 2.5 to 3.5
      bucket 2.
      */
      expect(mergePeaks(ramp, 2, 1.5, 3.5)).toEqual(Float32Array.of(0, 0.1, 0, 0.2))
    })

    it('leaves bars before the first bucket empty and keeps the rest in step', () => {
      /*
      -2 to 4 in three bars of two buckets: -2 and -1 are before the file, then 0 and 1, then 2
      and 3.
      */
      expect(mergePeaks(ramp, 3, -2, 4)).toEqual(Float32Array.of(0, 0, 0, 0.1, 0, 0.3))
    })

    it('leaves bars past the last bucket empty', () => {
      // 8 to 12 in two bars: buckets 8 and 9, then 10 and 11, which do not exist.
      expect(mergePeaks(ramp, 2, 8, 12)).toEqual(Float32Array.of(0, 0.9, 0, 0))
    })

    it('cuts a bar that reaches past the last bucket at the last bucket', () => {
      // 9 to 11 in one bar: bucket 9 only.
      expect(mergePeaks(ramp, 1, 9, 11)).toEqual(Float32Array.of(0, 0.9))
    })
  })
})
