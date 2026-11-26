/*
The readout under the pointer: "1.0 kHz · −32 dB", or "250 Hz · −60 dB" under 1 kHz. The level is
to the dB, since a band is stored to about 0.4 dB, with a real minus sign (U+2212) as in
DESIGN.md.
*/
export function formatSpectrogramReadout(hz: number, decibels: number): string {
  const frequency = hz >= 999.5 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`
  const level = Math.round(decibels)
  return `${frequency} · ${level < 0 ? '−' : ''}${Math.abs(level)} dB`
}
