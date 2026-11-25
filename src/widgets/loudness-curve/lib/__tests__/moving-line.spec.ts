import { describe, it, expect } from 'vitest'

import {
  aroundByColumn,
  columnAt,
  depthFromPointer,
  isOnMovingLine,
  isOnPanel,
  movingLineColumns,
} from '../moving-line.ts'
import { curveY } from '../threshold-line.ts'

const HEIGHT = 120

describe('movingLineColumns', () => {
  it('sits the depth under the loudness around, at each column', () => {
    // 1000 windows of -10 dB, then 1000 of -30 dB, over 4 columns.
    const around = Float32Array.from({ length: 2000 }, (_, index) => (index < 1000 ? -10 : -30))

    const line = movingLineColumns(around, 15, 4)

    expect([...line]).toEqual([-25, -25, -45, -45])
  })

  it('takes the loudness around at the middle of a column', () => {
    // 10 windows over 2 columns: the middles are windows 2 and 7.
    const around = Float32Array.from({ length: 10 }, (_, index) => -index)

    expect([...aroundByColumn(around, 2)]).toEqual([-2, -7])
  })
})

describe('isOnPanel', () => {
  it('leaves out what is under the -60 dB floor', () => {
    expect(isOnPanel(-60)).toBe(true)
    expect(isOnPanel(-60.1)).toBe(false)
  })
})

describe('columnAt', () => {
  it('keeps a pointer inside the columns', () => {
    expect(columnAt(-3, 10)).toBe(0)
    expect(columnAt(4.7, 10)).toBe(4)
    expect(columnAt(10, 10)).toBe(9)
  })
})

describe('isOnMovingLine', () => {
  const line = Float32Array.from([-20, -20, -40, -40])

  it('grabs the line within 6 px, at the pointer’s own column', () => {
    expect(isOnMovingLine(0.5, curveY(-20, HEIGHT) + 5, line, HEIGHT)).toBe(true)
    expect(isOnMovingLine(2.5, curveY(-40, HEIGHT) - 5, line, HEIGHT)).toBe(true)
    // The line is at -40 here, not at the level it has two columns away.
    expect(isOnMovingLine(2.5, curveY(-20, HEIGHT), line, HEIGHT)).toBe(false)
  })

  it('does not grab it from further away, or where it is under the floor', () => {
    expect(isOnMovingLine(0.5, curveY(-20, HEIGHT) + 7, line, HEIGHT)).toBe(false)
    expect(isOnMovingLine(0.5, HEIGHT - 1, Float32Array.of(-75), HEIGHT)).toBe(false)
    expect(isOnMovingLine(0.5, 60, new Float32Array(0), HEIGHT)).toBe(false)
  })
})

describe('depthFromPointer', () => {
  it('is the loudness around less the loudness under the pointer, in tenths', () => {
    // Around is -20 dB; a line at -35.04 dB is a depth of 15.04, which reads 15.0.
    expect(depthFromPointer(-20, curveY(-35.04, HEIGHT), 0, HEIGHT)).toBeCloseTo(15, 9)
  })

  it('keeps the offset it was grabbed at, so the line does not jump', () => {
    // Grabbed 4 px under the line at -35: a pointer at the same place gives the same depth.
    expect(depthFromPointer(-20, curveY(-35, HEIGHT) + 4, 4, HEIGHT)).toBeCloseTo(15, 9)
  })

  it('is held to the slider: 3 to 30 dB', () => {
    expect(depthFromPointer(-20, curveY(-21, HEIGHT), 0, HEIGHT)).toBe(3)
    expect(depthFromPointer(-20, curveY(-55, HEIGHT), 0, HEIGHT)).toBe(30)
  })
})
