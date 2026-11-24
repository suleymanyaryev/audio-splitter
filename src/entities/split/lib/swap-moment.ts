import type { SharedStretch } from './find-matches.ts'

/*
A match as `C` sees it from one of its two tracks (GLOSSARY.md: Match): the index of the other
track, and the stretch both share, in seconds from the start of this track (`here`) and of the
other (`there`).
*/
export interface SwapLink {
  other: number
  here: SharedStretch
  there: SharedStretch
}

// How far a time is from a stretch: 0 inside it.
function distanceTo(stretch: SharedStretch, time: number) {
  return Math.max(stretch.from - time, time - stretch.to, 0)
}

/*
Where `C` lands from `time`, in seconds from this track's start: the link whose stretch holds the
time, else the nearest one by distance (the first on a tie), and the moment in its other track, in
seconds from that track's start. Inside the stretch it is the same moment there; outside, the start
of the stretch there. Null with no link.
*/
export function swapMoment(links: SwapLink[], time: number) {
  let nearest: SwapLink | undefined
  for (const link of links)
    if (nearest === undefined || distanceTo(link.here, time) < distanceTo(nearest.here, time))
      nearest = link
  if (nearest === undefined) return null
  const isInside = distanceTo(nearest.here, time) === 0
  return {
    other: nearest.other,
    seconds: nearest.there.from + (isInside ? time - nearest.here.from : 0),
  }
}
