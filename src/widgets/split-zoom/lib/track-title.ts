import { matchWords } from '@/entities/split/lib/match-words.ts'
import type { Track } from '@/entities/split/model/split.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'

/*
The Track view panel's title, in the zoom title's place: the track's name and where it starts and
ends, with hundredths, like `4 · 0:03:00.93 – 0:04:50.02`. An unnamed track is titled by its place
in the file, so leaving a track out never renumbers what the user is reviewing. The words of the
track's matches follow, one after another, so the user sees what is being compared while listening:
`4 · 0:03:00.93 – 0:04:50.02 · 01 from 0:02, part of 02 from 0:12.4`. `trackCount` pads the numbers
in them as the list does.
*/
export function trackTitle(track: Track, trackCount: number): string {
  const end = track.startSeconds + track.lengthSeconds
  const title = `${track.placeName} · ${formatHundredths(track.startSeconds)} – ${formatHundredths(end)}`
  return track.matches.length === 0
    ? title
    : `${title} · ${track.matches.map((match) => matchWords(match, trackCount)).join(', ')}`
}
