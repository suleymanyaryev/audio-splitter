import { describe, it, expect } from 'vitest'

import { formatSpectrogramReadout } from '../format-spectrogram-readout.ts'

describe('formatSpectrogramReadout', () => {
  it('says a frequency of 1 kHz and more in kHz to a tenth, and the level to the dB', () => {
    expect(formatSpectrogramReadout(1000, -32.16)).toBe('1.0 kHz · −32 dB')
    expect(formatSpectrogramReadout(12_345, -7.6)).toBe('12.3 kHz · −8 dB')
  })

  it('says a frequency under 1 kHz in whole Hz', () => {
    expect(formatSpectrogramReadout(250.4, -60)).toBe('250 Hz · −60 dB')
    expect(formatSpectrogramReadout(999.4, -1)).toBe('999 Hz · −1 dB')
  })

  it('says 0 dB with no minus sign', () => {
    expect(formatSpectrogramReadout(5000, -0.2)).toBe('5.0 kHz · 0 dB')
  })
})
