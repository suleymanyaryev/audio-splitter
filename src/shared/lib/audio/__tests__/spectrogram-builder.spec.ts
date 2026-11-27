import { describe, it, expect } from 'vitest'

import { createLoudnessBuilder } from '../loudness-builder.ts'
import {
  bandDecibels,
  createSpectrogramBuilder,
  SPECTRUM_BAND_COUNT,
} from '../spectrogram-builder.ts'

function spectrogramOf(pieces: Float32Array[], sampleRate: number) {
  const builder = createSpectrogramBuilder(sampleRate)
  for (const piece of pieces) builder.push(piece)
  return builder.finish()
}

function loudnessCountOf(signal: Float32Array, sampleRate: number) {
  const builder = createLoudnessBuilder(sampleRate)
  builder.push(signal)
  return builder.finish().length
}

// 1 s of a sine of `hz` at 44.1 kHz and `amplitude`: 20 loudness windows.
function sine(hz: number, amplitude = 1) {
  return Float32Array.from(
    { length: 44_100 },
    (_, index) => amplitude * Math.sin((2 * Math.PI * hz * index) / 44_100),
  )
}

// A made-up but irregular signal, so a frame cut or placed wrongly changes the columns.
function wobble(count: number) {
  return Float32Array.from(
    { length: count },
    (_, index) => Math.sin(index * 0.7) * Math.cos(index * 0.013),
  )
}

// The same signal cut into pieces of the given sizes, which must add up to its length.
function cut(signal: Float32Array, sizes: number[]) {
  const pieces: Float32Array[] = []
  let start = 0
  for (const size of sizes) {
    pieces.push(signal.subarray(start, start + size))
    start += size
  }
  expect(start).toBe(signal.length)
  return pieces
}

// The band values of one column.
function column(bands: Uint8Array, index: number) {
  return bands.subarray(index * SPECTRUM_BAND_COUNT, (index + 1) * SPECTRUM_BAND_COUNT)
}

// The first band holding the column's highest value.
function loudestBandOf(values: Uint8Array) {
  return values.indexOf(Math.max(...values))
}

describe('createSpectrogramBuilder', () => {
  it.each([
    [22_050, 1103 * 7 + 500],
    [44_100, 2205 * 9 + 1],
    [48_000, 2400 * 4],
  ])('gives one column of 128 bands per loudness window at %i Hz', (sampleRate, count) => {
    const signal = wobble(count)
    const spectrogram = spectrogramOf([signal], sampleRate)

    expect(spectrogram.bandCount).toBe(128)
    expect(spectrogram.bands).toHaveLength(loudnessCountOf(signal, sampleRate) * 128)
  })

  it('runs its axis up to half the sample rate', () => {
    expect(spectrogramOf([], 48_000).topHz).toBe(24_000)
    expect(spectrogramOf([], 22_050).topHz).toBe(11_025)
  })

  it('has no columns before anything is pushed', () => {
    expect(spectrogramOf([], 44_100).bands).toHaveLength(0)
  })

  it.each([22_050, 44_100])(
    'gives the same columns at %i Hz for a signal pushed whole or in uneven pieces',
    (sampleRate) => {
      const signal = wobble(30_000)
      const whole = spectrogramOf([signal], sampleRate)

      // Pieces shorter than a frame (2048), an empty one, and borders in the middle of a frame.
      const parts = spectrogramOf(cut(signal, [1, 0, 3, 2047, 700, 0, 5000, 2, 22_247]), sampleRate)

      expect(parts.bands).toEqual(whole.bands)
    },
  )

  it('reads before the start and past the end as zeros', () => {
    /*
    At 22.05 kHz a window is 1103 samples and a frame is 2048, so the first and last frames reach
    past the file. A window of silence added before and after the same signal gives the same
    columns, one later, between two of silence.
    */
    const signal = wobble(1103 * 5)
    const padded = new Float32Array(1103 * 7)
    padded.set(signal, 1103)

    const plain = spectrogramOf([signal], 22_050).bands
    const shifted = spectrogramOf([padded], 22_050).bands

    expect(shifted.subarray(128, 128 * 6)).toEqual(plain)
  })

  it('peaks a 1 kHz sine in the band holding 1 kHz, 955 to 1001 Hz', () => {
    const { bands } = spectrogramOf([sine(1000, 0.5)], 44_100)

    // The first and last columns' frames run off the file; every other one is full.
    for (let index = 1; index < 19; index++) expect(loudestBandOf(column(bands, index))).toBe(62)
  })

  it('peaks a 100 Hz sine in the band holding 100 Hz, 97 to 102 Hz', () => {
    const { bands } = spectrogramOf([sine(100, 0.5)], 44_100)

    expect(loudestBandOf(column(bands, 10))).toBe(14)
  })

  it('reads a full-scale sine at about 0 dB where its band holds the whole tone', () => {
    /*
    5 kHz falls in 4812 to 5046 Hz, a band wide enough for the window's spread
    (docs/concepts/14-the-spectrum.md).
    */
    const { bands } = spectrogramOf([sine(5000)], 44_100)
    const values = column(bands, 10)

    expect(loudestBandOf(values)).toBe(96)
    expect(bandDecibels(values[96] ?? 0)).toBeGreaterThan(-0.5)
    // Half the amplitude is a quarter of the power, -6 dB.
    const half = column(spectrogramOf([sine(5000, 0.5)], 44_100).bands, 10)
    expect(bandDecibels(half[96] ?? 0)).toBeCloseTo(-6, 0)
  })

  it('reads silence at -100 dB in every band', () => {
    const { bands } = spectrogramOf([new Float32Array(44_100)], 44_100)

    expect(bands).toHaveLength(20 * 128)
    expect(bands.every((value) => bandDecibels(value) === -100)).toBe(true)
  })
})

describe('bandDecibels', () => {
  it('reads a stored byte as dB from -100 to 0', () => {
    expect(bandDecibels(0)).toBe(-100)
    expect(bandDecibels(255)).toBe(0)
    expect(bandDecibels(51)).toBeCloseTo(-80, 6)
  })
})
