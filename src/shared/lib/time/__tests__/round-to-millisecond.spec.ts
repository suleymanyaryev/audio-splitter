import { describe, it, expect } from 'vitest'

import { roundToMillisecond } from '../round-to-millisecond.ts'

// The callers put the number on a command line as text, so the text is what counts.
const asText = (seconds: number) => String(roundToMillisecond(seconds))

describe('roundToMillisecond', () => {
  it('drops the float error that sums and differences leave', () => {
    expect(asText(0.1 + 0.2)).toBe('0.3')
    expect(asText(329.05 - 4)).toBe('325.05')
  })

  it('rounds to the nearest millisecond', () => {
    expect(asText(1.2344)).toBe('1.234')
    expect(asText(1.2346)).toBe('1.235')
  })

  it('keeps whole seconds and zero as they are', () => {
    expect(asText(0)).toBe('0')
    expect(asText(30)).toBe('30')
  })
})
