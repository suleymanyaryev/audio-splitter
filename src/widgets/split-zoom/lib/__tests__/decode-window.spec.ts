import { describe, expect, it } from 'vitest'

import { decodeWindow, nextWindow, windowHolds } from '../decode-window.ts'

const stretchOf = (startSeconds: number, lengthSeconds: number) => ({
  startSeconds,
  endSeconds: startSeconds + lengthSeconds,
})

describe('decodeWindow', () => {
  it('is the whole stretch when it is 10 min or less, wherever the playhead is', () => {
    expect(decodeWindow(stretchOf(100, 20), 110)).toEqual({ startSeconds: 100, endSeconds: 120 })
    expect(decodeWindow(stretchOf(100, 600), 400)).toEqual({ startSeconds: 100, endSeconds: 700 })
  })

  it('starts at the playhead and runs 10 min in a longer stretch', () => {
    expect(decodeWindow(stretchOf(100, 3000), 100)).toEqual({ startSeconds: 100, endSeconds: 700 })
    expect(decodeWindow(stretchOf(100, 3000), 1500.5)).toEqual({
      startSeconds: 1500.5,
      endSeconds: 2100.5,
    })
  })

  it('is held to the stretch’s end', () => {
    expect(decodeWindow(stretchOf(100, 3000), 2800)).toEqual({
      startSeconds: 2800,
      endSeconds: 3100,
    })
  })

  it('holds a playhead outside the stretch to it', () => {
    expect(decodeWindow(stretchOf(100, 3000), 50)).toEqual({ startSeconds: 100, endSeconds: 700 })
    expect(decodeWindow(stretchOf(100, 3000), 9000)).toEqual({
      startSeconds: 3100,
      endSeconds: 3100,
    })
  })
})

describe('windowHolds', () => {
  const stretch = stretchOf(0, 1000)
  const window = { startSeconds: 100, endSeconds: 700 }

  it('holds a time from the window’s start up to, but not including, its end', () => {
    expect(windowHolds(window, stretch, 100)).toBe(true)
    expect(windowHolds(window, stretch, 699.99)).toBe(true)
    expect(windowHolds(window, stretch, 700)).toBe(false)
    expect(windowHolds(window, stretch, 99.99)).toBe(false)
  })

  it('holds the stretch’s very end when the window runs to it', () => {
    expect(windowHolds({ startSeconds: 400, endSeconds: 1000 }, stretch, 1000)).toBe(true)
    expect(windowHolds({ startSeconds: 400, endSeconds: 1000 }, stretch, 1000.01)).toBe(false)
  })
})

describe('nextWindow', () => {
  const stretch = stretchOf(0, 2000)
  const window = { startSeconds: 100, endSeconds: 700 }

  it('is due when the playhead is 30 s from the window’s end, and starts where the window ends', () => {
    expect(nextWindow(stretch, window, 670)).toEqual({ startSeconds: 700, endSeconds: 1300 })
    expect(nextWindow(stretch, window, 699)).toEqual({ startSeconds: 700, endSeconds: 1300 })
  })

  it('is not due earlier', () => {
    expect(nextWindow(stretch, window, 669.99)).toBeNull()
    expect(nextWindow(stretch, window, 100)).toBeNull()
  })

  it('is held to the stretch’s end', () => {
    expect(nextWindow(stretch, { startSeconds: 1000, endSeconds: 1600 }, 1580)).toEqual({
      startSeconds: 1600,
      endSeconds: 2000,
    })
  })

  it('is never due for the last window, which a stretch of 10 min or less is', () => {
    expect(nextWindow(stretch, { startSeconds: 1400, endSeconds: 2000 }, 1990)).toBeNull()
    const short = stretchOf(50, 60)
    expect(nextWindow(short, { startSeconds: 50, endSeconds: 110 }, 100)).toBeNull()
  })
})
