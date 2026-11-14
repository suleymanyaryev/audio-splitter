import { describe, it, expect } from 'vitest'

import { formatHundredths } from '../format-hundredths.ts'

describe('formatHundredths', () => {
  it('shows the hour, zero-padded minutes and seconds, and two decimals', () => {
    expect(formatHundredths(0)).toBe('0:00:00.00')
    expect(formatHundredths(30)).toBe('0:00:30.00')
    expect(formatHundredths(2523.25)).toBe('0:42:03.25')
    expect(formatHundredths(3686.07)).toBe('1:01:26.07')
  })

  it('rounds to the nearest hundredth', () => {
    expect(formatHundredths(12.344)).toBe('0:00:12.34')
    expect(formatHundredths(12.346)).toBe('0:00:12.35')
  })

  it('carries a rounded-up hundredth into seconds, minutes and hours', () => {
    expect(formatHundredths(59.996)).toBe('0:01:00.00')
    expect(formatHundredths(3599.999)).toBe('1:00:00.00')
    expect(formatHundredths(9.999)).toBe('0:00:10.00')
  })
})
