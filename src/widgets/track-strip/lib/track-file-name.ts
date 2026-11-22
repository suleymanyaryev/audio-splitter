import { padTrackNumber } from '@/entities/split/lib/pad-track-number.ts'
import { MAX_FILE_NAME_LENGTH, sanitiseFileName } from './sanitise-file-name.ts'

/*
A renamed track is `<name>.<ext>`: the name as typed, made safe, and nothing else (`name` is null
while the track is unnamed). An unnamed track, or a renamed one whose name is empty once made safe
(`...`), is `<prefix><NN>.<ext>`, the name its list row shows, made safe as one string so a
separator at the prefix's end is not trimmed off. Past the 100-character cap it is the prefix that
is cut, never the number, so two unnamed tracks never get the same name. Two tracks can still end
up with the same name, so the caller makes the name free (`freeFileName`).
*/
export function trackFileName(track: {
  number: number
  count: number
  name: string | null
  prefix: string
  extension: string
}): string {
  const extension = track.extension.toLowerCase()
  const typed = track.name === null ? '' : sanitiseFileName(track.name)
  if (typed !== '') return `${typed}.${extension}`
  const number = padTrackNumber(track.number, track.count)
  // By code point, as `sanitiseFileName` counts, so a character outside the basic plane stays whole.
  const room = Math.max(0, MAX_FILE_NAME_LENGTH - number.length)
  const prefix = [...track.prefix].slice(0, room).join('')
  const stem = sanitiseFileName(prefix + number)
  return `${stem}.${extension}`
}
