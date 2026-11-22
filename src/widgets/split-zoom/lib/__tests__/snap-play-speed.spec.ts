import { describe, expect, it } from 'vitest'
import { snapPlaySpeed } from '../snap-play-speed.ts'

describe('snapPlaySpeed', () => {
  it.each([0.5, 0.7, 1, 1.3, 1.9, 2])('keeps %s, which is on the grid', (speed) => {
    expect(Object.is(snapPlaySpeed(speed), speed)).toBe(true)
  })

  it.each([
    [1.04, 1],
    [1.06, 1.1],
    [1.34, 1.3],
    [1.36, 1.4],
  ])('moves %s to %s', (speed, snapped) => {
    expect(Object.is(snapPlaySpeed(speed), snapped)).toBe(true)
  })
})
