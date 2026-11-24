import { slidingCorrelation } from '@/shared/lib/audio/sliding-correlation.ts'
import {
  COMPARED_FLOOR_DB,
  COMPARED_STEP_SECONDS,
  FULL_MATCH_TOLERANCE_SECONDS,
  MATCH_MINIMUM_R,
  MINIMUM_COMPARED_SECONDS,
} from '../config/match-thresholds.ts'
import { coarseCurve } from './coarse-curve.ts'
import { roundToTenth } from './round-to-tenth.ts'

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
  The pairs the user dismissed that still hold, as indices into `tracks`: they give no match and
  join no recording.
  */
  dismissed: { later: number; earlier: number }[]
}

// A stretch of a track, in seconds from the track's start, to the step of the compared curve.
export interface SharedStretch {
  from: number
  to: number
}

/*
A match between a track and an earlier one (GLOSSARY.md: Match), both as indices into
`MatchInput.tracks`. A `full` match is a duplicate: `earlier` is its kept copy. A partial match is
`holds` when `later` has more before the shared stretch than `earlier` has, or, when both start
together, goes on longer (it holds `earlier` from where the stretch starts in `later`), and `part-of`
when `later` is the stretch of `earlier` (from where the stretch starts in `earlier`). `laterShared` and
`earlierShared` are the stretch both tracks share, in each track.
*/
export interface FoundMatch {
  later: number
  earlier: number
  kind: 'full' | 'holds' | 'part-of'
  laterShared: SharedStretch
  earlierShared: SharedStretch
}

// A run of windows of a stretch: from its first window, to the one after its last.
interface Run {
  from: number
  to: number
}

/*
Where two stretches meet, by the offset of the shorter along the longer (`slidingCorrelation`), as
a run of each: `shorterRun` of the shorter and the same number of windows of the longer.
*/
function sharedRuns(shorterLength: number, longerLength: number, offset: number) {
  const from = Math.max(0, -offset)
  const to = Math.min(shorterLength, longerLength - offset)
  return {
    shorterRun: { from, to },
    longerRun: { from: from + offset, to: to + offset },
  }
}

// What a shared run is to the later track, from where it falls in each stretch (see `FoundMatch`).
function kindOf(
  laterRun: Run,
  laterLength: number,
  earlierRun: Run,
  earlierLength: number,
  tolerance: number,
): FoundMatch['kind'] {
  const laterTail = laterLength - laterRun.to
  const earlierTail = earlierLength - earlierRun.to
  const isFull = Math.max(laterRun.from, laterTail, earlierRun.from, earlierTail) <= tolerance
  if (isFull) return 'full'
  // The track the shared stretch starts inside has the extra before it: it is the one that holds.
  if (laterRun.from > tolerance) return 'holds'
  if (earlierRun.from > tolerance) return 'part-of'
  // Both start together, so the one that goes on longer holds the other.
  return laterTail >= earlierTail ? 'holds' : 'part-of'
}

interface Stretch {
  values: Float32Array
  // Windows from the track's start to the stretch's first window: the quiet lead left off.
  leadWindows: number
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
): (Stretch | null)[] {
  return tracks.map((track) => {
    const start = Math.round(track.startSeconds / stepSeconds)
    let from = start
    let to = Math.min(curve.length, Math.round(track.endSeconds / stepSeconds))
    while (from < to && (curve[from] ?? 0) < silenceThreshold) from++
    while (to > from && (curve[to - 1] ?? 0) < silenceThreshold) to--
    return to - from >= minimumLength
      ? { values: curve.subarray(from, to), leadWindows: from - start }
      : null
  })
}

// A run of a stretch as seconds from its track's start, to the step.
function sharedSeconds(stretch: Stretch, run: Run, stepSeconds: number): SharedStretch {
  return {
    from: roundToTenth((stretch.leadWindows + run.from) * stepSeconds),
    to: roundToTenth((stretch.leadWindows + run.to) * stepSeconds),
  }
}

// A stretch's own extent as seconds from its track's start: what a duplicate shares.
function wholeSeconds(stretch: Stretch, stepSeconds: number): SharedStretch {
  return sharedSeconds(stretch, { from: 0, to: stretch.values.length }, stepSeconds)
}

