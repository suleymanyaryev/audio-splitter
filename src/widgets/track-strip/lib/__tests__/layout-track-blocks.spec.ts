import { describe, it, expect } from 'vitest'

import { layoutTrackBlocks, SPLIT_ITEM_PX } from '../layout-track-blocks.ts'

function widthsOf(lengths: number[], stripWidth: number) {
  return layoutTrackBlocks(lengths, stripWidth).map((block) => block.widthPx)
}

describe('layoutTrackBlocks', () => {
  it('gives no blocks for no tracks', () => {
    expect(layoutTrackBlocks([], 1000)).toEqual([])
  })

  it('makes one block fill the whole strip, with name and length', () => {
    expect(layoutTrackBlocks([1800], 1000)).toEqual([
      { widthPx: 1000, showName: true, showLength: true },
    ])
  })

  it('makes the split items 8 px wide', () => {
    expect(SPLIT_ITEM_PX).toBe(8)
  })

  it('splits what the 8 px split items leave in proportion to the lengths', () => {
    // Two split items of 8 px take 16 px, leaving 584 px for 100 : 200 : 300 s.
    const widths = widthsOf([100, 200, 300], 600)

    expect(widths[0]).toBeCloseTo(97.333333333, 6)
    expect(widths[1]).toBeCloseTo(194.666666667, 6)
    expect(widths[2]).toBeCloseTo(292, 9)
  })

  it('always fills the strip exactly, split items included', () => {
    const lengths = [1, 600, 3, 900, 2, 450, 5000]
    const widths = widthsOf(lengths, 1200)

    let total = SPLIT_ITEM_PX * (lengths.length - 1)
    for (const width of widths) total += width
    expect(total).toBeCloseTo(1200, 9)
  })

  it('keeps a very short track at a clickable 12 px and shrinks the others to pay for it', () => {
    const widths = widthsOf([0.001, 100, 100], 416)

    // 416 - 16 for the split items = 400, minus the 12 px block, shared by the two long tracks.
    expect(widths[0]).toBe(12)
    expect(widths[1]).toBeCloseTo(194, 9)
    expect(widths[2]).toBeCloseTo(194, 9)
  })

  it('keeps a track of a few seconds at 12 px next to long ones', () => {
    // 3 s of 1203 s would be 2.4 px of 984.
    const widths = widthsOf([3, 600, 600], 1000)

    expect(widths[0]).toBe(12)
    expect(widths[1]).toBeCloseTo(486, 9)
  })

  it('hides the name under 32 px and the length under 72 px', () => {
    // Three split items take 24 px of 364, leaving 340 px for 100 : 50 : 15 : 10 s.
    const blocks = layoutTrackBlocks([100, 50, 15, 10], 364)

    expect(blocks.map((block) => Math.round(block.widthPx))).toEqual([194, 97, 29, 19])
    expect(blocks.map((block) => block.showName)).toEqual([true, true, false, false])
    expect(blocks.map((block) => block.showLength)).toEqual([true, true, false, false])
  })

  it('shows the name but not the length from 32 to 72 px', () => {
    const blocks = layoutTrackBlocks([100, 50, 20], 16 + 340)

    expect(blocks.map((block) => Math.round(block.widthPx))).toEqual([200, 100, 40])
    expect(blocks.map((block) => block.showName)).toEqual([true, true, true])
    expect(blocks.map((block) => block.showLength)).toEqual([true, true, false])
  })

  it('shows neither on a strip with dozens of tracks on a laptop-width screen', () => {
    // 66 equal tracks on 1150 px: 65 split items take 520 px, leaving about 9.5 px per block, which
    // is under the minimum: no room for it, so the blocks are equal.
    const blocks = layoutTrackBlocks(
      Array.from({ length: 66 }, () => 120),
      1150,
    )

    expect(blocks).toHaveLength(66)
    expect(blocks.every((block) => !block.showName && !block.showLength)).toBe(true)
    expect(blocks[0]?.widthPx).toBeCloseTo(630 / 66, 9)
  })

  it('makes equal blocks when the lengths are all zero or the strip is too narrow for the minimums', () => {
    expect(widthsOf([0, 0], 106)).toEqual([49, 49])
    expect(widthsOf([10, 20], 8 + 8)).toEqual([4, 4])
  })
})
