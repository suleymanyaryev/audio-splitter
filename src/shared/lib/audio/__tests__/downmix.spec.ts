import { describe, it, expect } from 'vitest'

import { downmix } from '../downmix.ts'

describe('downmix', () => {
  it('passes a mono signal through unchanged', () => {
    const mono = Float32Array.of(0.5, -0.25, 0)

    expect(downmix(mono, 1)).toEqual(Float32Array.of(0.5, -0.25, 0))
  })

  it('averages left and right of each stereo frame', () => {
    /*
    Interleaved L R L R: the first frames of sample1.m4a at 1:00, from
    docs/concepts/01-sound-is-numbers.md.
    */
    const stereo = Float32Array.of(0.0712, 0.0049, 0.0679, 0.0027, 0.5, -0.5)

    const mono = downmix(stereo, 2)

    expect(mono).toHaveLength(3)
    expect(mono[0]).toBeCloseTo(0.03805, 5)
    expect(mono[1]).toBeCloseTo(0.0353, 5)
    expect(mono[2]).toBe(0)
  })

  it('averages every channel of a 5.1 frame', () => {
    const sixChannels = Float32Array.of(0.6, 0.6, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1)

    expect(downmix(sixChannels, 6)).toEqual(Float32Array.of(0.2, 1))
  })
})
