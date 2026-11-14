import { describe, it, expect } from 'vitest'

import { placeSplitNumbers } from '../place-split-numbers.ts'

describe('placeSplitNumbers', () => {
  it('centres each number on its line', () => {
    const placed = placeSplitNumbers(
      [
        { x: 100, textWidth: 8 },
        { x: 300, textWidth: 16 },
      ],
      1000,
    )

    expect(placed).toEqual([
      { index: 0, left: 96 },
      { index: 1, left: 292 },
    ])
  })

  it('keeps a number inside the canvas where its line is near an edge', () => {
    const placed = placeSplitNumbers(
      [
        { x: 3, textWidth: 16 },
        { x: 998, textWidth: 16 },
      ],
      1000,
    )

    expect(placed).toEqual([
      { index: 0, left: 0 },
      { index: 1, left: 984 },
    ])
  })

  it('leaves out a number that would come within the gap of the last one shown', () => {
    // 16 px numbers every 18 px: 2 px apart is under the 4 px gap, so every other one goes.
    const labels = [0, 1, 2, 3, 4].map((step) => ({ x: 100 + step * 18, textWidth: 16 }))

    expect(placeSplitNumbers(labels, 1000).map((number) => number.index)).toEqual([0, 2, 4])
  })

  it('shows every number when there is room for all of them', () => {
    const labels = [0, 1, 2].map((step) => ({ x: 100 + step * 40, textWidth: 16 }))

    expect(placeSplitNumbers(labels, 1000)).toHaveLength(3)
  })

  it('always shows the first split, and the same ones for the same input', () => {
    const labels = [10, 12, 14, 16].map((x) => ({ x, textWidth: 16 }))

    const first = placeSplitNumbers(labels, 1000)
    expect(first[0]?.index).toBe(0)
    expect(placeSplitNumbers(labels, 1000)).toEqual(first)
  })

  it('returns nothing for no splits', () => {
    expect(placeSplitNumbers([], 1000)).toEqual([])
  })
})
