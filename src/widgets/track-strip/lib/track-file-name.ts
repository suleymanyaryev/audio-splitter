import { padTrackNumber } from '@/entities/split/lib/pad-track-number.ts'
import { MAX_FILE_NAME_LENGTH, sanitiseFileName } from './sanitise-file-name.ts'

/*
An unnamed track is `<prefix><NN>.<ext>`, the name its list row shows, made safe as one string so a
separator at the prefix's end is not trimmed off. Past the 100-character cap it is the prefix that
is cut, never the number, so two tracks never get the same name. A renamed track is still
`<NN> <name>.<ext>` (`name` is what the user typed, null while unnamed); a name that is empty after
sanitising counts as none, and then the file is the plain number.
*/
export function trackFileName(track: {
  number: number
  count: number
  name: string | null
  prefix: string
  extension: string
}): string {
  const number = padTrackNumber(track.number, track.count)
  const extension = track.extension.toLowerCase()
  if (track.name === null) {
    // By code point, as `sanitiseFileName` counts, so a character outside the basic plane stays whole.
    const room = Math.max(0, MAX_FILE_NAME_LENGTH - number.length)
    const prefix = [...track.prefix].slice(0, room).join('')
    const stem = sanitiseFileName(prefix + number)
    return `${stem}.${extension}`
  }
  const name = sanitiseFileName(track.name)
  return name === '' ? `${number}.${extension}` : `${number} ${name}.${extension}`
}
