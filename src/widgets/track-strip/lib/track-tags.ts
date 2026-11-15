import type { TrackTags } from '@/entities/source-file/api/cut-track.ts'
import { padTrackNumber } from './pad-track-number.ts'

/*
The tags one track is written with. `name` is the name the user gave the track, null while it has
none. The title is that name exactly as typed, or `<source stem> NN` so a track heard in shuffle
still says where it came from; the album is the stem. None of them is sanitised: tags may hold any
character.
*/
export function trackTags(track: {
  number: number
  count: number
  name: string | null
  sourceStem: string
}): TrackTags {
  return {
    title: track.name ?? `${track.sourceStem} ${padTrackNumber(track.number, track.count)}`,
    track: `${track.number}/${track.count}`,
    album: track.sourceStem,
  }
}
