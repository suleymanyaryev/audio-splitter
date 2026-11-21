import { describe, expect, it } from 'vitest'

import { decibelsToGain } from '../decibels-to-gain.ts'

describe('decibelsToGain', () => {
  // The values are note 09's table, worked out from the definition by hand.
  it.each([
    [0, 1],
    [-1, 0.8913],
    [-3, 0.7079],
    [-6, 0.5012],
    [-10, 0.3162],
    [-20, 0.1],
    [-30, 0.03162],
    [-40, 0.01],
  ])('turns %i dB into a gain of %f', (decibels, gain) => {
    expect(decibelsToGain(decibels)).toBeCloseTo(gain, 4)
  })

  it('is exactly 1 at 0 dB, so the loudest setting changes nothing', () => {
    expect(decibelsToGain(0)).toBe(1)
  })

  it('halves the amplitude for every 6.02 dB down', () => {
    expect(decibelsToGain(-6.0206)).toBeCloseTo(0.5, 4)
  })
})
