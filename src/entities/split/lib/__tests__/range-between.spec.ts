import { describe, it, expect } from 'vitest'

import { rangeBetween } from '../range-between.ts'

// A file of one hour.
const DURATION = 3600

describe('rangeBetween', () => {
  it('runs from the anchor to the pointer when the drag goes right', () => {
    expect(rangeBetween(100, 160, DURATION)).toEqual({ startSeconds: 100, endSeconds: 160 })
  })

  it('puts the earlier time first when the drag goes left', () => {
    expect(rangeBetween(160, 100, DURATION)).toEqual({ startSeconds: 100, endSeconds: 160 })
  })

  it('holds the range to the start of the file', () => {
    expect(rangeBetween(30, -50, DURATION)).toEqual({ startSeconds: 0, endSeconds: 30 })
  })

  it('holds the range to the end of the file', () => {
    expect(rangeBetween(3500, 4000, DURATION)).toEqual({ startSeconds: 3500, endSeconds: 3600 })
  })

  it('holds an anchor outside the file to the file too', () => {
    expect(rangeBetween(-5, 20, DURATION)).toEqual({ startSeconds: 0, endSeconds: 20 })
  })

  it('stops growing at 10 min from the anchor, to the right', () => {
    expect(rangeBetween(1000, 2500, DURATION)).toEqual({ startSeconds: 1000, endSeconds: 1600 })
  })

  it('stops growing at 10 min from the anchor, to the left', () => {
    expect(rangeBetween(2000, 100, DURATION)).toEqual({ startSeconds: 1400, endSeconds: 2000 })
  })

  it('keeps a range of exactly 1 s', () => {
    expect(rangeBetween(10, 11, DURATION)).toEqual({ startSeconds: 10, endSeconds: 11 })
  })

  it('refuses a range under 1 s, which is a click', () => {
    expect(rangeBetween(10, 10.5, DURATION)).toBeNull()
    expect(rangeBetween(10, 10, DURATION)).toBeNull()
  })

  it('refuses a range that the file ends cut under 1 s', () => {
    expect(rangeBetween(3599.5, 4000, DURATION)).toBeNull()
  })

  it('refuses any range in a file under 1 s', () => {
    expect(rangeBetween(0, 0.8, 0.8)).toBeNull()
  })
})
