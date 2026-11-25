import { beforeEach, describe, it, expect, vi } from 'vitest'
import { ref, shallowRef } from 'vue'

import { useMatches, type SearchInput, type TrackEnds } from '../matches.ts'
import { answerHeld, client, resetClient } from './fake-find-matches-client.ts'
import {
  A,
  B,
  C,
  FOREIGN,
  GAP_WINDOWS,
  LONG,
  QUIET,
  WINDOWS_PER_SECOND,
  playlist,
  recording,
} from './made-up-recordings.ts'

vi.mock('../../api/find-matches-client.ts', () => import('./fake-find-matches-client.ts'))

// Under every made-up recording (−30 dB and up), over the quiet between them.
const SILENCE_THRESHOLD = -40

// The first 30 s of a recording and the rest: what a split placed late divides.
const FIRST_30 = (windows: number[]) => windows.slice(0, 30 * WINDOWS_PER_SECOND)
const FROM_30 = (windows: number[]) => windows.slice(30 * WINDOWS_PER_SECOND)

/*
The tracks of a playlist as Find splits leaves them: a split in the middle of each gap, the splits
numbered 0, 1, 2… from the second track on.
*/
function endsOf(recordings: number[][]): TrackEnds[] {
  let startSeconds = 0
  let windows = 0
  return recordings.map((own, index) => {
    windows += own.length
    const isLast = index === recordings.length - 1
    const endSeconds = (isLast ? windows : windows + GAP_WINDOWS / 2) / WINDOWS_PER_SECOND
    windows += GAP_WINDOWS
    const track = {
      startSplitId: index === 0 ? null : index - 1,
      startSeconds,
      endSeconds,
      isLeftOutByHand: false,
    }
    startSeconds = endSeconds
    return track
  })
}

function inputOf(curve: Float32Array, silenceThreshold = SILENCE_THRESHOLD): SearchInput {
  return { curve, windowSeconds: 1 / WINDOWS_PER_SECOND, silenceThreshold }
}

// The module fed the tracks of a playlist, with the plain refs a spec edits.
function matchesOf(...recordings: number[][]) {
  return matchesFor(endsOf(recordings), inputOf(playlist(...recordings)))
}

function matchesFor(ends: TrackEnds[], searchInput: SearchInput | null) {
  const trackEnds = ref(ends)
  const input = shallowRef(searchInput)
  return { trackEnds, input, ...useMatches(trackEnds, () => input.value) }
}

type Matches = ReturnType<typeof matchesFor>

// Where each track repeats: the index of the track it is a duplicate of, or null.
const duplicatesOf = ({ trackEnds, liveMatches }: Matches) =>
  trackEnds.value.map(
    (_track, index) =>
      liveMatches.value.find((match) => match.later === index && match.kind === 'full')?.earlier ??
      null,
  )

// The live partial matches, as a caller reads them.
const partialsOf = ({ liveMatches }: Matches) =>
  liveMatches.value
    .filter((match) => match.kind !== 'full')
    .map(({ later, earlier, kind, laterShared, earlierShared }) => ({
      later,
      earlier,
      kind,
      laterShared,
      earlierShared,
    }))

// A, B, A, B, A and the press: 2 and 4 name 0, 3 names 1.
async function pressedFive() {
  const matches = matchesOf(A(), B(), A(), B(), A())
  await matches.search()
  expect(duplicatesOf(matches)).toEqual([null, null, 0, 1, 0])
  return matches
}

// Changes track `index` (0-based) in the track ends, and no other.
function editTrack({ trackEnds }: Matches, index: number, change: Partial<TrackEnds>) {
  trackEnds.value = trackEnds.value.map((track, at) =>
    at === index ? { ...track, ...change } : track,
  )
}

