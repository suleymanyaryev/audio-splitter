import { describe, it, expect } from 'vitest'

import { bandOf } from '../confidence-band.ts'

describe('bandOf', () => {
  it.each([
    [8.9, 'doubtful'],
    [9, 'likely'],
    [14.9, 'likely'],
    [15, 'sure'],
    [37.4, 'sure'],
    [3, 'doubtful'],
  ])('reads %s dB as %s', (depth, band) => {
    expect(bandOf(depth)).toBe(band)
  })
})
