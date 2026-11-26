import type { Spectrogram } from '@/shared/lib/audio/spectrum-builder.ts'
import { shadeOf } from './spectrogram-shade.ts'

type Rgb = [number, number, number]

/*
Paints the strip into `pixels`, RGBA, one pixel column per entry of `columns` and one row per
band, the top band in the top row: each band is mixed from `background` to `text` by its shade
(`shadeOf`). A pixel with no column (-1) is left clear, so nothing is drawn outside the file.
*/
export function paintSpectrogram(
  pixels: Uint8ClampedArray,
  columns: Int32Array,
  spectrogram: Pick<Spectrogram, 'bands' | 'bandCount'>,
  loudest: number,
  background: Rgb,
  text: Rgb,
): void {
  const { bands, bandCount } = spectrogram
  const width = columns.length
  for (let x = 0; x < width; x++) {
    const column = columns[x] ?? -1
    for (let band = 0; band < bandCount; band++) {
      const at = ((bandCount - 1 - band) * width + x) * 4
      if (column < 0) {
        pixels[at + 3] = 0
        continue
      }
      const shade = shadeOf(bands[column * bandCount + band] ?? 0, loudest)
      for (const [channel, from] of background.entries()) {
        pixels[at + channel] = from + ((text[channel] ?? from) - from) * shade
      }
      pixels[at + 3] = 255
    }
  }
}
