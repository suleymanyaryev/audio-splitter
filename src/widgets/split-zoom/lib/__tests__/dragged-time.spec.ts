import { describe, it, expect } from 'vitest'

import { draggedTime } from '../dragged-time.ts'

describe('draggedTime', () => {
  it('turns the pointer x into a time on the zoom map', () => {
    /*
    Window 319.05 to 339.05 s on 900 px: pixel 500 is 319.05 + 500 / 900 * 20 = 330.1611 s,
    which rounds to the nearest 10 ms.
    */
    expect(draggedTime(500, 0, 329.05, 20, 900)).toBeCloseTo(330.16, 9)
  })

  it('puts the centre pixel on the centre time', () => {
    expect(draggedTime(450, 0, 329.05, 20, 900)).toBeCloseTo(329.05, 9)
  })

  it('rounds to the nearest hundredth in both directions', () => {
    // 900 px for 20 s: one pixel is 22.2 ms. Pixel 451 is 329.05 + 0.0222 = 329.0722.
    expect(draggedTime(451, 0, 329.05, 20, 900)).toBeCloseTo(329.07, 9)
    expect(draggedTime(449, 0, 329.05, 20, 900)).toBeCloseTo(329.03, 9)
  })

  it('keeps the line under the pointer by the distance it was grabbed at', () => {
    // Grabbed 5 px right of the line: the line is 5 px left of the pointer, 110 ms earlier.
    expect(draggedTime(455, 5, 329.05, 20, 900)).toBeCloseTo(329.05, 9)
  })
})
