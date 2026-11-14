import { describe, it, expect } from 'vitest'

import { formatEdits } from '../format-edits.ts'

describe('formatEdits', () => {
  it('counts one edit in the singular', () => {
    expect(formatEdits(1)).toBe('1 edit')
  })

  it('counts any other number in the plural', () => {
    expect(formatEdits(4)).toBe('4 edits')
    expect(formatEdits(12)).toBe('12 edits')
  })
})
