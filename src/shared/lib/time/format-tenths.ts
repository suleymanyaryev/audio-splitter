/*
Seconds as `m:ss`, rounded to the nearest tenth, with the tenth written only when it is not zero:
0:30, 1:40, 1:40.2. From one hour on the hour is added, `1:02:05.4`. It is how Find duplicates says
where in a track a shared stretch starts, which it knows to 0.2 s.
*/
export function formatTenths(seconds: number): string {
  const tenths = Math.round(seconds * 10)
  const whole = Math.floor(tenths / 10)
  const fraction = tenths % 10 === 0 ? '' : `.${tenths % 10}`
  const hours = Math.floor(whole / 3600)
  const secs = String(whole % 60).padStart(2, '0')
  if (hours === 0) return `${Math.floor(whole / 60)}:${secs}${fraction}`
  const minutes = String(Math.floor((whole % 3600) / 60)).padStart(2, '0')
  return `${hours}:${minutes}:${secs}${fraction}`
}
