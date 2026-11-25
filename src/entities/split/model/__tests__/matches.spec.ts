import { beforeEach, describe, it, expect, vi } from 'vitest'
import { ref, shallowRef } from 'vue'

import { useMatches, type SearchInput, type TrackEnds } from '../matches.ts'
import { answerHeld, client, resetClient } from './fake-find-matches-client.ts'
import {
  A,
  B,
  C,
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
      expect(
        matches.liveMatches.value.map(({ later, earlier, kind }) => [later, earlier, kind]),
      ).toEqual([
        [1, 0, 'full'],
        [3, 0, 'holds'],
        [3, 2, 'holds'],
      ])
    })

    it('gives a duplicate its full match only, though it also holds a stretch of an earlier track', async () => {
      // 2 repeats 0 end to end, and 1 is 0 and a second recording: 2 is part of nothing.
      const matches = matchesOf(A(), [...A(), ...B()], A())

      await matches.search()

      expect(
        matches.liveMatches.value.map(({ later, earlier, kind }) => [later, earlier, kind]),
      ).toEqual([
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
})
