import { describe, it, expect } from 'vitest'

import { CONTRAST_TOP_DB, contrastY } from '../contrast-lane.ts'
import { CURVE_LINE_WIDTH } from '../threshold-line.ts'

describe('contrastY', () => {
  const height = 80
  const inset = CURVE_LINE_WIDTH / 2
  const drawn = height - CURVE_LINE_WIDTH

  it('puts 0 dB on the bottom edge and the top of the scale on the top edge, inset by half a line', () => {
    expect(contrastY(0, height)).toBe(inset + drawn)
    expect(contrastY(CONTRAST_TOP_DB, height)).toBe(inset)
  })

  it('is linear in dB between the edges', () => {
    expect(contrastY(CONTRAST_TOP_DB / 2, height)).toBeCloseTo(inset + drawn / 2, 9)
  })

  it('holds a contrast over the scale on the top edge and a negative one on the bottom edge', () => {
    expect(contrastY(CONTRAST_TOP_DB + 10, height)).toBe(inset)
    expect(contrastY(-1, height)).toBe(inset + drawn)
  })
})
