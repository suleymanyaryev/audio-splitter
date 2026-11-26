import { describe, it, expect } from 'vitest'

import { paintSpectrogram } from '../paint-spectrogram.ts'

// Two pixels' worth of two bands, band 0 first: column 0 is (255, 0), column 1 is (51, 153).
const columnValues = [
  [255, 0],
  [51, 153],
]
const background: [number, number, number] = [250, 250, 250]
const text: [number, number, number] = [10, 30, 50]

// Paints one pixel column per entry, the merged values of that column or -1 for none.
function paint(columns: number[]) {
  const merged = Int16Array.from(columns.flatMap((column) => columnValues[column] ?? [-1, -1]))
  const pixels = new Uint8ClampedArray(columns.length * 2 * 4)
  paintSpectrogram(pixels, merged, 2, 255, background, text)
  // One [r, g, b, a] per pixel, row by row from the top.
  return Array.from({ length: pixels.length / 4 }, (_, at) => [
    ...pixels.subarray(at * 4, at * 4 + 4),
  ])
}

describe('paintSpectrogram', () => {
  it('paints the top band in the top row, loud in the text colour and the floor in the background', () => {
    // Column 0's band 0 is 0 dB, the file's loudest: the bottom row. Its band 1 is -100 dB.
    expect(paint([0])).toEqual([
      [250, 250, 250, 255],
      [10, 30, 50, 255],
    ])
  })

  it('mixes the two colours by the shade between', () => {
    // Band 1 of column 1 is 153 (-40 dB): halfway down the 80 dB, so halfway between the colours.
    // Band 0 is 51 (-80 dB): the background.
    expect(paint([1])).toEqual([
      [130, 140, 150, 255],
      [250, 250, 250, 255],
    ])
  })

  it('leaves a pixel with no column clear, and repeats a column across its pixels', () => {
    const pixels = paint([-1, 0, 0])

    expect(pixels[0]).toEqual([0, 0, 0, 0])
    expect(pixels[1]).toEqual(pixels[2])
    expect(pixels[3]).toEqual([0, 0, 0, 0])
  })
})
