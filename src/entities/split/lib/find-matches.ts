import { slidingCorrelation } from '@/shared/lib/audio/sliding-correlation.ts'
import {
  COMPARED_FLOOR_DB,
  COMPARED_STEP_SECONDS,
  FULL_MATCH_TOLERANCE_SECONDS,
  MATCH_MINIMUM_R,
  MINIMUM_COMPARED_SECONDS,
} from '../config/match-thresholds.ts'
import { coarseCurve } from './coarse-curve.ts'

export interface MatchInput {
  // The loudness curve as the file's analysis made it, one dB value per window.
  curve: Float32Array
  windowSeconds: number
  silenceThreshold: number
  /*
  The tracks in time order, each from its start to its end in the file and whether the user left
  it out by hand.
  */
  tracks: { startSeconds: number; endSeconds: number; isLeftOutByHand: boolean }[]
  /*
  The pairs the user dismissed that still hold, as indices into `tracks` with the earlier track
  as `kept`: they give no match and join no recording.
  */
  dismissed: { duplicate: number; kept: number }[]
}

/*
A track that repeats an earlier one from end to end, and the earliest track of that recording.
Both are indices into `MatchInput.tracks`.
*/
export interface FoundMatch {
  duplicate: number
  kept: number
}

// Whether the shared stretch falls short of either stretch's ends by no more than `tolerance`.
function isFull(
  shorterLength: number,
  longerLength: number,
  offset: number,
  tolerance: number,
): boolean {
  const shorterMissesStart = Math.max(0, -offset)
  const shorterMissesEnd = Math.max(0, shorterLength + offset - longerLength)
  const longerMissesStart = Math.max(0, offset)
  const longerMissesEnd = Math.max(0, longerLength - offset - shorterLength)
  return (
    Math.max(shorterMissesStart, shorterMissesEnd, longerMissesStart, longerMissesEnd) <= tolerance
  )
}

interface Compared {
  minimumLength: number
  tolerance: number
}

// Whether two stretches are the same recording from end to end: a full match (see the header below).
function isFullMatch(first: Float32Array, second: Float32Array, compared: Compared): boolean {
  const [shorter, longer] = first.length < second.length ? [first, second] : [second, first]
  const best = slidingCorrelation(shorter, longer, compared.minimumLength)
  return (
    best !== null &&
    best.r >= MATCH_MINIMUM_R &&
    isFull(shorter.length, longer.length, best.offset, compared.tolerance)
  )
}

/*
The stretch of the curve each track is compared by: from its first window at or above the silence
threshold to its last, or null for a track whose stretch is under the minimum length.
*/
function stretchesOf(
  curve: Float32Array,
  tracks: MatchInput['tracks'],
  stepSeconds: number,
  silenceThreshold: number,
  minimumLength: number,
) {
  return tracks.map((track) => {
    let from = Math.round(track.startSeconds / stepSeconds)
    let to = Math.min(curve.length, Math.round(track.endSeconds / stepSeconds))
    while (from < to && (curve[from] ?? 0) < silenceThreshold) from++
    while (to > from && (curve[to - 1] ?? 0) < silenceThreshold) to--
    return to - from >= minimumLength ? curve.subarray(from, to) : null
  })
}

/*
Find duplicates (GLOSSARY.md: Match, Kept copy, Duplicate): compares every track of 30 s or more
with every earlier one, and returns a match for each track that is the same recording as an
earlier track from end to end. The method is in docs/concepts/11-finding-repeats.md:

- the curve is the 200 ms copy of the loudness curve, floored at −60 dB;
- each track's stretch of it leaves off the windows under the silence threshold at both ends;
- two stretches match when their best Pearson's r over a 30 s overlap is at least 0.95, and the
  match is full when the shared stretch covers both to within 2 s at each end;
- tracks joined through any chain of full matches are one recording, whose kept copy is the
  earliest track of it not left out by hand, and every later track of it is a duplicate naming that
  copy, a track left out by hand included. A recording with every track left out by hand has no
  kept copy and no match, and a track before the kept copy, left out by hand, names nothing: a
  match always names an earlier track;
- a dismissed pair is not compared, so it joins no recording, and it is never the match of a track:
  a dismissed duplicate is a track like any other.

A pure function, so the store and the worker share it. The matches come in track order.
*/
export function findMatches(input: MatchInput): FoundMatch[] {
  const { windowSeconds, silenceThreshold, tracks } = input
  const isDismissed = (duplicate: number, kept: number) =>
    input.dismissed.some((pair) => pair.duplicate === duplicate && pair.kept === kept)
  const factor = Math.max(1, Math.round(COMPARED_STEP_SECONDS / windowSeconds))
  const stepSeconds = factor * windowSeconds
  const curve = coarseCurve(input.curve, factor, COMPARED_FLOOR_DB)
  const compared = {
    minimumLength: Math.round(MINIMUM_COMPARED_SECONDS / stepSeconds),
    tolerance: Math.round(FULL_MATCH_TOLERANCE_SECONDS / stepSeconds),
  }
  const stretches = stretchesOf(
    curve,
    tracks,
    stepSeconds,
    silenceThreshold,
    compared.minimumLength,
  )

  // Union-find over the tracks, left out by hand or not: each full match joins two tracks into one
  // recording, and the earlier root wins, so a recording's root is its earliest track.
  const parent = tracks.map((_track, index) => index)
  function root(index: number): number {
    let current = index
    while (parent[current] !== current) current = parent[current] ?? current
    return current
  }

  for (const [later, stretch] of stretches.entries()) {
    for (const [earlier, other] of stretches.slice(0, later).entries()) {
      if (
        stretch === null ||
        other === null ||
        isDismissed(later, earlier) ||
        !isFullMatch(stretch, other, compared)
      )
        continue
      const earlierRoot = root(earlier)
      const laterRoot = root(later)
      parent[Math.max(earlierRoot, laterRoot)] = Math.min(earlierRoot, laterRoot)
    }
  }

  // The kept copy of each recording, by its root: its earliest track not left out by hand.
  const keptOf = new Map<number, number>()
  for (const [index, track] of tracks.entries()) {
    const recording = root(index)
    if (!track.isLeftOutByHand && !keptOf.has(recording)) keptOf.set(recording, index)
  }

  const found: FoundMatch[] = []
  for (const index of tracks.keys()) {
    const kept = keptOf.get(root(index))
    if (kept !== undefined && kept < index && !isDismissed(index, kept))
      found.push({ duplicate: index, kept })
  }
  return found
}
