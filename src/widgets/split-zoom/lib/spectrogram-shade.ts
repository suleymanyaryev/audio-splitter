import { bandDecibels } from '@/shared/lib/audio/spectrum-builder.ts'

// The strip shades the 80 dB under the file's loudest band value; anything quieter is background.
const SHADE_RANGE_DB = 80

/*
How strong a band's stored value looks, from 0 (the theme's background) to 1 (its text colour):
even in dB over the 80 dB under `loudest`, the file's loudest band value. Shading from the file's
own top keeps the quiet detail of a quiet file.
*/
export function shadeOf(value: number, loudest: number): number {
  const under = bandDecibels(loudest) - bandDecibels(value)
  return Math.min(1, Math.max(0, 1 - under / SHADE_RANGE_DB))
}

// The file's loudest band value, worked out once per spectrogram: 3 h is 28 MB to scan.
const loudestOf = new WeakMap<Uint8Array, number>()

export function loudestBandValue(bands: Uint8Array): number {
  const known = loudestOf.get(bands)
  if (known !== undefined) return known
  let loudest = 0
  for (const value of bands) if (value > loudest) loudest = value
  loudestOf.set(bands, loudest)
  return loudest
}

// A colour token's `#rrggbb` as red, green and blue from 0 to 255.
export function hexToRgb(hex: string): [number, number, number] {
  const digits = hex.trim().slice(1)
  return [0, 2, 4].map((at) => Number.parseInt(digits.slice(at, at + 2), 16)) as [
    number,
    number,
    number,
  ]
}
