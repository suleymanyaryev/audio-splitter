import type { TrackTags } from '@/entities/source-file/api/cut-track.ts'

/*
The tags a range is written with: the name exactly as typed for the title, the source stem for the
album, and no track, as the range is none of the file's tracks. Not sanitised: tags may hold any
character.
*/
export function rangeTags(range: { name: string; sourceStem: string }): TrackTags {
  return { title: range.name, track: null, album: range.sourceStem }
}
