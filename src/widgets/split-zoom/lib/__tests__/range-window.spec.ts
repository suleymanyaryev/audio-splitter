import { describe, it, expect } from 'vitest'

import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { rangeWindow } from '../range-window.ts'

describe('rangeWindow', () => {
  it('is centred on the middle of the range and as long as the range', () => {
    expect(rangeWindow({ startSeconds: 10, endSeconds: 40 })).toEqual({
      centreSeconds: 25,
      windowSeconds: 30,
    })
  })

  it('puts the range’s start on the left edge of the canvas and its end on the right', () => {
    const { centreSeconds, windowSeconds } = rangeWindow({
      startSeconds: 2523.25,
      endSeconds: 2650,
    })

    expect(zoomTimeToX(2523.25, centreSeconds, windowSeconds, 900)).toBeCloseTo(0, 9)
    expect(zoomTimeToX(2650, centreSeconds, windowSeconds, 900)).toBeCloseTo(900, 9)
  })
})
