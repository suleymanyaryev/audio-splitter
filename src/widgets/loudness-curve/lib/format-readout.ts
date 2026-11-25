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

// The depth as a tooltip says it, with no trailing zero: "15 dB", "11.5 dB".
export function formatSettingDecibels(decibels: number): string {
  return `${Number(decibels.toFixed(1))} dB`
}

// The threshold's distance from the median in words: "18 dB under the median".
export function formatOffset(offsetDecibels: number): string {
  const tenths = roundToTenth(offsetDecibels)
  return `${Math.abs(tenths)} dB ${tenths < 0 ? 'over' : 'under'} the median`
}

/*
What Find duplicates found, for the line beside its button: "3 duplicates, 1 partial match", with
only the part there is something to say about ("1 duplicate", "2 partial matches"), or "No
duplicates found" when the search ran and found neither.
*/
export function formatDuplicateResult(duplicates: number, partialMatches: number): string {
  const parts = [
    ...(duplicates > 0 ? [`${duplicates} ${duplicates === 1 ? 'duplicate' : 'duplicates'}`] : []),
    ...(partialMatches > 0
      ? [`${partialMatches} partial ${partialMatches === 1 ? 'match' : 'matches'}`]
      : []),
  ]
  return parts.length === 0 ? 'No duplicates found' : parts.join(', ')
}
