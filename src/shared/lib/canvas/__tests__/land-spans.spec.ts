import { describe, it, expect } from 'vitest'

import { landSpans, type LandGap } from '../land-spans.ts'

// An hour on a 1,200 px canvas: 3 s per pixel.
const DURATION = 3600
const WIDTH = 1200

function gap(startSeconds: number, endSeconds: number, edge: LandGap['edge'] = null): LandGap {
  return { startSeconds, endSeconds, edge }
}

describe('landSpans', () => {
  it('keeps a gap that is already 12 px wide or wider as it is', () => {
    // 60 s is 20 px.
    const [span] = landSpans([gap(600, 660)], DURATION, WIDTH)

    expect(span?.left).toBeCloseTo(200, 9)
    expect(span?.right).toBeCloseTo(220, 9)
  })

  it('widens a narrow gap around its middle to 12 px', () => {
    // 2 s around 1,500 s: a pixel at x = 500.
    const [span] = landSpans([gap(1499, 1501)], DURATION, WIDTH)

    expect(span?.right).toBeCloseTo(506, 9)
    expect(span?.left).toBeCloseTo(494, 9)
  })

  it('widens a lead-in from the left edge and a run-out from the right edge', () => {
    const spans = landSpans([gap(0, 3, 'lead-in'), gap(3597, 3600, 'run-out')], DURATION, WIDTH)

    expect(spans).toEqual([
      { left: 0, right: 12 },
      { left: 1188, right: 1200 },
    ])
  })

  it('keeps a widened gap inside the canvas when its middle is near an edge', () => {
    const spans = landSpans([gap(6, 9), gap(3591, 3594)], DURATION, WIDTH)

    expect(spans).toEqual([
      { left: 0, right: 12 },
      { left: 1188, right: 1200 },
    ])
  })

  it('lets widened neighbours overlap, each keeping its own centre', () => {
    // 15 s (5 px) apart.
    const spans = landSpans([gap(1499, 1501), gap(1514, 1516)], DURATION, WIDTH)

    expect(spans).toHaveLength(2)
    expect(spans[0]?.right).toBeGreaterThan(spans[1]?.left ?? Infinity)
  })

  it('returns nothing for no gaps', () => {
    expect(landSpans([], DURATION, WIDTH)).toEqual([])
  })
})
