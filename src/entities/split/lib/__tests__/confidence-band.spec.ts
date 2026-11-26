import { describe, it, expect } from 'vitest'

import { bandOf, contrastBandOf } from '../confidence-band.ts'

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

describe('contrastBandOf', () => {
  it.each([
    [3, 'doubtful'],
    [6.4, 'doubtful'],
    [6.499, 'doubtful'],
    [6.5, 'likely'],
    [12, 'likely'],
    [40, 'likely'],
  ])('reads %s dB as %s, and never as sure', (contrast, band) => {
    expect(contrastBandOf(contrast)).toBe(band)
  })
})
