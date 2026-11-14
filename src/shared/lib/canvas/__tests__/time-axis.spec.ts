import { describe, it, expect } from 'vitest'

import { timeToX } from '../time-axis.ts'

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
