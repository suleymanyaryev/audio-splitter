import { describe, it, expect } from 'vitest'

import { minMaxPeaks } from '../min-max-peaks.ts'

// A tone of `seconds` at `amplitude`, followed by the same length of digital silence.
function toneThenSilence(sampleRate: number, seconds: number, amplitude: number) {
  const frames = Math.round(sampleRate * seconds)
  const samples = new Float32Array(frames * 2)
  for (let index = 0; index < frames; index++) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * 440 * index) / sampleRate)
  }
  return samples
}

describe('minMaxPeaks', () => {
  it('keeps the lowest and highest sample of every 10 ms bucket', () => {
    // At a toy rate of 400 Hz a 10 ms bucket is four samples.
    const samples = Float32Array.of(0.1, -0.3, 0.2, 0, 0.5, 0.4, -0.1, 0.3)

    expect(minMaxPeaks(samples, 400)).toEqual(Float32Array.of(-0.3, 0.2, -0.1, 0.5))
  })

  it('shows a tone as wide buckets and silence as flat ones', () => {
    // 1 s of 440 Hz at half amplitude, then 1 s of silence, at 44.1 kHz: 441 frames per bucket.
    const peaks = minMaxPeaks(toneThenSilence(44_100, 1, 0.5), 44_100)

    expect(peaks).toHaveLength(2 * 200)
    expect(peaks[0]).toBeCloseTo(-0.5, 2)
    expect(peaks[1]).toBeCloseTo(0.5, 2)
    expect(peaks[2 * 150]).toBe(0)
    expect(peaks[2 * 150 + 1]).toBe(0)
  })

  it('keeps the last, shorter bucket', () => {
    const samples = Float32Array.of(0, 0, 0, 0, -0.7)

    expect(minMaxPeaks(samples, 400)).toEqual(Float32Array.of(0, 0, -0.7, -0.7))
  })

  it('sizes a bucket from the sample rate, so 22.05 kHz gets 221 frames', () => {
    // round(22050 / 100) = 221: the 221st frame still falls in the first bucket.
    const samples = new Float32Array(222)
    samples[220] = 0.9
    samples[221] = -0.9

    expect(minMaxPeaks(samples, 22_050)).toEqual(Float32Array.of(0, 0.9, -0.9, -0.9))
  })
})
