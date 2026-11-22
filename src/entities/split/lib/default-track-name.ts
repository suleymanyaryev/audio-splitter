import { MAX_TRACK_NAME_LENGTH } from '../config/track-name.ts'
import { padTrackNumber } from './pad-track-number.ts'

/*
The name of a track that has none of its own (GLOSSARY.md: Track name): the track name prefix and
the padded number, with nothing between them. The list, the single export's offer and the title tag
all show it. Past a track name's length it is the prefix that is cut, never the number, so the
rename field (`maxlength`) can always hold the name it shows; the file name builds the same text.
*/
export function defaultTrackName(prefix: string, number: number, count: number): string {
  const padded = padTrackNumber(number, count)
  return `${prefix.slice(0, MAX_TRACK_NAME_LENGTH - padded.length)}${padded}`
}
