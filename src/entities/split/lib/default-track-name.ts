import { padTrackNumber } from './pad-track-number.ts'

/*
The name of a track that has none of its own (GLOSSARY.md: Track name): the track name prefix and
the padded number, with nothing between them. The list, the single export's offer and the title tag
all show it; the file name builds the same text, but cuts the prefix first when it is too long.
*/
export function defaultTrackName(prefix: string, number: number, count: number): string {
  return `${prefix}${padTrackNumber(number, count)}`
}
