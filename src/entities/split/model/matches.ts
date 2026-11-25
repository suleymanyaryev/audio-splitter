import { computed, ref, shallowRef, type Ref } from 'vue'

import { findMatchesInWorker } from '../api/find-matches-client.ts'
import { MINIMUM_COMPARED_SECONDS } from '../config/match-thresholds.ts'
import type { FoundMatch, SharedStretch } from '../lib/find-matches.ts'

// One track as the split store has it now: the split it starts at (none for the first), its ends.
export interface TrackEnds {
  startSplitId: number | null
  startSeconds: number
  endSeconds: number
  isLeftOutByHand: boolean
}

// What a search compares: the loudness curve, its window length and the silence threshold.
export interface SearchInput {
  curve: Float32Array
  windowSeconds: number
  silenceThreshold: number
}

// A match that holds now, by the indices of its two tracks (GLOSSARY.md: Match).
export interface LiveMatch {
  later: number
  earlier: number
  kind: FoundMatch['kind']
  laterShared: SharedStretch
  earlierShared: SharedStretch
}

// A track as a match recorded it: where it starts and ends, so a match can tell it has changed.
interface MatchedTrack {
  startSplitId: number | null
  startSeconds: number
  endSeconds: number
}

// A match of the last press: a track, an earlier one, and what they share.
interface StoredMatch extends Omit<LiveMatch, 'later' | 'earlier'> {
  later: MatchedTrack
  earlier: MatchedTrack
}

function matchedOf({ startSplitId, startSeconds, endSeconds }: TrackEnds): MatchedTrack {
  return { startSplitId, startSeconds, endSeconds }
}

function isSameTrack(first: MatchedTrack, second: MatchedTrack) {
  return (
    first.startSplitId === second.startSplitId &&
    first.startSeconds === second.startSeconds &&
    first.endSeconds === second.endSeconds
  )
}

// Whether two matches are of the same two tracks, with the ends they had.
function isSamePair(first: StoredMatch, second: StoredMatch) {
  return isSameTrack(first.later, second.later) && isSameTrack(first.earlier, second.earlier)
}

