// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/*
Reads the `--color-*` values of both themes from the CSS entry and checks the pairs DESIGN.md
names: 4.5:1 for text (WCAG AA) and 3:1 for what is not text (lines, borders, the focus ring).
A change of palette that breaks a pair fails here; the threshold stays.
*/

const TEXT_RATIO = 4.5
const NON_TEXT_RATIO = 3

const css = readFileSync(path.resolve(import.meta.dirname, '../main.css'), 'utf8')

type Palette = Record<string, string>

// The `--color-name: #hex` declarations inside the first block that opens with `selector`.
function colorsIn(selector: string): Palette {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`main.css has no ${selector} block`)
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  const palette: Palette = {}
  for (const [, name, value] of block.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})\b/gi)) {
    if (name && value) palette[name] = value
  }
  return palette
}

const light = colorsIn('@theme static')
// The dark block overrides most of the light variables; the rest (the on-colours of a ground that is the same, the mark) carry over.
const dark = { ...light, ...colorsIn("[data-theme='dark']") }

// WCAG 2.x relative luminance of an sRGB colour.
function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((at) => {
    const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string): number {
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

// [foreground, background] token names.
const textPairs = [
  ['ink', 'ground'],
  ['ink', 'surface'],
  ['muted', 'ground'],
  ['muted', 'surface'],
  ['ink', 'land'], // a left-out block's text in the strip
  ['on-track', 'track'],
  ['on-split', 'split'],
  ['on-fill', 'fill'],
  ['on-fill', 'fill-hover'],
  ['on-band', 'band'],
  ['on-band-muted', 'band'],
  ['split', 'surface'], // the danger button, the error messages and the threshold readout
  ['band', 'on-band'], // the inverse button
  ['surface', 'ink'], // the tooltip
] as const

const nonTextPairs = [
  ['split', 'land'],
  ['split', 'surface'],
  ['edge', 'surface'],
  ['ink', 'ground'], // the focus ring
  ['ink', 'surface'], // the focus ring
  ['wave', 'surface'],
  ['wave', 'land'],
  ['fill', 'surface'], // the edge of a slate button
  ['fill', 'ground'],
  ['mark', 'band'], // the header's mark
  ['on-band', 'band'], // the focus ring on the band
  ['on-track', 'track'], // the focus ring on a track block
] as const

const themes = [
  ['light', light],
  ['dark', dark],
] as const

describe('the palette', () => {
  it.each(themes)('has every colour of a pair in %s', (_theme, palette) => {
    const names = new Set([...textPairs, ...nonTextPairs].flat())
    for (const name of names)
      expect({ name, value: palette[name] }).toEqual({
        name,
        value: expect.stringMatching(/^#[\da-f]{6}$/i),
      })
  })

  describe.each(themes)('in %s', (_theme, palette) => {
    it.each(textPairs)('sets %s on %s at 4.5:1 or better', (foreground, background) => {
      const ratio = contrastRatio(palette[foreground] ?? '', palette[background] ?? '')
      expect(ratio).toBeGreaterThanOrEqual(TEXT_RATIO)
    })

    it.each(nonTextPairs)('sets %s against %s at 3:1 or better', (foreground, background) => {
      const ratio = contrastRatio(palette[foreground] ?? '', palette[background] ?? '')
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_RATIO)
    })
  })
})
