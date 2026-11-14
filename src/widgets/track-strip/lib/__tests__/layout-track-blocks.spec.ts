import { describe, it, expect } from 'vitest'

import { layoutTrackBlocks } from '../layout-track-blocks.ts'

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

  it('splits what the 6 px lands leave in proportion to the lengths', () => {
    // Two lands of 6 px take 12 px, leaving 588 px for 100 : 200 : 300 s.
    const widths = widthsOf([100, 200, 300], 600)

    expect(widths[0]).toBeCloseTo(98, 9)
    expect(widths[1]).toBeCloseTo(196, 9)
    expect(widths[2]).toBeCloseTo(294, 9)
  })

  it('always fills the strip exactly, lands included', () => {
    const lengths = [1, 600, 3, 900, 2, 450, 5000]
    const widths = widthsOf(lengths, 1200)

    let total = 6 * (lengths.length - 1)
    for (const width of widths) total += width
    expect(total).toBeCloseTo(1200, 9)
  })

  it('keeps a very short track at a 4 px sliver and shrinks the others to pay for it', () => {
    const widths = widthsOf([0.001, 100, 100], 416)

    // 416 - 12 for the lands = 404, minus the 4 px sliver, shared by the two long tracks.
    expect(widths[0]).toBe(4)
    expect(widths[1]).toBeCloseTo(200, 9)
    expect(widths[2]).toBeCloseTo(200, 9)
  })

  it('hides the name under 32 px and the length under 72 px', () => {
    // Three lands take 18 px of 358, leaving 340 px for 100 : 50 : 15 : 5 s.
    const blocks = layoutTrackBlocks([100, 50, 15, 5], 358)

    expect(blocks.map((block) => Math.round(block.widthPx))).toEqual([200, 100, 30, 10])
    expect(blocks.map((block) => block.showName)).toEqual([true, true, false, false])
    expect(blocks.map((block) => block.showLength)).toEqual([true, true, false, false])
  })

  it('shows the name but not the length from 32 to 72 px', () => {
    const blocks = layoutTrackBlocks([100, 50, 20], 12 + 340)

    expect(blocks.map((block) => Math.round(block.widthPx))).toEqual([200, 100, 40])
    expect(blocks.map((block) => block.showName)).toEqual([true, true, true])
    expect(blocks.map((block) => block.showLength)).toEqual([true, true, false])
  })

  it('shows neither on a strip with dozens of tracks on a laptop-width screen', () => {
    // 66 equal tracks on 1150 px: 65 lands take 390 px, leaving about 11.5 px per block.
    const blocks = layoutTrackBlocks(
      Array.from({ length: 66 }, () => 120),
      1150,
    )

    expect(blocks).toHaveLength(66)
    expect(blocks.every((block) => !block.showName && !block.showLength)).toBe(true)
    expect(blocks[0]?.widthPx).toBeCloseTo(760 / 66, 9)
  })

  it('makes equal blocks when the lengths are all zero or the strip is too narrow for the minimums', () => {
    expect(widthsOf([0, 0], 106)).toEqual([50, 50])
    expect(widthsOf([10, 20], 8 + 6)).toEqual([4, 4])
  })
})
