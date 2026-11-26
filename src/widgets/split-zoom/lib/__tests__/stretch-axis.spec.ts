import { describe, expect, it } from 'vitest'

import { stretchAxis } from '../stretch-axis.ts'

// A stretch from 10 s to 20 s on a 1,000 px canvas: 100 px a second.
const axis = () => stretchAxis({ startSeconds: 10, endSeconds: 20 }, 1000)

describe('stretchAxis', () => {
  it('maps the stretch’s start to the left edge and its end to the right edge', () => {
    expect(axis().toX(10)).toBe(0)
    expect(axis().toX(15)).toBe(500)
    expect(axis().toX(20)).toBe(1000)
  })

  it('maps a time outside the stretch to a pixel outside the canvas', () => {
    expect(axis().toX(9)).toBe(-100)
    expect(axis().toX(21)).toBe(1100)
  })

  it('maps a pixel back to its time', () => {
    expect(axis().toSeconds(0)).toBe(10)
    expect(axis().toSeconds(500)).toBe(15)
    expect(axis().toSeconds(1000)).toBe(20)
  })

  it('rounds the time under a pointer to 10 ms, so a click lands on the grid a drag does', () => {
    expect(axis().toSeconds(123.4)).toBeCloseTo(11.23, 9)
    expect(axis().toSeconds(123.6)).toBeCloseTo(11.24, 9)
  })

  it('takes the start for any pixel while the canvas has no width', () => {
    expect(stretchAxis({ startSeconds: 10, endSeconds: 20 }, 0).toSeconds(50)).toBe(10)
  })

  it('gives the centre and length the zoom helpers take', () => {
    expect(axis().centreSeconds).toBe(15)
    expect(axis().windowSeconds).toBe(10)
  })

  it('is no axis with nothing on show', () => {
    expect(stretchAxis(null, 1000)).toBeNull()
  })
})
