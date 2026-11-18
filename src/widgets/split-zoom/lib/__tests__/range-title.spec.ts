import { describe, it, expect } from 'vitest'

import { rangeTitle } from '../range-title.ts'

describe('rangeTitle', () => {
  it('gives the start, the end and the length, with hundredths', () => {
    expect(rangeTitle({ startSeconds: 2523.25, endSeconds: 2650 })).toBe(
      '0:42:03.25 – 0:44:10.00 · 2:06.75',
    )
  })

  it('shows a range under a minute as 0:ss.cc', () => {
    expect(rangeTitle({ startSeconds: 10, endSeconds: 12.5 })).toBe(
      '0:00:10.00 – 0:00:12.50 · 0:02.50',
    )
  })

  it('shows the longest range, 10 min, as 10:00.00', () => {
    expect(rangeTitle({ startSeconds: 100, endSeconds: 700 })).toBe(
      '0:01:40.00 – 0:11:40.00 · 10:00.00',
    )
  })

  it('keeps the hour of a time late in a long file', () => {
    expect(rangeTitle({ startSeconds: 10_400, endSeconds: 11_000 })).toBe(
      '2:53:20.00 – 3:03:20.00 · 10:00.00',
    )
  })
})
