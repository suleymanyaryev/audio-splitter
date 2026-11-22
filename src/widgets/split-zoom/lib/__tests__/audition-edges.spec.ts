import { describe, it, expect } from 'vitest'

import { auditionEdgeRects } from '../audition-edges.ts'

describe('auditionEdgeRects', () => {
  it('puts a stem at the top and the bottom of the start edge, with a foot pointing right', () => {
    expect(auditionEdgeRects(100, 1, 160)).toEqual([
      { x: 99, y: 0, width: 2, height: 16 },
      { x: 99, y: 14, width: 8, height: 2 },
      { x: 99, y: 144, width: 2, height: 16 },
      { x: 99, y: 144, width: 8, height: 2 },
    ])
  })

  it('points the end edge’s foot left, back at the audition', () => {
    expect(auditionEdgeRects(300, -1, 160)).toEqual([
      { x: 299, y: 0, width: 2, height: 16 },
      { x: 293, y: 14, width: 8, height: 2 },
      { x: 299, y: 144, width: 2, height: 16 },
      { x: 293, y: 144, width: 8, height: 2 },
    ])
  })

  it('snaps the stem to a whole pixel', () => {
    expect(auditionEdgeRects(100.4, 1, 160)[0]?.x).toBe(99)
  })
})