// A pair whose best alignment scored r of 0.95 or more, before it is told which match it makes.
interface Candidate {
  later: number
  earlier: number
  laterStretch: Stretch
  earlierStretch: Stretch
  kind: FoundMatch['kind']
  laterRun: Run
  earlierRun: Run
}

// The steps the comparison is made in, in windows of the compared curve.
interface Scale {
  stepSeconds: number
  // The shortest stretch compared, and the shortest overlap scored.
  minimumLength: number
  // How far a shared stretch may fall short of a track's ends and still be full.
  tolerance: number
}

/*
Scores one pair (the shorter stretch slid along the longer) and says which match it makes, or null
when it is no match: a stretch missing, the pair dismissed, or r under 0.95.
*/
function candidateOf(
  later: number,
  earlier: number,
  laterStretch: Stretch | null,
  earlierStretch: Stretch | null,
  scale: Scale,
): Candidate | null {
  if (laterStretch === null || earlierStretch === null) return null
  const isLaterShorter = laterStretch.values.length < earlierStretch.values.length
  const [shorter, longer] = isLaterShorter
    ? [laterStretch, earlierStretch]
    : [earlierStretch, laterStretch]
  const best = slidingCorrelation(shorter.values, longer.values, scale.minimumLength)
  if (best === null || best.r < MATCH_MINIMUM_R) return null
  const runs = sharedRuns(shorter.values.length, longer.values.length, best.offset)
  const laterRun = isLaterShorter ? runs.shorterRun : runs.longerRun
  const earlierRun = isLaterShorter ? runs.longerRun : runs.shorterRun
  const kind = kindOf(
    laterRun,
    laterStretch.values.length,
    earlierRun,
    earlierStretch.values.length,
    scale.tolerance,
  )
  return { later, earlier, laterStretch, earlierStretch, kind, laterRun, earlierRun }
}

// Every pair that scores as a match, full or not, found once: each pair is slid one along the other.
function candidatesOf(
  stretches: (Stretch | null)[],
  isDismissed: (later: number, earlier: number) => boolean,
  scale: Scale,
): Candidate[] {
  const candidates: Candidate[] = []
  for (const [later, stretch] of stretches.entries()) {
    for (const [earlier, other] of stretches.slice(0, later).entries()) {
      if (isDismissed(later, earlier)) continue
      const candidate = candidateOf(later, earlier, stretch, other, scale)
      if (candidate !== null) candidates.push(candidate)
    }
  }
  return candidates
}

/*
Union-find over the tracks, left out by hand or not: each full match joins two tracks into one
recording, and the earlier root wins, so a recording's root is its earliest track. Returns the
root of a track's recording.
*/
function recordingRoots(trackCount: number, candidates: Candidate[]): (index: number) => number {
  const parent = Array.from({ length: trackCount }, (_unused, index) => index)
  function root(index: number): number {
    let current = index
    while (parent[current] !== current) current = parent[current] ?? current
    return current
  }
  for (const { later, earlier, kind } of candidates) {
    if (kind !== 'full') continue
    const earlierRoot = root(earlier)
    const laterRoot = root(later)
    parent[Math.max(earlierRoot, laterRoot)] = Math.min(earlierRoot, laterRoot)
  }
  return root
}

// The kept copy of each recording, by its root: its earliest track not left out by hand.
function keptCopies(tracks: MatchInput['tracks'], root: (index: number) => number) {
  const keptOf = new Map<number, number>()
  for (const [index, track] of tracks.entries()) {
    const recording = root(index)
    if (!track.isLeftOutByHand && !keptOf.has(recording)) keptOf.set(recording, index)
  }
  return keptOf
}

/*
The duplicates, by track: a track after its recording's kept copy names it. A duplicate has its
full match and no other. What the two share is where the pair lined up when it was scored, so a
track cut a second late still maps to the right moment; a pair that was never scored (it was joined
to the kept copy through another track) shares the whole of both stretches.
*/
function duplicatesOf(
  stretches: (Stretch | null)[],
  candidates: Candidate[],
  root: (index: number) => number,
  keptOf: Map<number, number>,
  isDismissed: (later: number, earlier: number) => boolean,
  scale: Scale,
): Map<number, FoundMatch> {
  const duplicates = new Map<number, FoundMatch>()
  for (const [index, stretch] of stretches.entries()) {
    const kept = keptOf.get(root(index))
    if (kept === undefined || stretch === null || kept >= index || isDismissed(index, kept))
      continue
    const keptStretch = stretches[kept]
    if (keptStretch === null || keptStretch === undefined) continue
    const scored = candidates.find((pair) => pair.later === index && pair.earlier === kept)
    duplicates.set(index, {
      later: index,
      earlier: kept,
      kind: 'full',
      laterShared:
        scored === undefined
          ? wholeSeconds(stretch, scale.stepSeconds)
          : sharedSeconds(stretch, scored.laterRun, scale.stepSeconds),
      earlierShared:
        scored === undefined
          ? wholeSeconds(keptStretch, scale.stepSeconds)
          : sharedSeconds(keptStretch, scored.earlierRun, scale.stepSeconds),
    })
  }
  return duplicates
}

