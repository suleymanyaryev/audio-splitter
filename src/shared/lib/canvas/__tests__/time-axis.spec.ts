import { describe, it, expect } from 'vitest'

import { timeToX, xToTime } from '../time-axis.ts'

describe('timeToX', () => {
  it('puts the start on the left edge and the end on the right edge', () => {
    expect(timeToX(0, 3600, 1200)).toBe(0)
    expect(timeToX(3600, 3600, 1200)).toBe(1200)
  })

  it('is linear in between', () => {
    expect(timeToX(900, 3600, 1200)).toBe(300)
    expect(timeToX(329.05, 3600, 1000)).toBeCloseTo(91.4, 1)
  })

  it('maps everything to 0 for an empty file', () => {
    expect(timeToX(0, 0, 1200)).toBe(0)
  })
})

describe('xToTime', () => {
  it('puts the left edge at the start and the right edge at the end', () => {
    expect(xToTime(0, 3600, 1200)).toBe(0)
    expect(xToTime(1200, 3600, 1200)).toBe(3600)
  })

  it('is linear in between, on the worked example of docs/concepts/05-time-on-screen.md', () => {
    // sample1.m4a at 1374 px: a click at x = 140 is 375.6 s (6:15.60) in.
    expect(xToTime(140, 3686.213991, 1373.98)).toBeCloseTo(375.6, 1)
  })

  it('undoes timeToX', () => {
    // The split at 329.05 s is at x 122.6.
    expect(timeToX(329.05, 3686.213991, 1373.98)).toBeCloseTo(122.6, 1)
    expect(xToTime(timeToX(329.05, 3686.213991, 1373.98), 3686.213991, 1373.98)).toBeCloseTo(
      329.05,
      9,
    )
  })

  it('maps everything to 0 for a canvas with no width', () => {
    expect(xToTime(10, 3600, 0)).toBe(0)
  })
})
