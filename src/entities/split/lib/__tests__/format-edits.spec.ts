import { describe, it, expect } from 'vitest'

import { formatEdits, formatLoss, formatPendingSplits } from '../format-edits.ts'

describe('formatEdits', () => {
  it('counts one edit in the singular', () => {
    expect(formatEdits(1)).toBe('1 edit')
  })

  it('counts any other number in the plural', () => {
    expect(formatEdits(4)).toBe('4 edits')
    expect(formatEdits(12)).toBe('12 edits')
  })
})

describe('formatPendingSplits', () => {
  it('counts one pending split in the singular, and any other number in the plural', () => {
    expect(formatPendingSplits(1)).toBe('1 pending split')
    expect(formatPendingSplits(3)).toBe('3 pending splits')
  })
})

describe('formatLoss', () => {
  it('names the edits alone, or the pending splits alone', () => {
    expect(formatLoss(2, 0)).toBe('2 edits')
    expect(formatLoss(0, 3)).toBe('3 pending splits')
  })

  it('names both, edits first, when there are both', () => {
    expect(formatLoss(1, 1)).toBe('1 edit and 1 pending split')
    expect(formatLoss(4, 2)).toBe('4 edits and 2 pending splits')
  })
})
