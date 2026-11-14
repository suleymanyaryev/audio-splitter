import { describe, it, expect } from 'vitest'

import { hitTestSplit } from '../hit-test-split.ts'

describe('hitTestSplit', () => {
  it('finds the split under a click, on the note 05 example', () => {
    // The split at 329.05 s is at x 122.6; a click at x = 127 is 4.4 px away.
    expect(hitTestSplit(127, [122.6, 480])).toBe(0)
  })

  it('finds nothing 17.4 px away', () => {
    expect(hitTestSplit(140, [122.6, 480])).toBeNull()
  })

  it('counts exactly 6 px as a hit and anything further as a miss', () => {
    expect(hitTestSplit(106, [100])).toBe(0)
    expect(hitTestSplit(94, [100])).toBe(0)
    expect(hitTestSplit(106.01, [100])).toBeNull()
    expect(hitTestSplit(93.99, [100])).toBeNull()
  })

  it('picks the nearest of two splits under one click, by index', () => {
    expect(hitTestSplit(101.5, [100, 102, 300])).toBe(1)
    expect(hitTestSplit(100.4, [100, 102, 300])).toBe(0)
  })

  it('picks the earlier split when two are equally near', () => {
    expect(hitTestSplit(101, [100, 102])).toBe(0)
  })

  it('finds nothing when there is no split', () => {
    expect(hitTestSplit(50, [])).toBeNull()
  })
})
