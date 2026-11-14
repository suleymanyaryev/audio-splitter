// A real minus sign (U+2212), as in DESIGN.md's "−35 dB", never a hyphen.
export function formatDecibels(decibels: number): string {
  const tenths = Math.round(decibels * 10) / 10
  const sign = tenths < 0 ? '−' : ''
  return `${sign}${Math.abs(tenths).toFixed(1)} dB`
}

export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)} s`
}
