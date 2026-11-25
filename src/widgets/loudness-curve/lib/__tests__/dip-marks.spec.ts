import { describe, it, expect } from 'vitest'

import { dipMarks } from '../dip-marks.ts'
import { curveY } from '../threshold-line.ts'

describe('dipMarks', () => {
  it('puts a mark at the dip’s time, on the curve of its pixel column', () => {
    // 100 s over 200 px: 25 s is x = 50, in column 50, whose value is -40 dB.
    const columns = Float32Array.from({ length: 200 }, (_, column) => (column === 50 ? -40 : -10))

    const [mark] = dipMarks([25], 100, columns, 200, 120)

    expect(mark?.x).toBeCloseTo(50, 9)
    expect(mark?.y).toBeCloseTo(curveY(-40, 120), 9)
  })

  it('keeps a dip at the very end of the file inside the last column', () => {
    const columns = Float32Array.from({ length: 200 }, () => -20)

    const [mark] = dipMarks([100], 100, columns, 200, 120)

    expect(mark?.x).toBe(200)
    expect(mark?.y).toBeCloseTo(curveY(-20, 120), 9)
  })

  it('marks nothing without a curve or a dip', () => {
    expect(dipMarks([5], 10, new Float32Array(0), 100, 120)).toEqual([])
    expect(dipMarks([], 10, new Float32Array(100), 100, 120)).toEqual([])
  })
})
