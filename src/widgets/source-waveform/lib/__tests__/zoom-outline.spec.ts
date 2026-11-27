import { describe, it, expect } from 'vitest'

import { zoomOutline } from '../zoom-outline.ts'

/*
docs/concepts/05-time-on-screen.md: sample1.m4a on a 1373.98 px canvas, the window on the split at
329.05 s.
*/
const DURATION = 3686.213991
const WIDTH = 1373.98

describe('zoomOutline', () => {
  it('spans centre ± 10 s, 7.5 px wide on the note 05 example', () => {
    const { left, right } = zoomOutline(329.05, 20, DURATION, WIDTH)

    expect(left).toBeCloseTo(118.9, 1)
    expect(right).toBeCloseTo(126.4, 1)
    expect(right - left).toBeCloseTo(7.5, 1)
  })

  it('clips to the left edge when the window starts before the file', () => {
    // 5 s centre: the window runs from -5 s, drawn from 0 to 15 s.
    const { left, right } = zoomOutline(5, 20, DURATION, WIDTH)

    expect(left).toBe(0)
    expect(right).toBeCloseTo(5.59, 2)
  })

  it('clips to the right edge when the window ends past the file', () => {
    const { left, right } = zoomOutline(DURATION - 5, 20, DURATION, WIDTH)

    expect(left).toBeCloseTo(WIDTH - 5.59, 2)
    expect(right).toBeCloseTo(WIDTH, 9)
  })

  it('covers the whole canvas for a file shorter than the window', () => {
    expect(zoomOutline(6, 20, 12, 600)).toEqual({ left: 0, right: 600 })
  })
})
