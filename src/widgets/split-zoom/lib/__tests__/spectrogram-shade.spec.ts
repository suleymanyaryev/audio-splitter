import { describe, it, expect } from 'vitest'

import { hexToRgb, loudestBandValue, shadeOf } from '../spectrogram-shade.ts'

// A band's stored byte, from its dB (0 is -100 dB, 255 is 0 dB).
const byteOf = (decibels: number) => ((decibels + 100) / 100) * 255

describe('shadeOf', () => {
  it('is 1 at the file’s loudest band value and 0 at 80 dB under it', () => {
    expect(shadeOf(byteOf(-10), byteOf(-10))).toBeCloseTo(1, 9)
    expect(shadeOf(byteOf(-90), byteOf(-10))).toBeCloseTo(0, 9)
  })

  it('runs evenly in dB between the two', () => {
    expect(shadeOf(byteOf(-50), byteOf(-10))).toBeCloseTo(0.5, 9)
    expect(shadeOf(byteOf(-30), byteOf(-10))).toBeCloseTo(0.75, 9)
  })

  it('stays at 0 further down, so the floor of a loud file is the background', () => {
    expect(shadeOf(0, byteOf(0))).toBe(0)
  })
})

describe('loudestBandValue', () => {
  it('is the highest byte of every band of every column', () => {
    expect(loudestBandValue(Uint8Array.of(3, 200, 17, 199))).toBe(200)
    expect(loudestBandValue(new Uint8Array(0))).toBe(0)
  })
})

describe('hexToRgb', () => {
  it('reads a token’s #rrggbb, with or without the space a computed style keeps', () => {
    expect(hexToRgb('#fafbfa')).toEqual([250, 251, 250])
    expect(hexToRgb(' #1b2326')).toEqual([27, 35, 38])
  })
})
