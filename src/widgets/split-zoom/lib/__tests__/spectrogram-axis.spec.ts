import { describe, it, expect } from 'vitest'

import { frequencyToY, yToFrequency } from '../spectrogram-axis.ts'

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

describe('yToFrequency', () => {
  it('reads 50 Hz at the strip’s bottom and half the sample rate at its top', () => {
    expect(yToFrequency(160, 22_050, 160)).toBeCloseTo(50, 9)
    expect(yToFrequency(0, 24_000, 160)).toBeCloseTo(24_000, 6)
  })

  it('undoes frequencyToY at the labels', () => {
    for (const hz of [100, 1000, 10_000]) {
      expect(yToFrequency(frequencyToY(hz, 22_050, 160), 22_050, 160)).toBeCloseTo(hz, 6)
    }
  })

  it('reads the octave above at one octave’s height up', () => {
    // An octave is 18.21 px at 22.05 kHz on 160 px.
    expect(yToFrequency(frequencyToY(440, 22_050, 160) - 18.2136, 22_050, 160)).toBeCloseTo(880, 1)
  })
})
