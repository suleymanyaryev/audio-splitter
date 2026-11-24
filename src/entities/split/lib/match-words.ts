import { formatTenths } from '@/shared/lib/time/format-tenths.ts'
import type { SharedStretch } from './find-matches.ts'
import { padTrackNumber } from './pad-track-number.ts'

/*
A live match of a track with an earlier one, as the track list, the strip and the Track view show
it (GLOSSARY.md: Match). `kind` is `duplicate` when the track is the same recording as the other from end to end,
`holds` when it holds the other's shared stretch, and `part-of` when it is a stretch of the other.
`number` and `ownName` are the other track's live place in the file and the name the user gave it
(null while unnamed), and `startSplitId` is the split where it starts (null for the first track),
which `dismissMatch` names it by. `here` and `there` are the stretch both share, in seconds from
the start of this track and of the other.
*/
export interface TrackMatch {
  kind: 'duplicate' | 'holds' | 'part-of'
  number: number
  ownName: string | null
  startSplitId: number | null
  here: SharedStretch
  there: SharedStretch
}

/*
What a match's row and block say, with the other track's number as it is now, padded as the track
list pads its numbers, so it points at the right track after a split is added elsewhere, and its
own name when it has one:

- `duplicate of 01`, or `duplicate of 01 Opening`;
- `03 from 1:40`: this track holds 03, from 1:40 on, the time in this track;
- `part of 03 from 0:30`: this track is the stretch of 03 from 0:30 on, the time in the other.

Times are to the 0.2 s the search compares at.
*/
export function matchWords(match: TrackMatch, trackCount: number): string {
  const other = padTrackNumber(match.number, trackCount)
  const name = match.ownName === null ? other : `${other} ${match.ownName}`
  if (match.kind === 'duplicate') return `duplicate of ${name}`
  return match.kind === 'holds'
    ? `${name} from ${formatTenths(match.here.from)}`
    : `part of ${name} from ${formatTenths(match.there.from)}`
}

// A stretch as the tooltip says it: "1:40 to 3:10".
function stretchWords(shared: SharedStretch) {
  return `${formatTenths(shared.from)} to ${formatTenths(shared.to)}`
}

// What a partial match's tooltip says: the stretch both tracks share, in each of them.
export function matchTooltip(match: TrackMatch, trackCount: number): string {
  const other = padTrackNumber(match.number, trackCount)
  return `Shared: ${stretchWords(match.here)} here, ${stretchWords(match.there)} in track ${other}`
}
