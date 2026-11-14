import { describe, it, expect } from 'vitest'

import { decibelsToY, yToDecibels } from '../decibels-to-y.ts'

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

describe('yToDecibels', () => {
  it('puts the top edge at 0 dB and the bottom edge at -60 dB', () => {
    expect(yToDecibels(0, 120)).toBe(0)
    expect(yToDecibels(120, 120)).toBe(-60)
  })

  it('inverts decibelsToY inside the drawn range', () => {
    for (const decibels of [-5, -31.7, -48, -59.5]) {
      expect(yToDecibels(decibelsToY(decibels, 120), 120)).toBeCloseTo(decibels, 9)
    }
  })

  it('clamps a pointer outside the canvas to the drawn range', () => {
    expect(yToDecibels(-30, 120)).toBe(0)
    expect(yToDecibels(300, 120)).toBe(-60)
  })

  it('reads 0 dB for a canvas with no height', () => {
    expect(yToDecibels(10, 0)).toBe(0)
  })
})
