import type { TrackTags } from '@/entities/source-file/api/cut-track.ts'
import { defaultTrackName } from '@/entities/split/lib/default-track-name.ts'

/*
The tags one track is written with. `name` is the name the user gave the track, null while it has
none. The title is that name exactly as typed, or the track's default name, the prefix and `NN`, so
the player shows the file's name (the bare number when the prefix is empty); the album is the source
stem. None of them is sanitised: tags may hold any character.
*/
export function trackTags(track: {
  number: number
  count: number
  name: string | null
  prefix: string
  sourceStem: string
}): TrackTags {
  return {
    title: track.name ?? defaultTrackName(track.prefix, track.number, track.count),
    track: `${track.number}/${track.count}`,
    album: track.sourceStem,
  }
}