// Splits track `index` (0-based) in two, 20 s into it, at a new split.
function splitTrack({ trackEnds }: Matches, index: number) {
  const track = trackEnds.value[index]!
  const at = track.startSeconds + 20
  trackEnds.value = [
    ...trackEnds.value.slice(0, index),
    { ...track, endSeconds: at },
    { startSplitId: 99, startSeconds: at, endSeconds: track.endSeconds, isLeftOutByHand: false },
    ...trackEnds.value.slice(index + 1),
  ]
}

// Merges track `index` (0-based) with the next one, as deleting the split between them does.
function mergeWithNext({ trackEnds }: Matches, index: number) {
  const track = trackEnds.value[index]!
  const next = trackEnds.value[index + 1]!
  trackEnds.value = [
    ...trackEnds.value.slice(0, index),
    { ...track, endSeconds: next.endSeconds },
    ...trackEnds.value.slice(index + 2),
  ]
}

// Dismisses the match of track `later` with track `earlier` (0-based), by their start splits.
function dismissPair(matches: Matches, later: number, earlier: number) {
  const ends = matches.trackEnds.value
  matches.dismiss(ends[later]?.startSplitId ?? null, ends[earlier]?.startSplitId ?? null)
}

// Every live match as [later, earlier, kind].
const pairsOf = ({ liveMatches }: Matches) =>
  liveMatches.value.map(({ later, earlier, kind }) => [later, earlier, kind])

// Track 3 holds A and B with other music between them, and the press.
async function pressedHolder() {
  const matches = matchesOf(A(), B(), C(), [...A(), ...FOREIGN(), ...B()])
  await matches.search()
  expect(pairsOf(matches)).toEqual([
    [3, 0, 'holds'],
    [3, 1, 'holds'],
  ])
  return matches
}

// Where `C` from track `index` at `offset` s into it lands: [the other track, the offset in it].
function landing({ swapTarget }: Matches, index: number, offset: number) {
  const target = swapTarget(index, offset)
  return target === null ? null : [target.other, Math.round(target.seconds * 10) / 10]
}

// Moves the split between the second and third tracks a second on: the end of one, the start of the other.
function moveThirdStart({ trackEnds }: Matches) {
  const [first, second, third, ...rest] = trackEnds.value
  trackEnds.value = [
    first!,
    { ...second!, endSeconds: second!.endSeconds + 1 },
    { ...third!, startSeconds: third!.startSeconds + 1 },
    ...rest,
  ]
}

