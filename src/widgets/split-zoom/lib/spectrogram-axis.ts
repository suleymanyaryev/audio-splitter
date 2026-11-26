import { SPECTRUM_BOTTOM_HZ } from '@/shared/lib/audio/spectrum-builder.ts'

/*
The spectrogram strip's frequency axis: logarithmic, from 50 Hz at the bottom to `topHz` (half
the sample rate) at the top, so each octave gets the same height, as pitch is heard. The 128
bands are spaced the same way, so band b fills the b-th 128th of the height up from the bottom.
Returns the y of `hz` from the strip's top, in the strip's own pixels.
*/
export function frequencyToY(hz: number, topHz: number, height: number): number {
  const fraction = Math.log(hz / SPECTRUM_BOTTOM_HZ) / Math.log(topHz / SPECTRUM_BOTTOM_HZ)
  return height * (1 - fraction)
}

// The inverse of `frequencyToY`: the frequency at `y` from the strip's top.
export function yToFrequency(y: number, topHz: number, height: number): number {
  return SPECTRUM_BOTTOM_HZ * (topHz / SPECTRUM_BOTTOM_HZ) ** (1 - y / height)
}
