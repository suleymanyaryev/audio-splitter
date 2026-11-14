import { describe, it, expect } from 'vitest'

import { CHIP_DIAMETER, placeSplitNumbers } from '../place-split-numbers.ts'

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

  describe('with a selected split', () => {
    it('gives the selected number the width of its 20 px circle, centred on its line', () => {
      const placed = placeSplitNumbers(
        [
          { x: 100, textWidth: 8 },
          { x: 300, textWidth: 8 },
        ],
        1000,
        1,
      )

      expect(CHIP_DIAMETER).toBe(20)
      expect(placed).toEqual([
        { index: 0, left: 96 },
        { index: 1, left: 290 },
      ])
    })

    it('keeps the circle inside the canvas at an edge', () => {
      expect(placeSplitNumbers([{ x: 4, textWidth: 8 }], 1000, 0)).toEqual([{ index: 0, left: 0 }])
      expect(placeSplitNumbers([{ x: 996, textWidth: 8 }], 1000, 0)).toEqual([
        { index: 0, left: 980 },
      ])
    })

    it('always shows the selected number, leaving out a number before it that it would touch', () => {
      // 8 px number at 100 (96 to 104), circle at 110 (100 to 120): they overlap.
      const placed = placeSplitNumbers(
        [
          { x: 100, textWidth: 8 },
          { x: 110, textWidth: 8 },
        ],
        1000,
        1,
      )

      expect(placed).toEqual([{ index: 1, left: 100 }])
    })

    it('leaves out a number after it that comes within the gap of the circle', () => {
      // Circle at 100 (90 to 110); an 8 px number at 117 starts at 113, 3 px away.
      const placed = placeSplitNumbers(
        [
          { x: 100, textWidth: 8 },
          { x: 117, textWidth: 8 },
          { x: 140, textWidth: 8 },
        ],
        1000,
        0,
      )

      expect(placed.map((number) => number.index)).toEqual([0, 2])
    })

    it('does not give the first split precedence over the selected one', () => {
      const placed = placeSplitNumbers(
        [
          { x: 10, textWidth: 8 },
          { x: 14, textWidth: 8 },
        ],
        1000,
        1,
      )

      expect(placed.map((number) => number.index)).toEqual([1])
    })
  })
})
