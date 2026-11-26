import { describe, it, expect } from 'vitest'

import { mergeSpectrogram } from '../merge-spectrogram.ts'

// Columns of two bands, band 0 first, from a list of [band 0, band 1] per column.
function spectrogramOf(columns: [number, number][]) {
  return { bands: Uint8Array.from(columns.flat()), bandCount: 2 }
}

// The merged [band 0, band 1] of each pixel, or null where it shows nothing.
function pixelsOf(merged: Int16Array) {
  return Array.from({ length: merged.length / 2 }, (_, x) =>
    merged[x * 2] === -1 ? null : [merged[x * 2], merged[x * 2 + 1]],
  )
}

describe('mergeSpectrogram', () => {
  it('keeps each band’s loudest value over the columns a pixel covers', () => {
    // 4 columns of 1 s on 2 px: pixel 0 covers columns 0 and 1, pixel 1 columns 2 and 3.
    const spectrogram = spectrogramOf([
      [10, 200],
      [90, 20],
      [0, 0],
      [255, 1],
    ])

    const merged = mergeSpectrogram(spectrogram, {
      startSeconds: 0,
      endSeconds: 4,
      width: 2,
      columnSeconds: 1,
    })

    expect(pixelsOf(merged)).toEqual([
      [90, 200],
      [255, 1],
    ])
  })

  it('keeps a short loud moment in a long stretch', () => {
    // 10 min of 50 ms columns on 600 px: 20 columns a pixel, one of them a drum hit.
    const columns: [number, number][] = Array.from({ length: 12_000 }, () => [40, 40])
    columns[6789] = [40, 230]

    const merged = mergeSpectrogram(spectrogramOf(columns), {
      startSeconds: 0,
      endSeconds: 600,
      width: 600,
      columnSeconds: 0.05,
    })

    // Column 6789 starts at 339.45 s: pixel 339.
    expect(pixelsOf(merged)[339]).toEqual([40, 230])
    expect(pixelsOf(merged)[338]).toEqual([40, 40])
  })

  it('merges the two columns of a pixel two columns wide', () => {
    // 1 s on 10 px of 50 ms columns: pixel 3 covers 0.3 to 0.4 s, columns 6 and 7.
    const columns: [number, number][] = Array.from({ length: 20 }, (_, index) => [index, 0])

    const merged = mergeSpectrogram(spectrogramOf(columns), {
      startSeconds: 0,
      endSeconds: 1,
      width: 10,
      columnSeconds: 0.05,
    })

    expect(pixelsOf(merged).map((pixel) => pixel?.[0])).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19])
  })

  it('repeats a column across the pixels of a window wider than one', () => {
    // 20 s on 800 px: 40 px a second, so a 50 ms column is 2 px.
    const columns: [number, number][] = Array.from({ length: 2000 }, (_, index) => [index % 256, 0])

    const merged = mergeSpectrogram(spectrogramOf(columns), {
      startSeconds: 11,
      endSeconds: 31,
      width: 800,
      columnSeconds: 0.05,
    })

    // Columns 220 and 221.
    expect(
      pixelsOf(merged)
        .slice(0, 4)
        .map((pixel) => pixel?.[0]),
    ).toEqual([220, 220, 221, 221])
  })

  it('leaves the pixels before the file’s start and past its last column empty', () => {
    // -1 s to 3 s on 4 px, with 2 s of columns: pixels at -1, 0, 1 and 2 s.
    const columns: [number, number][] = [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]

    const merged = mergeSpectrogram(spectrogramOf(columns), {
      startSeconds: -1,
      endSeconds: 3,
      width: 4,
      columnSeconds: 0.5,
    })

    expect(pixelsOf(merged)).toEqual([null, [2, 2], [4, 4], null])
  })
})
