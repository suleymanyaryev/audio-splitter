import { describe, it, expect } from 'vitest'

import { landSpansInWindow, outsideFileSpans } from '../zoom-spans.ts'

// A 20 s window on 800 px is 40 px a second.
const WINDOW = 20
const WIDTH = 800

describe('landSpansInWindow', () => {
  it('draws a gap at its true width', () => {
    // Window 319 to 339 s; the gap 325.2 to 332.8 s is 6.2 to 13.8 s into it.
    expect(
      landSpansInWindow([{ startSeconds: 325.2, endSeconds: 332.8 }], 329, WINDOW, WIDTH),
    ).toEqual([{ left: expect.closeTo(248, 6), right: expect.closeTo(552, 6) }])
  })

  it('keeps a 2 s gap 80 px wide, with no widening', () => {
    expect(landSpansInWindow([{ startSeconds: 99, endSeconds: 101 }], 100, WINDOW, WIDTH)).toEqual([
      { left: expect.closeTo(360, 6), right: expect.closeTo(440, 6) },
    ])
  })

  it('cuts a gap at the canvas edges', () => {
    // Window 90 to 110 s: the gap 85 to 92 s is cut at the left edge, 108 to 130 s at the right.
    expect(
      landSpansInWindow(
        [
          { startSeconds: 85, endSeconds: 92 },
          { startSeconds: 108, endSeconds: 130 },
        ],
        100,
        WINDOW,
        WIDTH,
      ),
    ).toEqual([
      { left: 0, right: expect.closeTo(80, 6) },
      { left: expect.closeTo(720, 6), right: WIDTH },
    ])
  })

  it('leaves out gaps wholly outside the window', () => {
    expect(
      landSpansInWindow(
        [
          { startSeconds: 10, endSeconds: 20 },
          { startSeconds: 200, endSeconds: 210 },
        ],
        100,
        WINDOW,
        WIDTH,
      ),
    ).toEqual([])
  })
})

describe('outsideFileSpans', () => {
  it('is empty while the window is inside the file', () => {
    expect(outsideFileSpans(100, WINDOW, 3600, WIDTH)).toEqual([])
  })

  it('covers the part before 0 s', () => {
    // Window -4 to 16 s: 4 s before the file is 160 px.
    expect(outsideFileSpans(6, WINDOW, 3600, WIDTH)).toEqual([{ left: 0, right: 160 }])
  })

  it('covers the part past the file', () => {
    // Window 3592 to 3612 s of a 3600 s file: from 8 s into the window, pixel 320.
    expect(outsideFileSpans(3602, WINDOW, 3600, WIDTH)).toEqual([{ left: 320, right: WIDTH }])
  })

  it('covers both sides of a file shorter than the window', () => {
    // Window -5 to 15 s of a 10 s file.
    expect(outsideFileSpans(5, WINDOW, 10, WIDTH)).toEqual([
      { left: 0, right: 200 },
      { left: 600, right: WIDTH },
    ])
  })
})
