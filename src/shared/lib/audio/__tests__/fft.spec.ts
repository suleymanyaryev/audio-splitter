import { describe, it, expect } from 'vitest'

import { createFft } from '../fft.ts'

/*
The plain DFT of concept note 14, the reference: step k compares the frame with a cosine and a
sine of k cycles across it, sample by sample. Slow, and plain to check by eye.
*/
function plainDft(samples: Float64Array) {
  const size = samples.length
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  for (let k = 0; k < size; k++) {
    for (let t = 0; t < size; t++) {
      const angle = (2 * Math.PI * k * t) / size
      const sample = samples[t] ?? 0
      re[k] = (re[k] ?? 0) + sample * Math.cos(angle)
      im[k] = (im[k] ?? 0) - sample * Math.sin(angle)
    }
  }
  return { re, im }
}

// Irregular samples, so a butterfly joined wrongly or a step out of order changes the answer.
function irregular(size: number) {
  return Float64Array.from(
    { length: size },
    (_, t) => Math.sin(t * 0.7) * Math.cos(t * 0.013) + ((t * 7919) % 13) / 13 - 0.5,
  )
}

describe('createFft', () => {
  it.each([2, 8, 64, 2048])('matches the plain DFT on %i irregular samples', (size) => {
    const samples = irregular(size)
    const expected = plainDft(samples)

    const re = Float64Array.from(samples)
    const im = new Float64Array(size)
    createFft(size)(re, im)

    for (let k = 0; k < size; k++) {
      expect(re[k]).toBeCloseTo(expected.re[k] ?? NaN, 9)
      expect(im[k]).toBeCloseTo(expected.im[k] ?? NaN, 9)
    }
  })

  it('puts a cosine of 3 cycles across 16 samples in steps 3 and 13 only', () => {
    // A cosine of amplitude 1 over N samples is N / 2 at step k and at step N - k.
    const re = Float64Array.from({ length: 16 }, (_, t) => Math.cos((2 * Math.PI * 3 * t) / 16))
    const im = new Float64Array(16)
    createFft(16)(re, im)

    for (let k = 0; k < 16; k++) {
      expect(re[k]).toBeCloseTo(k === 3 || k === 13 ? 8 : 0, 9)
      expect(im[k]).toBeCloseTo(0, 9)
    }
  })

  it('refuses a size that is not a power of two', () => {
    expect(() => createFft(12)).toThrow(RangeError)
  })
})
