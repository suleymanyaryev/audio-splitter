import { describe, it, expect } from 'vitest'

import { swapMoment, type SwapLink } from '../swap-moment.ts'

// A link to track `other` that shares `here` in this track and starts at `thereFrom` in the other.
function link(other: number, here: [number, number], thereFrom: number): SwapLink {
  return {
    other,
    here: { from: here[0], to: here[1] },
    there: { from: thereFrom, to: thereFrom + here[1] - here[0] },
  }
}

describe('swapMoment', () => {
  it('is null with no link', () => {
    expect(swapMoment([], 10)).toBeNull()
  })

  it('goes to the same moment in the other track inside the shared stretch', () => {
    expect(swapMoment([link(0, [40, 100], 5)], 52.5)).toEqual({ other: 0, seconds: 17.5 })
  })

  it('goes to the start of the stretch in the other track from outside it', () => {
    expect(swapMoment([link(0, [40, 100], 5)], 10)).toEqual({ other: 0, seconds: 5 })
    expect(swapMoment([link(0, [40, 100], 5)], 130)).toEqual({ other: 0, seconds: 5 })
  })

  it('takes the link whose stretch holds the time over a nearer start', () => {
    const links = [link(0, [0, 60], 0), link(1, [61, 120], 30)]
    expect(swapMoment(links, 59)).toEqual({ other: 0, seconds: 59 })
  })

  it('takes the nearest stretch when none holds the time', () => {
    const links = [link(0, [0, 30], 0), link(1, [100, 140], 20)]
    expect(swapMoment(links, 80)?.other).toBe(1)
    expect(swapMoment(links, 50)?.other).toBe(0)
  })

  it('takes the first link on a tie', () => {
    const links = [link(0, [0, 30], 0), link(1, [70, 100], 0)]
    expect(swapMoment(links, 50)?.other).toBe(0)
  })
})
