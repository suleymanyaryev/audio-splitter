import { describe, it, expect } from 'vitest'

import {
  CONTRAST_TOP_DB,
  contrastMarks,
  contrastThresholdFromPointer,
  contrastY,
} from '../contrast-lane.ts'
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

describe('contrastThresholdFromPointer', () => {
  const height = 80

  it('is the contrast under the pointer, in tenths of a dB', () => {
    // The scale is linear: the middle of the drawn height is half of 15 dB, 7.5 dB.
    expect(contrastThresholdFromPointer(contrastY(7.5, height), 0, height)).toBe(7.5)
    expect(contrastThresholdFromPointer(contrastY(9.04, height), 0, height)).toBe(9)
  })

  it('is where the line was grabbed, not where the pointer is: the line does not jump', () => {
    // The pointer took hold 3 px under the line, which is at 6 dB: held still, it still reads 6 dB.
    const line = contrastY(6, height)

    expect(contrastThresholdFromPointer(line + 3, 3, height)).toBe(6)
    expect(contrastThresholdFromPointer(line - 5 + 3, 3, height)).toBeGreaterThan(6)
  })

  it('is held to the slider: 3 to 12 dB', () => {
    expect(contrastThresholdFromPointer(0, 0, height)).toBe(12)
    expect(contrastThresholdFromPointer(contrastY(14, height), 0, height)).toBe(12)
    expect(contrastThresholdFromPointer(height, 0, height)).toBe(3)
    expect(contrastThresholdFromPointer(contrastY(1, height), 0, height)).toBe(3)
  })
})

describe('contrastMarks', () => {
  it('puts a mark at the peak’s time, on the curve of its pixel column', () => {
    // 100 s over 200 px: 25 s is x = 50, in column 50, whose contrast is 9 dB.
    const columns = Float32Array.from({ length: 200 }, (_, column) => (column === 50 ? 9 : 2))

    const [mark] = contrastMarks([25], 100, columns, 200, 80)

    expect(mark?.x).toBeCloseTo(50, 9)
    expect(mark?.y).toBeCloseTo(contrastY(9, 80), 9)
  })

  it('keeps a peak at the very end of the file inside the last column', () => {
    const columns = Float32Array.from({ length: 200 }, () => 4)

    const [mark] = contrastMarks([100], 100, columns, 200, 80)

    expect(mark?.x).toBe(200)
    expect(mark?.y).toBeCloseTo(contrastY(4, 80), 9)
  })

  it('marks nothing without a curve or a peak', () => {
    expect(contrastMarks([5], 10, new Float32Array(0), 100, 80)).toEqual([])
    expect(contrastMarks([], 10, new Float32Array(100), 100, 80)).toEqual([])
  })
})
