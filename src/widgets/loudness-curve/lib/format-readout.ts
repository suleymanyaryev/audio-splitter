// A real minus sign (U+2212), as in DESIGN.md's "−35 dB", never a hyphen.
export function formatDecibels(decibels: number): string {
  const tenths = Math.round(decibels * 10) / 10
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
export function formatOffset(offsetDatabase: number): string {
  const tenths = Math.round(offsetDatabase * 10) / 10
  return `${Math.abs(tenths)} dB ${tenths < 0 ? 'over' : 'under'} the median`
}
