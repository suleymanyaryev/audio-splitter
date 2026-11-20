// The level as the slider reads it: whole dB, with a real minus sign (U+2212) as DESIGN.md has it.
export function formatVolume(decibels: number): string {
  return `${decibels < 0 ? '−' : ''}${Math.abs(decibels)} dB`
}
