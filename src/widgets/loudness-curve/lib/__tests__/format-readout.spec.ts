import { describe, it, expect } from 'vitest'

import { formatDecibels, formatSeconds } from '../format-readout.ts'

describe('formatDecibels', () => {
  it('writes one decimal and a real minus sign', () => {
    expect(formatDecibels(-31.72)).toBe('−31.7 dB')
    expect(formatDecibels(-60)).toBe('−60.0 dB')
  })

  it('writes no sign for zero, even a hair under it', () => {
    expect(formatDecibels(0)).toBe('0.0 dB')
    expect(formatDecibels(-0.04)).toBe('0.0 dB')
  })
})

describe('formatSeconds', () => {
  it('writes one decimal', () => {
    expect(formatSeconds(1)).toBe('1.0 s')
    expect(formatSeconds(0.2)).toBe('0.2 s')
  })
})