/*
The matches of "Find duplicates" (GLOSSARY.md: Match, Kept copy), which the split store calls once
and keeps private. It is fed the tracks' ends and what a search compares, or none while no file is
open, and it answers by track index.

A match is the answer as it was: it records both tracks' ends, and it holds while both tracks keep
them, so an edit ends it by changing a track and nothing has to find and remove it. A dismissal
records the pair the same way: it lasts as long as the match would, counts as one edit meanwhile,
and the next press leaves the pair out. Every press takes a number, and the answer of an older press,
or one after `drop`, is dropped; `drop` also stops the running search's worker.
*/
export function useMatches(trackEnds: Ref<TrackEnds[]>, searchInput: () => SearchInput | null) {
  const matches = shallowRef<StoredMatch[]>([])
  const dismissed = shallowRef<StoredMatch[]>([])
  const status = ref<'idle' | 'running' | 'failed'>('idle')
  const failure = ref<string | null>(null)
  // False until the first answer, so the result says nothing before.
  const hasSearched = ref(false)
  let searchNumber = 0
  let searchAbort: AbortController | null = null

  // The index of the track a match recorded, while it keeps the ends it had, else undefined.
  const indexOfMatched = computed(() => {
    const ends = trackEnds.value
    const indexByStart = new Map(ends.map((track, index) => [track.startSplitId, index]))
    return (matched: MatchedTrack) => {
      const index = indexByStart.get(matched.startSplitId)
      const track = index === undefined ? undefined : ends[index]
      return track?.startSeconds === matched.startSeconds && track.endSeconds === matched.endSeconds
        ? index
        : undefined
    }
  })

  // The indices of a pair's two tracks while both keep the ends it recorded, else null.
  function liveIndices(pair: StoredMatch) {
    const later = indexOfMatched.value(pair.later)
    const earlier = indexOfMatched.value(pair.earlier)
    return later === undefined || earlier === undefined ? null : { later, earlier }
  }

  function isDismissed(match: StoredMatch) {
    return dismissed.value.some((pair) => isSamePair(pair, match))
  }

  // The dismissed pairs that still hold, as the indices of their two tracks.
  const liveDismissals = computed(() => dismissed.value.flatMap((pair) => liveIndices(pair) ?? []))

  // The matches of the last press that hold and are not dismissed, in the order found.
  const liveMatches = computed(() => {
    const live: LiveMatch[] = []
    for (const match of matches.value) {
      const indices = liveIndices(match)
      if (indices !== null && !isDismissed(match)) live.push({ ...match, ...indices })
    }
    return live
  })

  // Two tracks of 30 s or more, a file open and no search running; after a failure, again.
  const canFind = computed(
    () =>
      searchInput() !== null &&
      status.value !== 'running' &&
      trackEnds.value.filter(
        (track) => track.endSeconds - track.startSeconds >= MINIMUM_COMPARED_SECONDS,
      ).length >= 2,
  )

  // The counts of the live matches, none before the first answer.
  const result = computed(() =>
    hasSearched.value
      ? {
          duplicates: liveMatches.value.filter((match) => match.kind === 'full').length,
          partialMatches: liveMatches.value.filter((match) => match.kind !== 'full').length,
        }
      : null,
  )

  /*
  Compares the tracks as they are now in a worker, and keeps the answer as the matches of this
  press, replacing the last one. A failed search keeps what the last press found and says why.
  */
  async function search() {
    const input = searchInput()
    if (input === null || !canFind.value) return
    const press = ++searchNumber
    const pressed = trackEnds.value
    const abort = new AbortController()
    searchAbort = abort
    status.value = 'running'
    failure.value = null
    let found
    try {
      found = await findMatchesInWorker(
        {
          ...input,
          tracks: pressed.map(({ startSeconds, endSeconds, isLeftOutByHand }) => ({
            startSeconds,
            endSeconds,
            isLeftOutByHand,
          })),
          dismissed: liveDismissals.value.map(({ later, earlier }) => ({ later, earlier })),
        },
        abort.signal,
      )
    } catch (error) {
      if (press !== searchNumber) return
      status.value = 'failed'
      failure.value = error instanceof Error ? error.message : String(error)
      return
    }
    if (press !== searchNumber) return
    const kept: StoredMatch[] = []
    for (const match of found) {
      const later = pressed[match.later]
      const earlier = pressed[match.earlier]
      if (later !== undefined && earlier !== undefined)
        kept.push({ ...match, later: matchedOf(later), earlier: matchedOf(earlier) })
    }
    matches.value = kept
    hasSearched.value = true
    status.value = 'idle'
  }

  /*
  Dismisses the live match of the track starting at `laterStartSplitId` with the earlier track
  starting at `earlierStartSplitId`. A pair that is no live match, or is dismissed already, is
  refused, so a stale caller dismisses nothing.
  */
  function dismiss(laterStartSplitId: number | null, earlierStartSplitId: number | null) {
    const stored = matches.value.find(
      (candidate) =>
        candidate.later.startSplitId === laterStartSplitId &&
        candidate.earlier.startSplitId === earlierStartSplitId,
    )
    if (stored === undefined || liveIndices(stored) === null || isDismissed(stored)) return
    dismissed.value = [...dismissed.value, stored]
  }

  // Forgets every match and dismissal and stops a running search: its answer is for a gone file.
  function drop() {
    searchNumber++
    searchAbort?.abort()
    searchAbort = null
    matches.value = []
    dismissed.value = []
    hasSearched.value = false
    status.value = 'idle'
    failure.value = null
  }

  return {
    liveMatches,
    liveDismissalCount: computed(() => liveDismissals.value.length),
    status: computed(() => status.value),
    failure: computed(() => failure.value),
    result,
    canFind,
    search,
    dismiss,
    drop,
  }
}
