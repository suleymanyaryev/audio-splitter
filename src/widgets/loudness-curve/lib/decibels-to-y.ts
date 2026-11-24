import { THRESHOLD_MIN_DB } from '@/entities/split/config/defaults.ts'

// The curve spans 0 dB at the top edge to this level at the bottom (the threshold slider's range);
// the −100 dB floor and anything else quieter sit on the bottom edge.
const BOTTOM_DECIBELS = THRESHOLD_MIN_DB

// Linear in dB, in canvas pixels measured down from the top.
export function decibelsToY(decibels: number, height: number): number {
  const fraction = Math.min(1, Math.max(0, decibels / BOTTOM_DECIBELS))
  return fraction * height
}

// The inverse, clamped to the drawn range: a pointer above or below the canvas means 0 or −60 dB.
export function yToDecibels(y: number, height: number): number {
  if (height <= 0) return 0
  const fraction = Math.min(1, Math.max(0, y / height))
  // 0 minus, not times a negative: a pointer on the top edge is 0 dB, not −0.
  return 0 - fraction * -BOTTOM_DECIBELS
}
