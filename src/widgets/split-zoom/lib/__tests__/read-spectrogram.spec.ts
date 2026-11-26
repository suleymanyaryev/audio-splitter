import { describe, it, expect } from 'vitest'

import { readSpectrogram } from '../read-spectrogram.ts'

// 3 columns of 128 bands at 44.1 kHz, every value 0 (-100 dB) but the ones set.
function spectrogramWith(values: { column: number; band: number; value: number }[]) {
  const bands = new Uint8Array(3 * 128)
  for (const { column, band, value } of values) bands[column * 128 + band] = value
  return { bands, bandCount: 128, topHz: 22_050 }
}

describe('readSpectrogram', () => {
  it('reads the band and the column under the pointer, in dB', () => {
    // 1 kHz is in band 62 (955 to 1001 Hz); 0.12 s is in column 2 of 50 ms columns.
    const spectrogram = spectrogramWith([{ column: 2, band: 62, value: 173 }])

    const reading = readSpectrogram(spectrogram, 0.05, 0.12, 1000)

    // 173 of 255 is -32.2 dB.
    expect(reading).toBeCloseTo(-32.16, 2)
  })

  it('reads one column, not the loudest of its neighbours', () => {
    const spectrogram = spectrogramWith([
      { column: 1, band: 62, value: 255 },
      { column: 2, band: 62, value: 51 },
    ])

    expect(readSpectrogram(spectrogram, 0.05, 0.12, 1000)).toBeCloseTo(-80, 6)
  })

  it('reads the top band at half the sample rate and the bottom band at 50 Hz', () => {
    const spectrogram = spectrogramWith([
      { column: 0, band: 127, value: 255 },
      { column: 0, band: 0, value: 255 },
    ])

    expect(readSpectrogram(spectrogram, 0.05, 0, 22_050)).toBe(0)
    expect(readSpectrogram(spectrogram, 0.05, 0, 50)).toBe(0)
  })

  it('has nothing to read before the file’s start or past its last column', () => {
    const spectrogram = spectrogramWith([])

    expect(readSpectrogram(spectrogram, 0.05, -0.01, 1000)).toBeNull()
    expect(readSpectrogram(spectrogram, 0.05, 0.16, 1000)).toBeNull()
  })
})
