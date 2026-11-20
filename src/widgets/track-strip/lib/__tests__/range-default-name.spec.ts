import { describe, it, expect } from 'vitest'

import { rangeDefaultName } from '../range-default-name.ts'

describe('rangeDefaultName', () => {
  it('is the source stem and the range as h.mm.ss, dots in place of colons', () => {
    expect(rangeDefaultName('Evening Set', { startSeconds: 2523, endSeconds: 2650 })).toBe(
      'Evening Set 0.42.03–0.44.10',
    )
  })

  it('shows an hour and over as it is', () => {
    expect(rangeDefaultName('Evening Set', { startSeconds: 3599, endSeconds: 7384 })).toBe(
      'Evening Set 0.59.59–2.03.04',
    )
  })

  it('rounds each time to the nearest second', () => {
    expect(rangeDefaultName('set', { startSeconds: 10.4, endSeconds: 20.6 })).toBe(
      'set 0.00.10–0.00.21',
    )
  })

  it('carries a rounded-up 59.6 s into the minute and never reads 60 s', () => {
    expect(rangeDefaultName('set', { startSeconds: 59.6, endSeconds: 125 })).toBe(
      'set 0.01.00–0.02.05',
    )
  })
})
