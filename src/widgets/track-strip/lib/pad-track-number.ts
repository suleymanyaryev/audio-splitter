// Two digits at least, and as many as the track count has: 01 to 08, 001 to 120.
export function padTrackNumber(number: number, count: number): string {
  return String(number).padStart(Math.max(2, String(count).length), '0')
}
