import { describe, it, expect } from 'vitest'

import { zoomTimeToX, zoomXToTime } from '../zoom-axis.ts'

// Note 05: the split at 329.05 s selected, a 20 s window, the zoom canvas 899.33 px wide.
const CENTRE = 329.05
const WINDOW = 20
const WIDTH = 899.33

describe('zoomTimeToX', () => {
  it('puts the centre at half the width', () => {
    expect(zoomTimeToX(CENTRE, CENTRE, WINDOW, WIDTH)).toBeCloseTo(449.7, 1)
  })

  it('puts the window edges on the canvas edges', () => {
    expect(zoomTimeToX(319.05, CENTRE, WINDOW, WIDTH)).toBeCloseTo(0, 9)
    expect(zoomTimeToX(339.05, CENTRE, WINDOW, WIDTH)).toBeCloseTo(WIDTH, 9)
  })

  it('puts times outside the window outside the canvas', () => {
    expect(zoomTimeToX(309.05, CENTRE, WINDOW, WIDTH)).toBeCloseTo(-WIDTH / 2, 9)
  })

  it('draws the note gap, 325.25 s to 332.85 s, from 278.8 px to 620.5 px', () => {
    expect(zoomTimeToX(325.25, CENTRE, WINDOW, WIDTH)).toBeCloseTo(278.8, 1)
    expect(zoomTimeToX(332.85, CENTRE, WINDOW, WIDTH)).toBeCloseTo(620.5, 1)
  })
})

describe('zoomXToTime', () => {
  it('turns pixel 500 into 330.17 s, the drag input of the note', () => {
    expect(zoomXToTime(500, CENTRE, WINDOW, WIDTH)).toBeCloseTo(330.17, 2)
  })

  it('puts the centre time at half the width and the edges 10 s either side', () => {
    expect(zoomXToTime(WIDTH / 2, CENTRE, WINDOW, WIDTH)).toBeCloseTo(329.05, 9)
    expect(zoomXToTime(0, CENTRE, WINDOW, WIDTH)).toBeCloseTo(319.05, 9)
    expect(zoomXToTime(WIDTH, CENTRE, WINDOW, WIDTH)).toBeCloseTo(339.05, 9)
  })

  it('maps everything to the window start for a canvas with no width', () => {
    expect(zoomXToTime(10, CENTRE, WINDOW, 0)).toBeCloseTo(319.05, 9)
  })
})
