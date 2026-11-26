import {
  bandDecibels,
  SPECTRUM_BOTTOM_HZ,
  type Spectrogram,
} from '@/shared/lib/audio/spectrum-builder.ts'

/*
The level in dB of the band holding `hz` in the column holding `seconds`, read from the
spectrogram itself and not from what a pixel shows, so a squeezed stretch still reports the one
moment under the pointer. The bands share the strip's log axis, so band b holds 50 × r^b to
50 × r^(b+1) Hz. Null before the file's start and past its last column.
*/
export function readSpectrogram(
  spectrogram: Spectrogram,
  columnSeconds: number,
  seconds: number,
  hz: number,
): number | null {
  const { bands, bandCount, topHz } = spectrogram
  const column = Math.floor(seconds / columnSeconds)
  if (column < 0 || column >= bands.length / bandCount) return null
  const share = Math.log(hz / SPECTRUM_BOTTOM_HZ) / Math.log(topHz / SPECTRUM_BOTTOM_HZ)
  const band = Math.min(bandCount - 1, Math.max(0, Math.floor(share * bandCount)))
  return bandDecibels(bands[column * bandCount + band] ?? 0)
}
