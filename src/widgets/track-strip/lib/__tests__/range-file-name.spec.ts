import { describe, it, expect } from 'vitest'

import { rangeFileName } from '../range-file-name.ts'

describe('rangeFileName', () => {
  it('is the name and the extension, with no track number', () => {
    expect(rangeFileName({ name: 'Evening Set 0.42.03–0.44.10', extension: 'm4a' })).toBe(
      'Evening Set 0.42.03–0.44.10.m4a',
    )
  })

  it('sanitises the name and lowercases the extension', () => {
    expect(rangeFileName({ name: 'live: 2024/11?', extension: 'MP3' })).toBe('live- 2024-11-.mp3')
  })

  it('falls back to "range" when the name is empty after sanitising', () => {
    expect(rangeFileName({ name: ' .. ', extension: 'opus' })).toBe('range.opus')
  })
})
