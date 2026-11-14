import { describe, it, expect } from 'vitest'

import { decibelsToY } from '../decibels-to-y.ts'

describe('decibelsToY', () => {
  it('puts 0 dB on the top edge and -60 dB on the bottom edge', () => {
    expect(decibelsToY(0, 120)).toBe(0)
    expect(decibelsToY(-60, 120)).toBe(120)
  })

  it('is linear in dB between the edges', () => {
    expect(decibelsToY(-30, 120)).toBe(60)
    expect(decibelsToY(-15, 120)).toBe(30)
    expect(decibelsToY(-45, 80)).toBe(60)
  })

  it('clamps anything quieter than -60 dB, the -100 dB floor included, to the bottom edge', () => {
    expect(decibelsToY(-75, 120)).toBe(120)
    expect(decibelsToY(-100, 120)).toBe(120)
  })

  it('clamps anything above 0 dB to the top edge', () => {
    expect(decibelsToY(3, 120)).toBe(0)
  })
})
