import { describe, it, expect } from 'vitest'

import { zoomBars } from '../zoom-bars.ts'

// 10 s of silence (1,000 buckets) with one loud bucket at 5.05 s.
function peaksWithClickAt505() {
  const peaks = new Float32Array(2000)
  peaks[2 * 505] = -0.7
  peaks[2 * 505 + 1] = 0.6
  return peaks
}

function barAt(bars: Float32Array, bar: number) {
  return [bars[bar * 2], bars[bar * 2 + 1]]
}

describe('zoomBars', () => {
  it('draws a bar per 3 px of the window, each over the buckets under those pixels', () => {
    /*
    A 2 s window centred on 5 s is 4.0 to 6.0 s: buckets 400 to 600 over 30 px. Ten bars of 3 px
    take 20 buckets each, so the click at bucket 505 is in bar 5 (buckets 500 to 519).
    */
    const bars = zoomBars(peaksWithClickAt505(), 5, 2, 30, 3)

    expect(bars).toHaveLength(20)
    expect(barAt(bars, 5)).toEqual([expect.closeTo(-0.7, 6), expect.closeTo(0.6, 6)])
    expect(barAt(bars, 4)).toEqual([0, 0])
    expect(barAt(bars, 6)).toEqual([0, 0])
  })

  it('rounds the bar count up so the last pixels are covered', () => {
    // 31 px is eleven bars: the eleventh covers the last pixel and a bit beyond the window.
    expect(zoomBars(peaksWithClickAt505(), 5, 2, 31, 3)).toHaveLength(22)
  })

  it('leaves the bars before the file empty when the window starts before 0 s', () => {
    /*
    0.5 s centre, 2 s window: -0.5 to 1.5 s, buckets -50 to 150. Bars of 20 buckets: the first
    two (-50 to -10) are before the file, the third (-10 to 10) holds the first ten buckets.
    */
    const peaks = new Float32Array(2000).fill(0.5)
    const bars = zoomBars(peaks, 0.5, 2, 30, 3)

    expect([0, 1].map((bar) => barAt(bars, bar))).toEqual([
      [0, 0],
      [0, 0],
    ])
    expect(barAt(bars, 2)).toEqual([0.5, 0.5])
  })

  it('leaves the bars past the end of the file empty when the window ends after it', () => {
    // 10 s of buckets, a window of 9 to 11 s: buckets 900 to 1100, so the bars from 1000 are empty.
    const peaks = new Float32Array(2000).fill(0.5)
    const bars = zoomBars(peaks, 10, 2, 30, 3)

    expect(barAt(bars, 4)).toEqual([0.5, 0.5])
    expect(barAt(bars, 5)).toEqual([0, 0])
  })
})
