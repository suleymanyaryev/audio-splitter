import { describe, it, expect } from 'vitest'

import { confidenceQueue } from '../confidence-queue.ts'

const at = (name: string, depth: number | null) => ({
  name,
  confidence: depth === null ? null : { band: 'likely' as const, depth },
})

describe('confidenceQueue', () => {
  it('puts the least deep first and leaves out the splits with none', () => {
    const queue = confidenceQueue([at('a', 12), at('b', null), at('c', 4), at('d', 9)])

    expect(queue.map((item) => item.name)).toEqual(['c', 'd', 'a'])
  })

  it('keeps time order between equal depths', () => {
    const queue = confidenceQueue([at('a', 6), at('b', 6), at('c', 3), at('d', 6)])

    expect(queue.map((item) => item.name)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('is empty when no split has a confidence', () => {
    expect(confidenceQueue([at('a', null)])).toEqual([])
    expect(confidenceQueue([])).toEqual([])
  })
})
