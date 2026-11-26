import { shadeOf } from './spectrogram-shade.ts'

type Rgb = [number, number, number]

/*
Paints the strip into `pixels`, RGBA, from the band values of each pixel column (`merged`, from
`mergeSpectrogram`), one row per band with the top band in the top row: each band is mixed from
`background` to `text` by its shade (`shadeOf`). A pixel with no value (-1) is left clear, so
nothing is drawn outside the file.
*/
export function paintSpectrogram(
  pixels: Uint8ClampedArray,
  merged: Int16Array,
  bandCount: number,
  loudest: number,
  background: Rgb,
  text: Rgb,
): void {
  const width = merged.length / bandCount
  for (let x = 0; x < width; x++) {
    for (let band = 0; band < bandCount; band++) {
      const at = ((bandCount - 1 - band) * width + x) * 4
      const value = merged[x * bandCount + band] ?? -1
      if (value < 0) {
        pixels[at + 3] = 0
        continue
      }
      const shade = shadeOf(value, loudest)
      for (const [channel, from] of background.entries()) {
        pixels[at + channel] = from + ((text[channel] ?? from) - from) * shade
      }
      pixels[at + 3] = 255
    }
  }
}
