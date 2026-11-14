// Whole seconds as `h:mm:ss`, the hour always shown so every time in the app reads alike:
// 0:00:30, 0:42:03, 1:01:26.
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const secs = String(total % 60).padStart(2, '0')
  return `${hours}:${minutes}:${secs}`
}