describe('useMatches', () => {
  beforeEach(() => {
    resetClient()
  })

  it('finds a second pass played in another order', async () => {
    const matches = matchesOf(A(), B(), C(), C(), A(), B())

    await matches.search()

    expect(duplicatesOf(matches)).toEqual([null, null, null, 2, 0, 1])
  })

  it('names the earliest copy on every copy, not the one before it', async () => {
    const matches = matchesOf(A(), B(), A(), C(), A(), B())

    await matches.search()

    expect(duplicatesOf(matches)).toEqual([null, null, 0, null, 0, 1])
  })

  it('leaves different recordings alone', async () => {
    const matches = matchesOf(A(), B(), C(), recording(4, 45), recording(5, 55))

    await matches.search()

    expect(matches.liveMatches.value).toEqual([])
  })

  describe('what counts as the same recording', () => {
    it('matches a copy a little different, and not one far from it', async () => {
      // A few dB of difference on every window still has the shape; plenty has none.
      const matches = matchesOf(A(), B(), recording(1, 40, 0, 2), recording(2, 50, 0, 25))

      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, 0, null])
    })

    it('matches a copy cut a second late, and not one cut five seconds late', async () => {
      // A full match covers both tracks to within 2 s at each end.
      const matches = matchesOf(
        A(),
        B(),
        A().slice(1 * WINDOWS_PER_SECOND),
        B().slice(5 * WINDOWS_PER_SECOND),
      )

      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, 0, null])
    })

    it('leaves out of the search a track under 30 s, so a copy of it is not found', async () => {
      const matches = matchesOf(A(), recording(7, 25), B(), recording(7, 25))

      await matches.search()

      expect(matches.liveMatches.value).toEqual([])
    })

    it('leaves the quiet ends of every track off, which different tracks share', async () => {
      // 60 s of quiet at both ends of 31 s of music: with the ends in, two different recordings
      // share most of their shape, a step up and a step down, and score above 0.95.
      const quiet = Array.from({ length: 60 * WINDOWS_PER_SECOND }, () => QUIET)
      const curve = Float32Array.from([
        ...quiet,
        ...recording(1, 31),
        ...quiet,
        ...quiet,
        ...recording(2, 31),
        ...quiet,
        ...quiet,
        ...recording(3, 31),
        ...quiet,
      ])
      const matches = matchesFor(
        [
          { startSplitId: null, startSeconds: 0, endSeconds: 151, isLeftOutByHand: false },
          { startSplitId: 0, startSeconds: 151, endSeconds: 302, isLeftOutByHand: false },
          { startSplitId: 1, startSeconds: 302, endSeconds: 453, isLeftOutByHand: false },
        ],
        inputOf(curve, -38),
      )

      await matches.search()

      expect(matches.liveMatches.value).toEqual([])
    })
  })

  describe('partial matches', () => {
    it('shows both pieces of a track that holds two earlier tracks, where each lies', async () => {
      // A and B played with no split between them in the second pass, 40 s in.
      const matches = matchesOf(A(), B(), C(), [...A(), ...B()])

      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, null, null])
      expect(partialsOf(matches)).toEqual([
        {
          later: 3,
          earlier: 0,
          kind: 'holds',
          laterShared: { from: 2, to: 42 },
          earlierShared: { from: 0, to: 40 },
        },
        {
          later: 3,
          earlier: 1,
          kind: 'holds',
          laterShared: { from: 42, to: 92 },
          earlierShared: { from: 2, to: 52 },
        },
      ])
      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 2 })
    })

    it('says both sides of a split placed late', async () => {
      // 30 s of the second recording sit at the end of the first one's track, and the rest of it
      // is a track of its own.
      const matches = matchesOf(A(), LONG(), C(), [...A(), ...FIRST_30(LONG())], FROM_30(LONG()))

      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, null, null, null])
      expect(partialsOf(matches)).toEqual([
        {
          later: 3,
          earlier: 0,
          kind: 'holds',
          laterShared: { from: 2, to: 42 },
          earlierShared: { from: 0, to: 40 },
        },
        {
          later: 3,
          earlier: 1,
          kind: 'holds',
          laterShared: { from: 42, to: 72 },
          earlierShared: { from: 2, to: 32 },
        },
        {
          later: 4,
          earlier: 1,
          kind: 'part-of',
          laterShared: { from: 2, to: 52 },
          earlierShared: { from: 32, to: 82 },
        },
      ])
      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 3 })
    })

    it('gives no partial match to a duplicate, and none that names one', async () => {
      // 1 repeats 0, and the last track holds A and B: it holds 0 and 2, never 1.
      const matches = matchesOf(A(), A(), B(), [...A(), ...B()])

      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, 0, null, null])
      expect(pairsOf(matches)).toEqual([
        [1, 0, 'full'],
        [3, 0, 'holds'],
        [3, 2, 'holds'],
      ])
    })

    it('gives a duplicate its full match only, though it also holds a stretch of an earlier track', async () => {
      // 2 repeats 0 end to end, and 1 is 0 and a second recording: 2 is part of nothing.
      const matches = matchesOf(A(), [...A(), ...B()], A())

      await matches.search()

      expect(pairsOf(matches)).toEqual([
        [1, 0, 'holds'],
        [2, 0, 'full'],
      ])
    })

    it('finds no partial match on a second pass of the same tracks', async () => {
      const matches = matchesOf(A(), B(), C(), A(), B(), C())

      await matches.search()

      expect(partialsOf(matches)).toEqual([])
      expect(matches.result.value).toEqual({ duplicates: 3, partialMatches: 0 })
    })

    it('needs 30 s of shared stretch', async () => {
      // The second track holds only 25 s of the first.
      const matches = matchesOf(A(), [
        ...recording(9, 40),
        ...A().slice(0, 25 * WINDOWS_PER_SECOND),
      ])

      await matches.search()

      expect(matches.liveMatches.value).toEqual([])
    })

    it('says part of a track that is a stretch of an earlier one, from where it starts in it', async () => {
      const matches = matchesOf(LONG(), FROM_30(LONG()), C())

      await matches.search()

      expect(partialsOf(matches)).toEqual([
        {
          later: 1,
          earlier: 0,
          kind: 'part-of',
          laterShared: { from: 2, to: 52 },
          earlierShared: { from: 30, to: 80 },
        },
      ])
    })
  })

  describe('the result', () => {
    it('counts the duplicates, and says nothing before the first press', async () => {
      const matches = matchesOf(A(), B(), A(), B(), C())
      expect(matches.result.value).toBeNull()

      await matches.search()

      expect(matches.result.value).toEqual({ duplicates: 2, partialMatches: 0 })
    })

    it('says none were found when the search ran and found none', async () => {
      const matches = matchesOf(A(), B(), C())

      await matches.search()

      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('counts again after a second press, with the same answer', async () => {
      const matches = matchesOf(A(), B(), A())

      await matches.search()
      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, 0])
      expect(matches.result.value).toEqual({ duplicates: 1, partialMatches: 0 })
    })
  })

  describe('whether it can be pressed', () => {
    it('needs two tracks of 30 s or more', async () => {
      const oneLong = matchesOf(A(), recording(7, 25))
      expect(oneLong.canFind.value).toBe(false)
      await oneLong.search()
      expect(oneLong.result.value).toBeNull()

      expect(matchesOf(A(), recording(7, 25), B()).canFind.value).toBe(true)
    })

    it('is off with no file', () => {
      const matches = matchesFor(endsOf([A(), B()]), null)

      expect(matches.canFind.value).toBe(false)
    })

    it('is off while a search runs, and on again after its answer', async () => {
      const matches = matchesOf(A(), B(), A())
      client.isHolding = true

      const search = matches.search()

      expect(matches.status.value).toBe('running')
      expect(matches.canFind.value).toBe(false)
      answerHeld()
      await search
      expect(matches.status.value).toBe('idle')
      expect(matches.canFind.value).toBe(true)
    })
  })

  describe('a search that fails', () => {
    it("says why, keeps the last press's matches and can be pressed again", async () => {
      const matches = matchesOf(A(), B(), A())
      await matches.search()
      client.failure = 'Out of memory'

      await matches.search()

      expect(matches.status.value).toBe('failed')
      expect(matches.failure.value).toBe('Out of memory')
      expect(duplicatesOf(matches)).toEqual([null, null, 0])
      expect(matches.canFind.value).toBe(true)
    })

    it('forgets the failure on the next press', async () => {
      const matches = matchesOf(A(), B(), A())
      client.failure = 'Out of memory'
      await matches.search()
      client.failure = null

      await matches.search()

      expect(matches.status.value).toBe('idle')
      expect(matches.failure.value).toBeNull()
      expect(matches.result.value).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('forgets the failure when dropped', async () => {
      const matches = matchesOf(A(), B(), A())
      client.failure = 'Out of memory'
      await matches.search()

      matches.drop()

      expect(matches.status.value).toBe('idle')
      expect(matches.failure.value).toBeNull()
    })
  })

  describe('an answer that is not wanted any more', () => {
    it('stops the worker when dropped', async () => {
      const matches = matchesOf(A(), B(), A())
      client.isHolding = true

      const search = matches.search()
      expect(client.signal?.aborted).toBe(false)
      matches.drop()

      expect(client.signal?.aborted).toBe(true)
      answerHeld()
      await search
    })

    it('is dropped, and no failure, when the stopped worker rejects', async () => {
      const matches = matchesOf(A(), B(), A())
      client.isHolding = true
      client.failure = 'The search was stopped'

      const search = matches.search()
      matches.drop()
      answerHeld()
      await search

      expect(matches.status.value).toBe('idle')
      expect(matches.failure.value).toBeNull()
    })

    it('is dropped when the matches were dropped meanwhile', async () => {
      const matches = matchesOf(A(), B(), A())
      client.isHolding = true

      const search = matches.search()
      matches.drop()
      answerHeld()
      await search

      expect(matches.liveMatches.value).toEqual([])
      expect(matches.result.value).toBeNull()
      expect(matches.status.value).toBe('idle')
    })
  })

  describe('a search that an edit overtakes', () => {
    it('leaves dead the matches of a track whose start moved meanwhile', async () => {
      const matches = matchesOf(A(), B(), A(), B(), A())
      client.isHolding = true
      const search = matches.search()
      moveThirdStart(matches)

      answerHeld()
      await search

      // 2 and 1 changed, so the matches of 2 and 3 are dead on arrival; 4 keeps its own.
      expect(duplicatesOf(matches)).toEqual([null, null, null, null, 0])
      expect(matches.result.value).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('leaves dead the matches of a track split in two meanwhile', async () => {
      const matches = matchesOf(A(), B(), A())
      client.isHolding = true
      const search = matches.search()
      // A split 4 s into the copy, which runs from 96 s to 136 s.
      const [first, second, copy] = matches.trackEnds.value
      matches.trackEnds.value = [
        first!,
        second!,
        { ...copy!, endSeconds: 100 },
        { startSplitId: 99, startSeconds: 100, endSeconds: 136, isLeftOutByHand: false },
      ]

      answerHeld()
      await search

      expect(matches.liveMatches.value).toEqual([])
      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('drops the answer of an older press when a newer one has gone out', async () => {
      const matches = matchesOf(A(), B(), A())
      client.isHolding = true
      const first = matches.search()
      matches.drop()
      // The same track ends over other music: the newer press finds no copy.
      matches.input.value = inputOf(playlist(A(), B(), recording(4, 40)))
      const second = matches.search()

      // The older answer arrives last: it must not replace the newer one.
      client.held.reverse()
      answerHeld()
      await Promise.all([first, second])

      expect(matches.liveMatches.value).toEqual([])
      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 0 })
    })
  })

  describe('a second press', () => {
    it('replaces every match with a fresh result', async () => {
      const matches = matchesOf(A(), B(), A(), B())
      await matches.search()
      expect(duplicatesOf(matches)).toEqual([null, null, 0, 1])
      // 2 and 3 stop being matches by an edit: 1 and 2 changed.
      moveThirdStart(matches)
      expect(duplicatesOf(matches)).toEqual([null, null, null, null])

      await matches.search()

      // The moved start is a second off now: 2 is within the 2 s of the ends, so it is back.
      expect(duplicatesOf(matches)).toEqual([null, null, 0, 1])
      expect(matches.result.value).toEqual({ duplicates: 2, partialMatches: 0 })
    })
  })

  describe('how long a match lasts', () => {
    it('holds while the track ends do not change', async () => {
      const matches = await pressedFive()

      // The same ends, as a fresh list, and another track left out by hand.
      matches.trackEnds.value = matches.trackEnds.value.map((track) => ({ ...track }))
      editTrack(matches, 1, { isLeftOutByHand: true })

      expect(duplicatesOf(matches)).toEqual([null, null, 0, 1, 0])
      expect(matches.result.value).toEqual({ duplicates: 3, partialMatches: 0 })
    })

    it("ends when a track's start moves", async () => {
      const matches = await pressedFive()

      editTrack(matches, 2, { startSeconds: matches.trackEnds.value[2]!.startSeconds + 1 })

      expect(duplicatesOf(matches)).toEqual([null, null, null, 1, 0])
      expect(matches.result.value).toEqual({ duplicates: 2, partialMatches: 0 })
    })

    it("ends when a track's end moves", async () => {
      const matches = await pressedFive()

      editTrack(matches, 3, { endSeconds: matches.trackEnds.value[3]!.endSeconds - 1 })

      expect(duplicatesOf(matches)).toEqual([null, null, 0, null, 0])
    })

    it('ends both partial matches of a track whose start moves', async () => {
      const matches = matchesOf(A(), B(), C(), [...A(), ...B()])
      await matches.search()
      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 2 })

      editTrack(matches, 3, { startSeconds: matches.trackEnds.value[3]!.startSeconds - 1 })

      expect(matches.liveMatches.value).toEqual([])
      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('ends the matches that name a track whose end moves', async () => {
      const matches = await pressedFive()

      // 0 is the kept copy of 2 and 4.
      editTrack(matches, 0, { endSeconds: matches.trackEnds.value[0]!.endSeconds - 1 })

      expect(duplicatesOf(matches)).toEqual([null, null, null, 1, null])
    })

    it('ends when a new end appears inside a track, and holds the others at their new places', async () => {
      const matches = await pressedFive()

      splitTrack(matches, 2)

      // 2 is two tracks now, neither a copy of 0; 3 and 4 hold their matches as 4 and 5.
      expect(duplicatesOf(matches)).toEqual([null, null, null, null, 1, 0])
    })

    it('ends the matches that name a track split in two', async () => {
      const matches = await pressedFive()

      splitTrack(matches, 0)

      // 2 and 4 named 0, and are not copies of a half; 3 names 1, now 2.
      expect(duplicatesOf(matches)).toEqual([null, null, null, null, 2, null])
      expect(matches.result.value).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('ends the matches of a track merged with the next, and those naming either', async () => {
      const later = await pressedFive()
      const earlier = await pressedFive()

      // 3 and 4 become one track: 3 ends later, and 4 is gone.
      mergeWithNext(later, 3)
      // 0 and 1 become one track: every match named one of them.
      mergeWithNext(earlier, 0)

      expect(duplicatesOf(later)).toEqual([null, null, 0, null])
      expect(duplicatesOf(earlier)).toEqual([null, null, null, null])
      expect(earlier.result.value).toEqual({ duplicates: 0, partialMatches: 0 })
    })
  })

  describe('a dismissal', () => {
    it('leaves the match out, and counts, while both tracks keep their ends', async () => {
      const matches = await pressedFive()

      dismissPair(matches, 2, 0)

      expect(duplicatesOf(matches)).toEqual([null, null, null, 1, 0])
      expect(matches.result.value).toEqual({ duplicates: 2, partialMatches: 0 })
      expect(matches.liveDismissalCount.value).toBe(1)
      matches.trackEnds.value = matches.trackEnds.value.map((track) => ({ ...track }))
      expect(matches.liveDismissalCount.value).toBe(1)

      editTrack(matches, 2, { startSeconds: matches.trackEnds.value[2]!.startSeconds + 1 })

      expect(matches.liveDismissalCount.value).toBe(0)
    })

    it('counts two dismissals as two', async () => {
      const matches = await pressedFive()

      dismissPair(matches, 2, 0)
      dismissPair(matches, 3, 1)

      expect(matches.liveDismissalCount.value).toBe(2)
    })

    it('dismisses one piece of a track that holds two', async () => {
      const matches = matchesOf(A(), B(), C(), [...A(), ...B()])
      await matches.search()

      dismissPair(matches, 3, 0)

      expect(pairsOf(matches)).toEqual([[3, 1, 'holds']])
      expect(matches.result.value).toEqual({ duplicates: 0, partialMatches: 1 })
      expect(matches.liveDismissalCount.value).toBe(1)
    })

    it('refuses a pair that is no live match, or one dismissed already', async () => {
      const matches = await pressedFive()
      dismissPair(matches, 2, 0)

      // The wrong way round, a pair that does not repeat, a gone track, and the same pair again.
      dismissPair(matches, 1, 3)
      dismissPair(matches, 1, 0)
      matches.dismiss(42, null)
      dismissPair(matches, 2, 0)
      // A match whose track has changed since.
      editTrack(matches, 4, { endSeconds: matches.trackEnds.value[4]!.endSeconds - 1 })
      dismissPair(matches, 4, 0)

      expect(matches.liveDismissalCount.value).toBe(1)
      expect(duplicatesOf(matches)).toEqual([null, null, null, 1, null])
    })

    it('leaves a live dismissed pair out of a second press', async () => {
      const matches = await pressedFive()
      dismissPair(matches, 2, 0)

      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, null, 1, 0])
      expect(matches.result.value).toEqual({ duplicates: 2, partialMatches: 0 })
      expect(matches.liveDismissalCount.value).toBe(1)
    })

    it('leaves a dismissed piece out of a second press, and finds the other piece again', async () => {
      const matches = matchesOf(A(), B(), C(), [...A(), ...B()])
      await matches.search()
      dismissPair(matches, 3, 0)

      await matches.search()

      expect(pairsOf(matches)).toEqual([[3, 1, 'holds']])
    })

    it('finds the pair again on a second press once a track of the pair has changed', async () => {
      const matches = await pressedFive()
      dismissPair(matches, 2, 0)
      editTrack(matches, 2, { startSeconds: matches.trackEnds.value[2]!.startSeconds + 1 })

      await matches.search()

      // The start is a second off: 2 is within the 2 s of its ends, so it is a copy of 0 again.
      expect(duplicatesOf(matches)).toEqual([null, null, 0, 1, 0])
      expect(matches.liveDismissalCount.value).toBe(0)
    })

    it('does not let a dismissed pair join its recording through a third copy', async () => {
      const matches = matchesOf(A(), B(), A(), A())
      await matches.search()
      expect(duplicatesOf(matches)).toEqual([null, null, 0, 0])

      dismissPair(matches, 2, 0)
      await matches.search()

      // 2 is not a copy of 0 any more, though 3 repeats both; 3 still names 0.
      expect(duplicatesOf(matches)).toEqual([null, null, null, 0])
    })

    it('keeps a dismissed last copy out of a second press', async () => {
      const matches = await pressedFive()
      dismissPair(matches, 4, 0)

      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, 0, 1, null])
    })

    it('lets a track hold a dismissed duplicate, which is a track like any other', async () => {
      const matches = matchesOf(A(), B(), A(), [...A(), ...B()])
      await matches.search()
      expect(pairsOf(matches)).toEqual([
        [2, 0, 'full'],
        [3, 0, 'holds'],
        [3, 1, 'holds'],
      ])

      dismissPair(matches, 2, 0)
      await matches.search()

      expect(pairsOf(matches)).toEqual([
        [3, 0, 'holds'],
        [3, 1, 'holds'],
        [3, 2, 'holds'],
      ])
    })
  })

  describe('the kept copy', () => {
    it('stays the one chosen at the last press when it is left out by hand after', async () => {
      const matches = matchesOf(A(), B(), A(), A())
      await matches.search()
      expect(duplicatesOf(matches)).toEqual([null, null, 0, 0])

      editTrack(matches, 0, { isLeftOutByHand: true })

      expect(duplicatesOf(matches)).toEqual([null, null, 0, 0])

      // The next press picks it again from the tracks as they are: 2 is the earliest copy not left out.
      await matches.search()

      expect(duplicatesOf(matches)).toEqual([null, null, null, 2])
    })
  })

  describe('the swap target', () => {
    it('is the same moment of the match whose shared stretch holds the offset', async () => {
      const matches = await pressedHolder()

      // 10 s into track 3 is 8 s into A, which starts at 2 s in track 3 and 0 s in track 0.
      expect(landing(matches, 3, 10)).toEqual([0, 8])
      // B starts at 72 s in track 3 and at 2 s in track 1, after its quiet lead.
      expect(landing(matches, 3, 80)).toEqual([1, 10])
    })

    it('is the start of the nearest shared stretch outside every one', async () => {
      const matches = await pressedHolder()

      // 0:45 is just after A's stretch (to 0:42) and far from B's (from 1:12).
      expect(landing(matches, 3, 45)).toEqual([0, 0])
      // 1:05 is nearer B's stretch than A's.
      expect(landing(matches, 3, 65)).toEqual([1, 2])
    })

    it('is none on a track with no match and no way back', async () => {
      const matches = await pressedHolder()

      expect(landing(matches, 2, 10)).toBeNull()
    })

    it('is none before any search', () => {
      const matches = matchesOf(A(), B(), A())

      expect(landing(matches, 2, 10)).toBeNull()
    })

    it('takes a duplicate to its kept copy at the same moment', async () => {
      const matches = matchesOf(A(), B(), A())
      await matches.search()

      // The copy starts after a 2 s quiet lead that the first track does not have.
      expect(landing(matches, 2, 10)).toEqual([0, 8])
    })

    it('takes a duplicate cut a second short to the moment it lined up at, not the start of the stretch', async () => {
      // The copy lacks the first second of the music, within the 2 s a full match may fall short by.
      const matches = matchesOf(A(), B(), A().slice(WINDOWS_PER_SECOND))
      await matches.search()

      // 10 s into the copy is 8 s into its music (after the 2 s lead), which is 9 s into the first.
      expect(landing(matches, 2, 10)).toEqual([0, 9])
    })
  })

  describe('the way back', () => {
    it('takes the track a swap went to back to where it came from, at the same moment', async () => {
      const matches = await pressedHolder()

      matches.rememberSwap(3, 0)

      expect(landing(matches, 0, 8)).toEqual([3, 10])
    })

    it('is none for a track reached without a swap, or after another swap', async () => {
      const matches = await pressedHolder()
      expect(landing(matches, 0, 8)).toBeNull()

      matches.rememberSwap(3, 0)
      matches.rememberSwap(3, 1)

      // The last swap went from 3 to 1, so 0 has nowhere to go back to.
      expect(landing(matches, 0, 8)).toBeNull()
      expect(landing(matches, 1, 10)).toEqual([3, 80])
    })

    it('is lost when the match dies, and not got back when the ends return', async () => {
      const matches = await pressedHolder()
      matches.rememberSwap(3, 0)
      const start = matches.trackEnds.value[3]!.startSeconds

      editTrack(matches, 3, { startSeconds: start - 1 })
      expect(landing(matches, 0, 8)).toBeNull()

      editTrack(matches, 3, { startSeconds: start })
      expect(pairsOf(matches)).toEqual([
        [3, 0, 'holds'],
        [3, 1, 'holds'],
      ])
      expect(landing(matches, 0, 8)).toBeNull()
    })

    it('is lost on drop, so a fresh search does not bring it back', async () => {
      const matches = await pressedHolder()
      matches.rememberSwap(3, 0)

      matches.drop()
      await matches.search()

      expect(landing(matches, 3, 10)).toEqual([0, 8])
      expect(landing(matches, 0, 8)).toBeNull()
    })

    it('goes back from a dismissed match to nothing', async () => {
      const matches = await pressedHolder()
      matches.rememberSwap(3, 0)

      dismissPair(matches, 3, 0)

      expect(landing(matches, 0, 8)).toBeNull()
    })
  })
})
