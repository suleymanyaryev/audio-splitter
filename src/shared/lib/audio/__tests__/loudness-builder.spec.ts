import { describe, it, expect } from 'vitest'

import { createLoudnessBuilder, loudnessWindowSeconds } from '../loudness-builder.ts'

function loudnessOf(pieces: Float32Array[], sampleRate: number) {
  const builder = createLoudnessBuilder(sampleRate)
  for (const piece of pieces) builder.push(piece)
  return builder.finish()
}

// 1 s of a 440 Hz sine at 44.1 kHz and `amplitude`.
function sine(amplitude: number) {
  const samples = new Float32Array(44_100)
  for (let index = 0; index < samples.length; index++) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * 440 * index) / 44_100)
  }
  return samples
}

// `count` samples of a made-up but irregular signal, so a window that is cut or merged wrongly
// changes the curve.
function wobble(count: number) {
  const samples = new Float32Array(count)
  for (let index = 0; index < count; index++) {
    samples[index] = Math.sin(index * 0.7) * Math.cos(index * 0.013)
  }
  return samples
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

describe('createLoudnessBuilder', () => {
  it('turns every 50 ms window into the dB of its RMS', () => {
    // At a toy rate of 80 Hz a 50 ms window is four samples.
    // Window 0: RMS 1 is 0 dB. Window 1: RMS 0.5 is -6.0206 dB.
    // Window 2: squares add up to 0.25, the mean is 0.0625, RMS 0.25 is -12.0412 dB.
    const samples = Float32Array.of(1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0.5)
    const curve = loudnessOf([samples], 80)

    expect(curve).toHaveLength(3)
    expect(curve[0]).toBeCloseTo(0, 4)
    expect(curve[1]).toBeCloseTo(-6.0206, 4)
    expect(curve[2]).toBeCloseTo(-12.0412, 4)
  })

  it('reads a full-scale sine at -3.01 dB and a half-amplitude one at -9.03 dB', () => {
    // 1 s at 44.1 kHz is 20 windows of 2205 samples, which is 5 whole cycles of 440 Hz each.
    const full = loudnessOf([sine(1)], 44_100)
    const half = loudnessOf([sine(0.5)], 44_100)

    expect(full).toHaveLength(20)
    expect(half).toHaveLength(20)
    for (const value of full) expect(value).toBeCloseTo(-3.01, 2)
    for (const value of half) expect(value).toBeCloseTo(-9.03, 2)
  })

  it('stores digital silence, and anything under -100 dB, as exactly -100', () => {
    const silence = loudnessOf([new Float32Array(8)], 80)
    // A constant 1e-6 has an RMS of 1e-6, which is -120 dB.
    const quiet = loudnessOf([new Float32Array(8).fill(1e-6)], 80)

    expect(silence).toEqual(Float32Array.of(-100, -100))
    expect(quiet).toEqual(Float32Array.of(-100, -100))
  })

  it('reads a constant 1e-4 as -80 dB, well above the floor', () => {
    const curve = loudnessOf([new Float32Array(8).fill(1e-4)], 80)

    expect(curve[0]).toBeCloseTo(-80, 3)
    expect(curve[1]).toBeCloseTo(-80, 3)
  })

  it('shows a tone as loud windows and the silence after it as floor windows', () => {
    // 1 s of tone, then 1 s of silence, at 44.1 kHz: 20 windows each.
    const signal = new Float32Array(2 * 44_100)
    signal.set(sine(0.5))
    const curve = loudnessOf([signal], 44_100)

    expect(curve).toHaveLength(40)
    expect(curve[19]).toBeCloseTo(-9.03, 2)
    expect(curve[20]).toBe(-100)
  })

  it('keeps the last, shorter window and measures it with its own sample count', () => {
    // 1.5 windows of a constant 0.5 at 80 Hz: a window of four and a window of two.
    // Dividing the last two by four would give -12.04 dB instead of -6.02 dB.
    const curve = loudnessOf([new Float32Array(6).fill(0.5)], 80)

    expect(curve).toHaveLength(2)
    expect(curve[0]).toBeCloseTo(-6.02, 2)
    expect(curve[1]).toBeCloseTo(-6.02, 2)
  })

  it('has no values before anything is pushed', () => {
    expect(loudnessOf([], 80)).toHaveLength(0)
  })

  it('sizes a window from the sample rate, so 22.05 kHz gets 1103 samples', () => {
    // round(22050 * 0.05) = round(1102.5) = 1103: the 1103rd sample still falls in window 0.
    const samples = new Float32Array(1104)
    samples[1102] = 1
    samples[1103] = 1

    const curve = loudnessOf([samples], 22_050)

    expect(curve).toHaveLength(2)
    expect(curve[0]).toBeCloseTo(20 * Math.log10(Math.sqrt(1 / 1103)), 4)
    expect(curve[1]).toBe(0)
  })

  it('gives the same curve for a signal pushed whole or in uneven pieces', () => {
    const signal = wobble(1000)
    const whole = loudnessOf([signal], 80)

    // Pieces shorter than a window (4 samples), an empty one, and one that ends mid-window.
    const pieces = cut(signal, [1, 0, 3, 2, 7, 0, 90, 5, 400, 492])
    const parts = loudnessOf(pieces, 80)

    expect(parts).toHaveLength(250)
    expect(parts).toEqual(whole)
  })

  it('carries the open window across 60 s slices at 22.05 kHz', () => {
    // A 60 s slice is 1,323,000 samples: 1199 windows of 1103 and 503 samples left over.
    // Both together are 2,646,000 samples: 2398 whole windows and 1006 samples left, which are
    // kept as one short window. Closing a short window at the border would make 2400 values.
    const signal = wobble(2_646_000)
    const whole = loudnessOf([signal], 22_050)
    const slices = loudnessOf(cut(signal, [1_323_000, 1_323_000]), 22_050)

    expect(whole).toHaveLength(2399)
    expect(slices).toEqual(whole)
  })
})

describe('loudnessWindowSeconds', () => {
  it('is 50 ms at 44.1 and 48 kHz', () => {
    expect(loudnessWindowSeconds(44_100)).toBeCloseTo(0.05, 12)
    expect(loudnessWindowSeconds(48_000)).toBeCloseTo(0.05, 12)
  })

  it('is the time of a whole number of samples at an odd rate', () => {
    // 22.05 kHz: 50 ms is 1102.5 samples, so a window is 1103 samples, a little over 50 ms.
    expect(loudnessWindowSeconds(22_050)).toBeCloseTo(1103 / 22_050, 12)
    expect(loudnessWindowSeconds(22_050)).toBeGreaterThan(0.05)
  })
})
