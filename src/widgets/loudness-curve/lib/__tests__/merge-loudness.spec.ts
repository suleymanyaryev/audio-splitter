import { describe, it, expect } from 'vitest'

import { mergeLoudness } from '../merge-loudness.ts'

describe('mergeLoudness', () => {
  it('gives each column the loudest window under it', () => {
    // Four windows into two columns.
    const curve = Float32Array.of(-30, -12, -50, -20)

    expect(mergeLoudness(curve, 2)).toEqual(Float32Array.of(-12, -20))
  })

  it('keeps a short loud moment visible when many windows share a column', () => {
    // 600 windows (30 s) at the floor with one loud window, into 60 columns of 10 windows.
    const curve = new Float32Array(600).fill(-100)
    curve[234] = -6

    const columns = mergeLoudness(curve, 60)

    expect(columns).toHaveLength(60)
    expect(columns[23]).toBe(-6)
    expect(columns[22]).toBe(-100)
    expect(columns[24]).toBe(-100)
  })

  it('spreads uneven windows over the columns without leaving any out', () => {
    // Five windows into two columns: the first gets two, the second three.
    const curve = Float32Array.of(-40, -30, -20, -10, -50)

    expect(mergeLoudness(curve, 2)).toEqual(Float32Array.of(-30, -10))
  })

  it('repeats a window across columns when there are fewer windows than columns', () => {
    const curve = Float32Array.of(-10, -20)

    expect(mergeLoudness(curve, 4)).toEqual(Float32Array.of(-10, -10, -20, -20))
  })

  it('keeps the floor when a column holds only floor windows', () => {
    expect(mergeLoudness(Float32Array.of(-100, -100, -100), 1)).toEqual(Float32Array.of(-100))
  })
})
