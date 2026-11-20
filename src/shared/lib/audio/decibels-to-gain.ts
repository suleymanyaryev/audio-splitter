/*
The gain, a number every sample is multiplied by, that a level in decibels stands for
(docs/concepts/09-volume-is-gain.md): 0 dB is 1, every -6.02 dB halves it, -20 dB is a tenth. The
other direction, from a signal to dB, is in `loudness-builder.ts`.
*/
export function decibelsToGain(decibels: number): number {
  return 10 ** (decibels / 20)
}