// The rest: a pair that shares part of its stretches, if neither track is a duplicate.
function partialMatchesOf(
  candidates: Candidate[],
  duplicates: Map<number, FoundMatch>,
  scale: Scale,
): Map<number, FoundMatch[]> {
  const partials = new Map<number, FoundMatch[]>()
  for (const candidate of candidates) {
    const { later, earlier, kind, laterRun, earlierRun } = candidate
    if (kind === 'full' || duplicates.has(later) || duplicates.has(earlier)) continue
    partials.set(later, [
      ...(partials.get(later) ?? []),
      {
        later,
        earlier,
        kind,
        laterShared: sharedSeconds(candidate.laterStretch, laterRun, scale.stepSeconds),
        earlierShared: sharedSeconds(candidate.earlierStretch, earlierRun, scale.stepSeconds),
      },
    ])
  }
  return partials
}

/*
Find duplicates (GLOSSARY.md: Match, Kept copy, Duplicate, Partial match): compares every track of
30 s or more with every earlier one, and returns a match for each track that is the same recording
as an earlier track from end to end, and for each pair that shares part of its stretches. The
method is in docs/concepts/11-finding-repeats.md:

- the curve is the 200 ms copy of the loudness curve, floored at −60 dB;
- each track's stretch of it leaves off the windows under the silence threshold at both ends;
- two stretches match when their best Pearson's r over a 30 s overlap is at least 0.95, and the
  match is full when the shared stretch covers both to within 2 s at each end, and partial
  otherwise;
- tracks joined through any chain of full matches are one recording, whose kept copy is the
  earliest track of it not left out by hand, and every later track of it is a duplicate naming that
  copy, a track left out by hand included. A recording with every track left out by hand has no
  kept copy and no match, and a track before the kept copy, left out by hand, names nothing: a
  match always names an earlier track;
- a partial match is made only between a track that is not a duplicate and an earlier track that
  is not a duplicate, so a duplicate shows only its full match and no match names a duplicate. A
  track can have several;
- a dismissed pair is not compared, so it joins no recording, and it is never the match of a track:
  a dismissed duplicate is a track like any other.

A pure function, so the store and the worker share it. The matches come in track order.
*/
export function findMatches(input: MatchInput): FoundMatch[] {
  const { windowSeconds, silenceThreshold, tracks } = input
  const isDismissed = (later: number, earlier: number) =>
    input.dismissed.some((pair) => pair.later === later && pair.earlier === earlier)
  const factor = Math.max(1, Math.round(COMPARED_STEP_SECONDS / windowSeconds))
  const stepSeconds = factor * windowSeconds
  const curve = coarseCurve(input.curve, factor, COMPARED_FLOOR_DB)
  const scale: Scale = {
    stepSeconds,
    minimumLength: Math.round(MINIMUM_COMPARED_SECONDS / stepSeconds),
    tolerance: Math.round(FULL_MATCH_TOLERANCE_SECONDS / stepSeconds),
  }
  const stretches = stretchesOf(curve, tracks, stepSeconds, silenceThreshold, scale.minimumLength)

  const candidates = candidatesOf(stretches, isDismissed, scale)
  const root = recordingRoots(tracks.length, candidates)
  const keptOf = keptCopies(tracks, root)
  const duplicates = duplicatesOf(stretches, candidates, root, keptOf, isDismissed, scale)
  const partials = partialMatchesOf(candidates, duplicates, scale)

  // In track order, a track's own matches by the earlier track.
  return tracks.flatMap((_track, index) => {
    const duplicate = duplicates.get(index)
    return duplicate === undefined ? (partials.get(index) ?? []) : [duplicate]
  })
}
