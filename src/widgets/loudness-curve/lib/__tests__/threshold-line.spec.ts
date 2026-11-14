import { describe, it, expect } from 'vitest'

import {
  curveY,
  decibelsAt,
  handleTop,
  isOnThresholdLine,
  labelPlateTop,
  thresholdFromPointer,
} from '../threshold-line.ts'

describe('curveY and decibelsAt', () => {
  it('keeps 0 dB and -60 dB half a line width inside the canvas', () => {
    expect(curveY(0, 120)).toBeCloseTo(0.75, 9)
    expect(curveY(-60, 120)).toBeCloseTo(119.25, 9)
  })

  it('invert each other', () => {
    expect(decibelsAt(curveY(-31.7, 120), 120)).toBeCloseTo(-31.7, 9)
  })
})

describe('isOnThresholdLine', () => {
  it('grabs the line within 6 px on either side', () => {
    expect(isOnThresholdLine(60, 60)).toBe(true)
    expect(isOnThresholdLine(54, 60)).toBe(true)
    expect(isOnThresholdLine(66, 60)).toBe(true)
  })

  it('does not grab it from further away', () => {
    expect(isOnThresholdLine(53.9, 60)).toBe(false)
    expect(isOnThresholdLine(66.1, 60)).toBe(false)
  })
})

describe('thresholdFromPointer', () => {
  it('reads the loudness under the pointer in tenths of a dB', () => {
    const y = curveY(-31.72, 120)

    expect(thresholdFromPointer(y, 0, 120)).toBeCloseTo(-31.7, 9)
  })

  it('keeps the line where it was grabbed', () => {
    const lineY = curveY(-30, 120)

    // Grabbed 4 px under the line, moved to 10 px lower than the line was.
    expect(thresholdFromPointer(lineY + 10, 4, 120)).toBe(thresholdFromPointer(lineY + 6, 0, 120))
  })

  it('stays inside the drawn range', () => {
    expect(thresholdFromPointer(-50, 0, 120)).toBe(0)
    expect(thresholdFromPointer(500, 0, 120)).toBe(-60)
  })

  it('never returns a negative zero', () => {
    const threshold = thresholdFromPointer(curveY(-0.01, 120), 0, 120)

    expect(Object.is(threshold, 0)).toBe(true)
  })
})

describe('labelPlateTop', () => {
  it('puts the plate above the line', () => {
    expect(labelPlateTop(60)).toBe(41)
  })

  it('puts the plate below the line when there is no room above', () => {
    expect(labelPlateTop(10)).toBe(12)
  })
})

describe('handleTop', () => {
  it('centres the handle on the line', () => {
    expect(handleTop(60, 120)).toBe(55)
  })

  it('keeps the handle inside the canvas at either edge', () => {
    expect(handleTop(0.75, 120)).toBe(0)
    expect(handleTop(119.25, 120)).toBe(110)
  })
})
