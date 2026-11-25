import { describe, it, expect } from 'vitest'

import { slidingCorrelation } from '../sliding-correlation.ts'

/*
The numbers are those of docs/concepts/11-finding-repeats.md, worked by hand there: `a` is
−30, −20, −25, −10 dB, `b` is `a` plus 6 dB, `c` is the same four values in another order.
*/
const a = Float32Array.of(-30, -20, -25, -10)
const b = Float32Array.of(-24, -14, -19, -4)
const c = Float32Array.of(-20, -30, -10, -25)

describe('slidingCorrelation', () => {
  it('gives r = 1 at offset 0 for a stretch against itself', () => {
    const result = slidingCorrelation(a, a, 4)

    expect(result?.r).toBeCloseTo(1, 6)
    expect(result?.offset).toBe(0)
    expect(result?.overlap).toBe(4)
  })

  it('gives r = 1 at its true offset for a stretch inside a longer one', () => {
    const along = Float32Array.of(-40, -35, -30, -20, -25, -10, -45)

    const result = slidingCorrelation(a, along, 4)

    expect(result?.r).toBeCloseTo(1, 6)
    expect(result?.offset).toBe(2)
    expect(result?.overlap).toBe(4)
  })

  it('still gives r = 1 for the same shape 6 dB louder', () => {
    const along = Float32Array.of(-40, -35, -30, -20, -25, -10, -45)

    const result = slidingCorrelation(b, along, 4)

    expect(result?.r).toBeCloseTo(1, 6)
    expect(result?.offset).toBe(2)
  })

  it('gives a negative r for a mirrored shape', () => {
    // The hand sum: −106.25 over 218.75.
    expect(slidingCorrelation(a, c, 4)?.r).toBeCloseTo(-0.4857, 4)
  })

  it('scores a stretch that hangs over the start of the other, down to the minimum overlap', () => {
    // Its first window has no partner: the other four windows meet `a` exactly.
    const hanging = Float32Array.of(-5, -30, -20, -25, -10)
    const along = Float32Array.of(-30, -20, -25, -10, -45)

    const result = slidingCorrelation(hanging, along, 4)

    expect(result?.r).toBeCloseTo(1, 6)
    expect(result?.offset).toBe(-1)
    expect(result?.overlap).toBe(4)
  })

  it('never scores an overlap under the minimum', () => {
    const hanging = Float32Array.of(-5, -30, -20, -25, -10)
    const along = Float32Array.of(-30, -20, -25, -10, -45)

    // The perfect overlap is four windows long, so with a minimum of five it is not scored.
    const result = slidingCorrelation(hanging, along, 5)

    expect(result?.overlap).toBe(5)
    expect(result?.offset).toBe(0)
    expect(result?.r).toBeLessThan(0.9)
  })

  it('scores nothing when no overlap reaches the minimum', () => {
    expect(slidingCorrelation(a, a, 5)).toBeNull()
  })

  it('scores no match for a flat stretch, which has no shape to compare', () => {
    const flat = Float32Array.of(-20, -20, -20, -20)

    expect(slidingCorrelation(flat, a, 4)).toBeNull()
    expect(slidingCorrelation(a, flat, 4)).toBeNull()
  })

  it('gives a tie to the earliest offset', () => {
    // `a` twice over: it fits equally well at offsets 0 and 4.
    const twice = Float32Array.of(...a, ...a)

    const result = slidingCorrelation(a, twice, 4)

    expect(result?.r).toBeCloseTo(1, 6)
    expect(result?.offset).toBe(0)
  })
})
