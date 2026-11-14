import { describe, it, expect } from 'vitest'

import { median } from '../median.ts'

describe('median', () => {
  it('is the middle value of an odd number of values, whatever their order', () => {
    expect(median(Float32Array.of(-30, -10, -20))).toBe(-20)
  })

  it('is the mean of the two middle values of an even number of values', () => {
    expect(median(Float32Array.of(-40, -10, -20, -30))).toBe(-25)
  })

  it('is the value itself for a single value', () => {
    expect(median(Float32Array.of(-12.5))).toBe(-12.5)
  })

  it('leaves the curve in its original order', () => {
    const curve = Float32Array.of(-30, -10, -20)

    median(curve)

    expect(curve).toEqual(Float32Array.of(-30, -10, -20))
  })

  it('refuses an empty curve, which has no middle', () => {
    expect(() => median(new Float32Array(0))).toThrow(RangeError)
  })
})
