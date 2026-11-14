// The curve spans 0 dB at the top edge to this level at the bottom; the −100 dB floor and
// anything else quieter sit on the bottom edge.
const BOTTOM_DECIBELS = -60

// Linear in dB, in canvas pixels measured down from the top.
export function decibelsToY(decibels: number, height: number): number {
  const fraction = Math.min(1, Math.max(0, decibels / BOTTOM_DECIBELS))
  return fraction * height
}
