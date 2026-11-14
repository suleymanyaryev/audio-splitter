/*
Seconds as `h:mm:ss.cc`, rounded to the nearest hundredth, the hour always shown like
`formatDuration`: 0:00:30.00, 0:42:03.25. Rounding happens before the fields are split, so
59.996 s carries into 0:01:00.00 and never reads 0:00:60.00.
*/
export function formatHundredths(seconds: number): string {
  const total = Math.round(seconds * 100)
  const hundredths = String(total % 100).padStart(2, '0')
  const wholeSeconds = Math.floor(total / 100)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = String(Math.floor((wholeSeconds % 3600) / 60)).padStart(2, '0')
  const secs = String(wholeSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${secs}.${hundredths}`
}
