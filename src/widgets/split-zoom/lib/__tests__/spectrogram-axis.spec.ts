import { describe, it, expect } from 'vitest'

import { frequencyToY } from '../spectrogram-axis.ts'

describe('frequencyToY', () => {
  it('puts 50 Hz at the strip’s bottom and half the sample rate at its top', () => {
    expect(frequencyToY(50, 22_050, 160)).toBeCloseTo(160, 9)
    expect(frequencyToY(22_050, 22_050, 160)).toBeCloseTo(0, 9)
  })

  it('gives each octave the same height', () => {
    // 50 Hz to 22.05 kHz is log2(441) = 8.785 octaves over 160 px: 18.21 px an octave.
    const octave = frequencyToY(100, 22_050, 160) - frequencyToY(200, 22_050, 160)
    expect(octave).toBeCloseTo(18.21, 2)
    expect(frequencyToY(1000, 22_050, 160) - frequencyToY(2000, 22_050, 160)).toBeCloseTo(octave, 9)
  })

  it('places the labels at 100 Hz, 1 kHz and 10 kHz', () => {
    // ln(f / 50) / ln(441) of the height, up from the bottom.
    expect(frequencyToY(100, 22_050, 160)).toBeCloseTo(141.79, 2)
    expect(frequencyToY(1000, 22_050, 160)).toBeCloseTo(81.28, 2)
    expect(frequencyToY(10_000, 22_050, 160)).toBeCloseTo(20.78, 2)
    // At 48 kHz the top is 24 kHz, so 1 kHz sits a little lower.
    expect(frequencyToY(1000, 24_000, 160)).toBeCloseTo(82.36, 2)
  })
})
