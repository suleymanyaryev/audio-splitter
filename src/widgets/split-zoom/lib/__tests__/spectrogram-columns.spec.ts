import { describe, it, expect } from 'vitest'

import { columnsUnderPixels } from '../spectrogram-columns.ts'

describe('columnsUnderPixels', () => {
  it('gives each pixel the column whose window holds the pixel’s middle', () => {
    // 1 s on 10 px of 50 ms columns: pixel 3 covers 0.3 to 0.4 s, its middle 0.35 s is column 7.
    const columns = columnsUnderPixels({
      startSeconds: 0,
      endSeconds: 1,
      width: 10,
      columnSeconds: 0.05,
      columnCount: 100,
    })

    expect([...columns]).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19])
  })

  it('repeats a column across the pixels of a window wider than one', () => {
    // 20 s on 800 px: 40 px a second, so a 50 ms window is 2 px.
    const columns = columnsUnderPixels({
      startSeconds: 11,
      endSeconds: 31,
      width: 800,
      columnSeconds: 0.05,
      columnCount: 2000,
    })

    expect([...columns.subarray(0, 4)]).toEqual([220, 220, 221, 221])
  })

  it('leaves the pixels before the file’s start and past its last column empty', () => {
    // -1 s to 3 s on 4 px, with 2 s of columns: pixels at -0.5, 0.5, 1.5 and 2.5 s.
    const columns = columnsUnderPixels({
      startSeconds: -1,
      endSeconds: 3,
      width: 4,
      columnSeconds: 0.5,
      columnCount: 4,
    })

    expect([...columns]).toEqual([-1, 1, 3, -1])
  })
})
