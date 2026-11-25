import { describe, it, expect } from 'vitest'

import {
  formatDecibels,
  formatDuplicateResult,
  formatOffset,
  formatSeconds,
  formatSettingDecibels,
  formatSettingSeconds,
} from '../format-readout.ts'

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

describe('formatSettingSeconds', () => {
  it('writes no trailing zero', () => {
    expect(formatSettingSeconds(2)).toBe('2 s')
    expect(formatSettingSeconds(2.5)).toBe('2.5 s')
    expect(formatSettingSeconds(0.2)).toBe('0.2 s')
  })
})

describe('formatSettingDecibels', () => {
  it('writes no trailing zero', () => {
    expect(formatSettingDecibels(15)).toBe('15 dB')
    expect(formatSettingDecibels(11.5)).toBe('11.5 dB')
  })
})

describe('formatOffset', () => {
  it('says how far under the median, with no trailing zero', () => {
    expect(formatOffset(18)).toBe('18 dB under the median')
    expect(formatOffset(17.5)).toBe('17.5 dB under the median')
  })

  it('says over the median for a threshold above it', () => {
    expect(formatOffset(-3.2)).toBe('3.2 dB over the median')
  })
})

describe('formatDuplicateResult', () => {
  it('counts the duplicates, in the singular for one', () => {
    expect(formatDuplicateResult(1, 0)).toBe('1 duplicate')
    expect(formatDuplicateResult(23, 0)).toBe('23 duplicates')
  })

  it('counts the partial matches after the duplicates, in the singular for one', () => {
    expect(formatDuplicateResult(3, 1)).toBe('3 duplicates, 1 partial match')
    expect(formatDuplicateResult(1, 2)).toBe('1 duplicate, 2 partial matches')
  })

  it('leaves out what there is none of', () => {
    expect(formatDuplicateResult(0, 1)).toBe('1 partial match')
    expect(formatDuplicateResult(0, 4)).toBe('4 partial matches')
  })

  it('says none were found for none of either', () => {
    expect(formatDuplicateResult(0, 0)).toBe('No duplicates found')
  })
})
