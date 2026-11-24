import { roundToTenth } from '@/entities/split/lib/round-to-tenth.ts'

// A real minus sign (U+2212), as in DESIGN.md's "−35 dB", never a hyphen.
export function formatDecibels(decibels: number): string {
  const tenths = roundToTenth(decibels)
  const sign = tenths < 0 ? '−' : ''
  return `${sign}${Math.abs(tenths).toFixed(1)} dB`
}

export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)} s`
}

// The setting as a tooltip says it, with no trailing zero: "2 s", "2.5 s".
export function formatSettingSeconds(seconds: number): string {
  return `${Number(seconds.toFixed(1))} s`
}

// The threshold's distance from the median in words: "18 dB under the median".
export function formatOffset(offsetDecibels: number): string {
  const tenths = roundToTenth(offsetDecibels)
  return `${Math.abs(tenths)} dB ${tenths < 0 ? 'over' : 'under'} the median`
}

/*
What Find duplicates found, for the line beside its button: "1 duplicate", "23 duplicates", or "No
duplicates found" when the search ran and found none.
*/
export function formatDuplicateResult(duplicates: number): string {
  if (duplicates === 0) return 'No duplicates found'
  return `${duplicates} ${duplicates === 1 ? 'duplicate' : 'duplicates'}`
}
