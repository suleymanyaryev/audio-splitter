import { describe, it, expect } from 'vitest'

import { createPeaksBuilder } from '../peaks-builder.ts'

function peaksOf(pieces: Float32Array[], sampleRate: number) {
  const builder = createPeaksBuilder(sampleRate)
  for (const piece of pieces) builder.push(piece)
  return builder.finish()
}

// `count` samples of a made-up but irregular signal, so a bucket that is cut or merged wrongly
// changes the peaks.
function wobble(count: number) {
  const samples = new Float32Array(count)
  for (let index = 0; index < count; index++) {
    samples[index] = Math.sin(index * 0.7) * Math.cos(index * 0.013)
  }
  return samples
}

// A tone of `seconds` at `amplitude`, followed by the same length of digital silence.
function toneThenSilence(sampleRate: number, seconds: number, amplitude: number) {
  const frames = Math.round(sampleRate * seconds)
  const samples = new Float32Array(frames * 2)
  for (let index = 0; index < frames; index++) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * 440 * index) / sampleRate)
  }
  return samples
}

describe('createPeaksBuilder', () => {
  it('keeps the lowest and highest sample of every 10 ms bucket', () => {
    // At a toy rate of 400 Hz a 10 ms bucket is four samples.
    const samples = Float32Array.of(0.1, -0.3, 0.2, 0, 0.5, 0.4, -0.1, 0.3)

    expect(peaksOf([samples], 400)).toEqual(Float32Array.of(-0.3, 0.2, -0.1, 0.5))
  })

  it('shows a tone as wide buckets and silence as flat ones', () => {
    // 1 s of 440 Hz at half amplitude, then 1 s of silence, at 44.1 kHz: 441 frames per bucket.
    const peaks = peaksOf([toneThenSilence(44_100, 1, 0.5)], 44_100)

    expect(peaks).toHaveLength(2 * 200)
    expect(peaks[0]).toBeCloseTo(-0.5, 2)
    expect(peaks[1]).toBeCloseTo(0.5, 2)
    expect(peaks[2 * 150]).toBe(0)
    expect(peaks[2 * 150 + 1]).toBe(0)
  })

  it('keeps the last, shorter bucket', () => {
    const samples = Float32Array.of(0, 0, 0, 0, -0.7)

    expect(peaksOf([samples], 400)).toEqual(Float32Array.of(0, 0, -0.7, -0.7))
  })

  it('sizes a bucket from the sample rate, so 22.05 kHz gets 221 frames', () => {
    // round(22050 / 100) = 221: the 221st frame still falls in the first bucket.
    const samples = new Float32Array(222)
    samples[220] = 0.9
    samples[221] = -0.9

    expect(peaksOf([samples], 22_050)).toEqual(Float32Array.of(0, 0.9, -0.9, -0.9))
  })

  it('has no peaks before anything is pushed', () => {
    expect(peaksOf([], 400)).toHaveLength(0)
  })

  it('gives the same peaks for a signal pushed whole or in uneven pieces', () => {
    const signal = wobble(1000)
    const whole = peaksOf([signal], 400)

    // Pieces shorter than a bucket (4 samples), an empty one, and one that ends mid-bucket.
    const sizes = [1, 0, 3, 2, 7, 0, 90, 5, 400, 492]
    const pieces: Float32Array[] = []
    let start = 0
    for (const size of sizes) {
      pieces.push(signal.subarray(start, start + size))
      start += size
    }

    expect(start).toBe(signal.length)
    expect(peaksOf(pieces, 400)).toEqual(whole)
  })

  it('finishes the open bucket with the next slice, as at 22.05 kHz', () => {
    // A 60 s slice is 1,323,000 samples: 5,986 buckets of 221 and 94 samples left over.
    const firstSlice = new Float32Array(1_323_000)
    firstSlice[firstSlice.length - 1] = 0.9
    // The next slice completes that bucket with 127 samples, then starts a whole one of its own.
    const secondSlice = new Float32Array(127 + 221)
    secondSlice[126] = -0.9
    secondSlice[127] = 0.5

    const peaks = peaksOf([firstSlice, secondSlice], 22_050)

    expect(peaks).toHaveLength(2 * 5988)
    expect(peaks.subarray(2 * 5985, 2 * 5986)).toEqual(Float32Array.of(0, 0))
    expect(peaks.subarray(2 * 5986, 2 * 5987)).toEqual(Float32Array.of(-0.9, 0.9))
    expect(peaks.subarray(2 * 5987)).toEqual(Float32Array.of(0, 0.5))
  })

  it('leaves only the very last bucket short, wherever the slices end', () => {
    // 25 samples in buckets of 4 is six whole ones and one with a single sample.
    const signal = wobble(25)
    const peaks = peaksOf(
      [signal.subarray(0, 10), signal.subarray(10, 18), signal.subarray(18)],
      400,
    )

    expect(peaks).toHaveLength(2 * 7)
    expect(peaks.subarray(2 * 6)).toEqual(Float32Array.of(signal[24] ?? 0, signal[24] ?? 0))
    expect(peaks).toEqual(peaksOf([signal], 400))
  })
})
