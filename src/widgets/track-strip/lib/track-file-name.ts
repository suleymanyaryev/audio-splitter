import { padTrackNumber } from './pad-track-number.ts'
import { sanitiseFileName } from './sanitise-file-name.ts'

/*
`<NN>.<ext>` for an unnamed track and `<NN> <name>.<ext>` for a renamed one. `name` is the name
the user gave the track, null while it has none; a name that is empty after sanitising counts as
none. The number keeps the files in order and keeps two tracks of the same name apart.
*/
export function trackFileName(track: {
  number: number
  count: number
  name: string | null
  extension: string
}): string {
  const number = padTrackNumber(track.number, track.count)
  const name = track.name === null ? '' : sanitiseFileName(track.name)
  const extension = track.extension.toLowerCase()
  return name === '' ? `${number}.${extension}` : `${number} ${name}.${extension}`
}
