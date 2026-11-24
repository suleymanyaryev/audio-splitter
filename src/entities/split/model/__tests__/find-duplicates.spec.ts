import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { matchWords } from '../../lib/match-words.ts'
import { useSplitStore } from '../split.ts'

/*
The worker client is the one thing replaced: the fake answers with the real finding function, in
this process. `held` keeps the answers back until a spec lets them go, so a press can be overtaken.
*/
const client = vi.hoisted(() => ({ isHolding: false, held: [] as (() => void)[] }))
vi.mock('../../api/find-matches-client.ts', async () => {
  const { findMatches } = await import('../../lib/find-matches.ts')
  return {
    findMatchesInWorker: (request: Parameters<typeof findMatches>[0]) =>
      new Promise((resolve) => {
        // As a real worker gets it: a structured copy, which refuses what cannot be cloned.
        const copy = structuredClone(request)
        const answer = () => {
          resolve(findMatches(copy))
        }
        if (client.isHolding) client.held.push(answer)
        else answer()
      }),
  }
})

const QUIET = -50
// 4 s of quiet between recordings: a gap that Find gaps splits in the middle.
const GAP_WINDOWS = 80
const WINDOWS_PER_SECOND = 20

// A made-up number between 0 and 1 from a seed and an index, the same on every run.
function unit(seed: number, index: number) {
  const x = Math.sin(seed * 127.1 + index * 311.7) * 43_758.5453
  return x - Math.floor(x)
}

/*
A made-up recording: its level moves every second, between −30 and −10 dB, in a shape that only
its seed gives. `gain` is added to every window, as a louder copy has it, and `noise` moves each
window by up to that many dB either way, as a different master would.
*/
function recording(seed: number, seconds: number, gain = 0, noise = 0) {
  return Array.from({ length: seconds * WINDOWS_PER_SECOND }, (_, window) => {
    const level = -30 + 20 * unit(seed, Math.floor(window / WINDOWS_PER_SECOND))
    return level + gain + (unit(seed + 1000, window) - 0.5) * 2 * noise
  })
}

// The recordings one after another, a gap between each two.
function playlist(...recordings: number[][]) {
  return Float32Array.from(
    recordings.flatMap((windows, index) =>
      index === 0 ? windows : [...Array.from({ length: GAP_WINDOWS }, () => QUIET), ...windows],
    ),
  )
}

function openPlaylist(...recordings: number[][]) {
  const curve = playlist(...recordings)
  const store = useSplitStore()
  store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
  store.addGapSplits()
  expect(store.tracks).toHaveLength(recordings.length)
  return store
}

// The track's match that makes it a duplicate, or undefined.
const duplicateOf = (track: { matches: { kind: string; number: number }[] }) =>
  track.matches.find((match) => match.kind === 'duplicate')

// What each track's partial matches say, as the track list words them.
const partialsOf = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) =>
    track.matches
      .filter((match) => match.kind !== 'duplicate')
      .map((match) => matchWords(match, store.tracks.length)),
  )

// A recording of 80 s, and the first 30 s of one and the rest: what a split placed late divides.
const LONG = () => recording(2, 80)
const FIRST_30 = (windows: number[]) => windows.slice(0, 30 * WINDOWS_PER_SECOND)
const FROM_30 = (windows: number[]) => windows.slice(30 * WINDOWS_PER_SECOND)

// Where each track repeats: the number of the track it is a duplicate of, or null.
const duplicatesOf = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => duplicateOf(track)?.number ?? null)

// Leaves track `number` (1-based) out by hand, as the eye button does.
function leaveOut(store: ReturnType<typeof useSplitStore>, number: number) {
  store.toggleLeftOut(store.tracks[number - 1]?.startSplit?.id ?? null)
}

// Three recordings, A to C, each 40 s or more.
const A = () => recording(1, 40)
const B = () => recording(2, 50)
const C = () => recording(3, 60)

// Where track `number` (1-based) starts and ends, as the splits at its ends hold them.
const startOf = (store: ReturnType<typeof useSplitStore>, number: number) =>
  store.tracks[number - 1]?.startSplit
const endOf = (store: ReturnType<typeof useSplitStore>, number: number) =>
  store.tracks[number]?.startSplit

// A, B, A, B, A and the press: 03 and 05 name 01, 04 names 02.
async function pressedFiveTracks() {
  const store = openPlaylist(A(), B(), A(), B(), A())
  await store.findDuplicates()
  expect(duplicatesOf(store)).toEqual([null, null, 1, 2, 1])
  return store
}

// A, with a 3 s dip (-45 dB) at 20 s that a threshold of -48 dB does not call a gap.
const A_WITH_DIP = () =>
  A().map((level, window) => (window >= 20 * 20 && window < 23 * 20 ? -45 : level))

// The track's match with the kept copy, as the track list's button names it.
function dismiss(store: ReturnType<typeof useSplitStore>, number: number) {
  const track = store.tracks[number - 1]
  const kept = store.tracks[((track && duplicateOf(track))?.number ?? 0) - 1]
  store.dismissMatch(track?.startSplit?.id ?? null, kept?.startSplit?.id ?? null)
}

describe('Find duplicates', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    client.isHolding = false
    client.held = []
  })

  it('makes a duplicate of each track of a second pass, whatever its loudness', async () => {
    const store = openPlaylist(A(), B(), C(), recording(1, 40, 6), recording(2, 50, -9), C())

    await store.findDuplicates()

    expect(duplicatesOf(store)).toEqual([null, null, null, 1, 2, 3])
    expect(store.tracks.map((track) => track.inclusion)).toEqual([
      'included',
      'included',
      'included',
      'duplicate',
      'duplicate',
      'duplicate',
    ])
  })

  it('finds a second pass played in another order', async () => {
    const store = openPlaylist(A(), B(), C(), C(), A(), B())

    await store.findDuplicates()

    expect(duplicatesOf(store)).toEqual([null, null, null, 3, 1, 2])
  })

  it('names the earliest copy on every copy, not the one before it', async () => {
    const store = openPlaylist(A(), B(), A(), C(), A(), B())

    await store.findDuplicates()

    expect(duplicatesOf(store)).toEqual([null, null, 1, null, 1, 2])
  })

  it('leaves different recordings alone', async () => {
    const store = openPlaylist(A(), B(), C(), recording(4, 45), recording(5, 55))

    await store.findDuplicates()

    expect(duplicatesOf(store)).toEqual([null, null, null, null, null])
    expect(store.tracks.every((track) => !track.isLeftOut)).toBe(true)
  })

  describe('what counts as the same recording', () => {
    it('matches a copy a little different, and not one far from it', async () => {
      // A few dB of difference on every window still has the shape; plenty has none.
      const store = openPlaylist(A(), B(), recording(1, 40, 0, 2), recording(2, 50, 0, 25))

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, 1, null])
    })

    it('matches a copy cut a second late, and not one cut five seconds late', async () => {
      // A full match covers both tracks to within 2 s at each end.
      const store = openPlaylist(
        A(),
        B(),
        A().slice(1 * WINDOWS_PER_SECOND),
        B().slice(5 * WINDOWS_PER_SECOND),
      )

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, 1, null])
    })

    it('leaves out of the search a track under 30 s, so a copy of it is not found', async () => {
      const store = openPlaylist(A(), recording(7, 25), B(), recording(7, 25))

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null, null])
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
      const store = useSplitStore()
      store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
      store.setSilenceThreshold(-38)
      store.addGapSplits()
      expect(store.tracks.map((track) => track.lengthSeconds)).toEqual([151, 151, 151])

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null])
    })
  })

  describe('partial matches', () => {
    it('shows both pieces of a track that holds two earlier tracks, where each starts', async () => {
      // A and B played with no split between them in the second pass, 40 s in.
      const store = openPlaylist(A(), B(), C(), [...A(), ...B()])

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null, null])
      expect(partialsOf(store)).toEqual([[], [], [], ['01 from 0:02', '02 from 0:42']])
      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 2 })
    })

    it('says where in each track the shared stretch lies, for the tooltip', async () => {
      const store = openPlaylist(A(), B(), C(), [...A(), ...B()])

      await store.findDuplicates()

      expect(store.tracks[3]?.matches).toMatchObject([
        { kind: 'holds', number: 1, here: { from: 2, to: 42 }, there: { from: 0, to: 40 } },
        { kind: 'holds', number: 2, here: { from: 42, to: 92 }, there: { from: 2, to: 52 } },
      ])
    })

    it('says both sides of a split placed late', async () => {
      // 30 s of the second recording sit at the end of the first one's track, and the rest of it
      // is a track of its own.
      const store = openPlaylist(A(), LONG(), C(), [...A(), ...FIRST_30(LONG())], FROM_30(LONG()))

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null, null, null])
      expect(partialsOf(store)).toEqual([
        [],
        [],
        [],
        ['01 from 0:02', '02 from 0:42'],
        ['part of 02 from 0:32'],
      ])
      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 3 })
    })

    it('gives no partial match to a duplicate, and none that names one', async () => {
      // 02 repeats 01, and the last track holds A and B: it holds 01 and 03, never 02.
      const store = openPlaylist(A(), A(), B(), [...A(), ...B()])

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, 1, null, null])
      expect(partialsOf(store)).toEqual([[], [], [], ['01 from 0:02', '03 from 0:42']])
      expect(store.tracks[1]?.matches.map((match) => match.kind)).toEqual(['duplicate'])
    })

    it('gives a duplicate its full match only, though it also holds a stretch of an earlier track', async () => {
      // 03 repeats 01 end to end, and 02 is 01 and a second recording: 03 is part of nothing.
      const store = openPlaylist(A(), [...A(), ...B()], A())

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, 1])
      expect(partialsOf(store)).toEqual([[], ['01 from 0:02'], []])
    })

    it('leaves a track with no partial match alone, in the export too', async () => {
      const store = openPlaylist(A(), B(), C(), [...A(), ...B()])

      await store.findDuplicates()

      expect(store.tracks.map((track) => track.inclusion)).toEqual([
        'included',
        'included',
        'included',
        'included',
      ])
      expect(store.tracks.map((track) => track.exportNumber)).toEqual([1, 2, 3, 4])
      expect(store.exportTrackCount).toBe(4)
    })

    it('finds no partial match on a second pass of the same tracks', async () => {
      const store = openPlaylist(A(), B(), C(), A(), B(), C())

      await store.findDuplicates()

      expect(partialsOf(store)).toEqual([[], [], [], [], [], []])
      expect(store.duplicateResult).toEqual({ duplicates: 3, partialMatches: 0 })
    })

    it('needs 30 s of shared stretch', async () => {
      // The second track holds only 25 s of the first.
      const store = openPlaylist(A(), [
        ...recording(9, 40),
        ...A().slice(0, 25 * WINDOWS_PER_SECOND),
      ])

      await store.findDuplicates()

      expect(partialsOf(store)).toEqual([[], []])
    })

    it('says part of a track that is a stretch of an earlier one, from where it starts in it', async () => {
      const store = openPlaylist(LONG(), FROM_30(LONG()), C())

      await store.findDuplicates()

      expect(partialsOf(store)).toEqual([[], ['part of 01 from 0:30'], []])
    })

    it('words a stretch to the nearest 0.2 s, and with the kept copy’s name', async () => {
      const store = openPlaylist(LONG(), LONG().slice(Math.round(30.4 * WINDOWS_PER_SECOND)), C())
      store.renameTrack(store.tracks[0]?.startSplit?.id ?? null, 'Opening')

      await store.findDuplicates()

      expect(partialsOf(store)).toEqual([[], ['part of 01 Opening from 0:30.4'], []])
    })

    it('follows the track numbers after a split elsewhere', async () => {
      const store = openPlaylist(C(), A(), B(), [...A(), ...B()])
      await store.findDuplicates()
      expect(partialsOf(store)[3]).toEqual(['02 from 0:02', '03 from 0:42'])

      store.addSplitAt(20)

      expect(partialsOf(store)[4]).toEqual(['03 from 0:02', '04 from 0:42'])
    })

    it('lasts only while both tracks keep their ends', async () => {
      const store = openPlaylist(A(), B(), C(), [...A(), ...B()])
      await store.findDuplicates()
      const track = store.tracks[3]
      const split = track?.startSplit
      expect(split).toBeDefined()

      // The holding track's start moves: both its matches stop holding, the others stay.
      store.selectSplit(split?.id ?? 0)
      store.moveSplit(split?.id ?? 0, (split?.seconds ?? 0) - 1)

      expect(partialsOf(store)[3]).toEqual([])
      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('is dismissed like a match, and one piece at a time', async () => {
      const store = openPlaylist(A(), B(), C(), [...A(), ...B()])
      await store.findDuplicates()

      store.dismissMatch(store.tracks[3]?.startSplit?.id ?? null, null)

      expect(partialsOf(store)[3]).toEqual(['02 from 0:42'])
      expect(store.tracks[3]?.inclusion).toBe('included')
      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 1 })
      expect(store.editCount).toBe(1)
    })

    it('stays dismissed on a second press, and the other piece is found again', async () => {
      const store = openPlaylist(A(), B(), C(), [...A(), ...B()])
      await store.findDuplicates()
      store.dismissMatch(store.tracks[3]?.startSplit?.id ?? null, null)

      await store.findDuplicates()

      expect(partialsOf(store)[3]).toEqual(['02 from 0:42'])
    })

    it('lets a track hold a dismissed duplicate, which is a track like any other', async () => {
      const store = openPlaylist(A(), B(), A(), [...A(), ...B()])
      await store.findDuplicates()
      expect(partialsOf(store)[3]).toEqual(['01 from 0:02', '02 from 0:42'])
      dismiss(store, 3)

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null, null])
      expect(partialsOf(store)[3]).toEqual(['01 from 0:02', '02 from 0:42', '03 from 0:02'])
    })
  })

  describe('copies left out by hand', () => {
    it('makes the earliest copy not left out by hand the kept copy', async () => {
      const store = openPlaylist(A(), B(), A(), A(), B())
      leaveOut(store, 1)

      await store.findDuplicates()

      // 01 is left out by hand: 03 is the kept copy and 04 names it, 01 gets no words.
      expect(duplicatesOf(store)).toEqual([null, null, null, 3, 2])
      expect(store.tracks.map((track) => track.inclusion)).toEqual([
        'by-hand',
        'included',
        'included',
        'duplicate',
        'duplicate',
      ])
    })

    it('gives a copy left out by hand its words and keeps its reason', async () => {
      const store = openPlaylist(A(), B(), A(), A())
      leaveOut(store, 3)

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, 1, 1])
      expect(store.tracks[2]).toMatchObject({
        inclusion: 'by-hand',
        isLeftOut: true,
        exportNumber: null,
        matches: [
          expect.objectContaining({
            kind: 'duplicate',
            number: 1,
            ownName: null,
            startSplitId: null,
          }),
        ],
      })
      expect(store.tracks[3]?.inclusion).toBe('duplicate')
      // The two copies are left out, one by hand and one as a duplicate: 01 and 02 are written.
      expect(store.exportTrackCount).toBe(2)
      expect(store.tracks.map((track) => track.exportNumber)).toEqual([1, 2, null, null])
    })

    it('gives no match to a recording whose every copy is left out by hand', async () => {
      const store = openPlaylist(A(), B(), A(), B(), A())
      leaveOut(store, 1)
      leaveOut(store, 3)
      leaveOut(store, 5)

      await store.findDuplicates()

      // A has no match at all; B still has one.
      expect(duplicatesOf(store)).toEqual([null, null, null, 2, null])
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('gives no match to a recording left out by hand, and one to the other', async () => {
      const store = openPlaylist(A(), A(), B(), B())
      leaveOut(store, 1)
      leaveOut(store, 2)

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null, 3])
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('lets the kept copy be left out after the press without moving any match', async () => {
      const store = openPlaylist(A(), B(), A(), A())
      await store.findDuplicates()
      expect(duplicatesOf(store)).toEqual([null, null, 1, 1])

      leaveOut(store, 1)

      expect(duplicatesOf(store)).toEqual([null, null, 1, 1])
      expect(store.tracks.map((track) => track.inclusion)).toEqual([
        'by-hand',
        'included',
        'duplicate',
        'duplicate',
      ])
      // The export may write none of the copies.
      expect(store.tracks.filter((track) => !track.isLeftOut).map((track) => track.number)).toEqual(
        [2],
      )
    })

    it('picks the kept copy again from the left-out state as it is on the next press', async () => {
      const store = openPlaylist(A(), B(), A(), A())
      await store.findDuplicates()
      leaveOut(store, 1)

      await store.findDuplicates()

      // 01 is left out by hand now, so 03 is kept and 04 names it.
      expect(duplicatesOf(store)).toEqual([null, null, null, 3])
      expect(store.tracks.map((track) => track.inclusion)).toEqual([
        'by-hand',
        'included',
        'included',
        'duplicate',
      ])
    })

    it('counts the leaving out by hand as an edit and the search as none', async () => {
      const store = openPlaylist(A(), B(), A())
      leaveOut(store, 3)
      expect(store.editCount).toBe(1)

      await store.findDuplicates()

      expect(store.editCount).toBe(1)
    })
  })

  describe('the result', () => {
    it('counts the duplicates, and says nothing before the first press', async () => {
      const store = openPlaylist(A(), B(), A(), B(), C())
      expect(store.duplicateResult).toBeNull()

      await store.findDuplicates()

      expect(store.duplicateResult).toEqual({ duplicates: 2, partialMatches: 0 })
    })

    it('says none were found when the search ran and found none', async () => {
      const store = openPlaylist(A(), B(), C())

      await store.findDuplicates()

      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('counts again after a second press, with the same answer', async () => {
      const store = openPlaylist(A(), B(), A())

      await store.findDuplicates()
      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, 1])
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
    })
  })

  describe('the export', () => {
    it('leaves a duplicate out, and numbers the files written 1 to K', async () => {
      const store = openPlaylist(A(), A(), B(), C(), B())
      store.setTrackNamePrefix('set-')

      await store.findDuplicates()

      expect(store.tracks.map((track) => track.isLeftOut)).toEqual([
        false,
        true,
        false,
        false,
        true,
      ])
      expect(store.tracks.map((track) => track.exportNumber)).toEqual([1, null, 2, 3, null])
      expect(store.tracks.map((track) => track.name)).toEqual([
        'set-01',
        'set-',
        'set-02',
        'set-03',
        'set-',
      ])
      expect(store.exportTrackCount).toBe(3)
    })

    it('keeps the place in the file of every track, duplicate or not', async () => {
      const store = openPlaylist(A(), A(), B())

      await store.findDuplicates()

      expect(store.tracks.map((track) => track.number)).toEqual([1, 2, 3])
    })
  })

  describe('whether it can be pressed', () => {
    it('needs two tracks of 30 s or more', async () => {
      const oneLong = openPlaylist(A(), recording(7, 25))
      expect(oneLong.canFindDuplicates).toBe(false)
      await oneLong.findDuplicates()
      expect(oneLong.duplicateResult).toBeNull()

      setActivePinia(createPinia())
      expect(openPlaylist(A(), recording(7, 25), B()).canFindDuplicates).toBe(true)
    })

    it('is off with no file', () => {
      expect(useSplitStore().canFindDuplicates).toBe(false)
    })

    it('is off while a search runs, and on again after its answer', async () => {
      const store = openPlaylist(A(), B(), A())
      client.isHolding = true

      const search = store.findDuplicates()

      expect(store.duplicateSearchStatus).toBe('running')
      expect(store.canFindDuplicates).toBe(false)
      for (const answer of client.held) answer()
      await search
      expect(store.duplicateSearchStatus).toBe('idle')
      expect(store.canFindDuplicates).toBe(true)
    })
  })

  describe('what it leaves alone', () => {
    it('changes no split, name, pending split or selection, counts no edit and asks nothing', async () => {
      const store = openPlaylist(A(), B(), A())
      store.renameTrack(null, 'Opening')
      store.selectTrack(store.tracks[1]!)
      store.placeTrackMark(60)
      store.addPendingSplit(60, true)
      const before = {
        splits: JSON.stringify(store.splits),
        firstName: store.firstTrackName,
        pending: [...store.pendingSplits],
        selectedPending: store.selectedPendingSplit,
        selected: store.selectedTrack?.number,
        view: store.view,
        edits: store.editCount,
      }

      await store.findDuplicates()

      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
      expect({
        splits: JSON.stringify(store.splits),
        firstName: store.firstTrackName,
        pending: [...store.pendingSplits],
        selectedPending: store.selectedPendingSplit,
        selected: store.selectedTrack?.number,
        view: store.view,
        edits: store.editCount,
      }).toEqual(before)
      expect(store.discardQuestion).toBeNull()
    })
  })

  describe('an answer that is not wanted any more', () => {
    it('is dropped when the file was cleared of its splits meanwhile', async () => {
      const store = openPlaylist(A(), B(), A())
      client.isHolding = true

      const search = store.findDuplicates()
      store.clearSplits()
      for (const answer of client.held) answer()
      await search

      expect(store.duplicateResult).toBeNull()
      expect(store.duplicateSearchStatus).toBe('idle')
    })

    it('is dropped when another file opened meanwhile', async () => {
      const store = openPlaylist(A(), B(), A())
      client.isHolding = true

      const search = store.findDuplicates()
      const curve = playlist(B(), C())
      store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
      for (const answer of client.held) answer()
      await search

      expect(store.duplicateResult).toBeNull()
      expect(store.duplicateSearchStatus).toBe('idle')
    })

    it('is dropped after a reset', async () => {
      const store = openPlaylist(A(), B(), A())
      client.isHolding = true

      const search = store.findDuplicates()
      store.reset()
      for (const answer of client.held) answer()
      await search

      expect(store.duplicateResult).toBeNull()
      expect(store.duplicateSearchStatus).toBe('idle')
    })
  })

  describe('after the file starts over', () => {
    it('drops every match on Clear splits and on a new file', async () => {
      const store = openPlaylist(A(), B(), A())
      await store.findDuplicates()
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })

      store.clearSplits()
      expect(store.duplicateResult).toBeNull()
      expect(store.tracks.map((track) => track.inclusion)).toEqual(['included'])

      const curve = playlist(A(), B(), A())
      store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
      store.addGapSplits()
      await store.findDuplicates()
      store.reset()
      expect(store.duplicateResult).toBeNull()
    })
  })

  describe('a match and the splits', () => {
    it('lasts only while both tracks keep their ends', async () => {
      const store = openPlaylist(A(), B(), A())
      await store.findDuplicates()
      expect(duplicatesOf(store)).toEqual([null, null, 1])

      // A split inside the copy shortens it: the match was for the whole.
      store.addSplitAt(100)

      expect(store.tracks.map((track) => track.inclusion)).toEqual([
        'included',
        'included',
        'included',
        'included',
      ])
      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('drops the matches of a track whose start split moves, and exports it again', async () => {
      const store = await pressedFiveTracks()
      const start = startOf(store, 3)!
      store.selectSplit(start.id)

      store.moveSplit(start.id, start.seconds + 1)

      // 03 and 02 changed: 03 lost its match, and 04 its kept copy 02. 05 keeps its own.
      expect(duplicatesOf(store)).toEqual([null, null, null, null, 1])
      expect(store.tracks[2]?.inclusion).toBe('included')
      expect(store.tracks[2]?.exportNumber).toBe(3)
      expect(store.tracks[3]?.exportNumber).toBe(4)
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('drops the matches of a track whose end split moves', async () => {
      const store = await pressedFiveTracks()
      const end = endOf(store, 4)!
      store.selectSplit(end.id)

      store.moveSplit(end.id, end.seconds - 1)

      // 04 is the duplicate of 02 and 05 the next track: both changed, 05 loses its match too.
      expect(duplicatesOf(store)).toEqual([null, null, 1, null, null])
    })

    it('drops the matches that name a track whose end moves', async () => {
      const store = await pressedFiveTracks()
      const end = endOf(store, 1)!
      store.selectSplit(end.id)

      store.moveSplit(end.id, end.seconds - 1)

      // 01 is the kept copy of 03 and 05, and 02 shares the split: 04 named 02, which changed too.
      expect(duplicatesOf(store)).toEqual([null, null, null, null, null])
      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('drops the matches of a track whose split is deleted, and the matches naming it', async () => {
      const store = await pressedFiveTracks()

      // The split between 04 and 05: 04 and 05 become one track.
      store.deleteSplit(endOf(store, 4)!.id)

      expect(store.tracks).toHaveLength(4)
      expect(duplicatesOf(store)).toEqual([null, null, 1, null])
    })

    it('drops the matches naming a track that is merged into its neighbour', async () => {
      const store = await pressedFiveTracks()

      // 01 and 02 become one track: 03 and 05 named 01, 04 named 02.
      store.deleteSplit(endOf(store, 1)!.id)

      expect(store.tracks).toHaveLength(4)
      expect(duplicatesOf(store)).toEqual([null, null, null, null])
      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 0 })
    })

    it('makes an included track of a merge that starts with a duplicate', async () => {
      const store = await pressedFiveTracks()

      store.deleteSplit(endOf(store, 3)!.id)

      // 03 and 04 are one track now, and nothing leaves it out.
      expect(store.tracks).toHaveLength(4)
      expect(store.tracks[2]?.inclusion).toBe('included')
      expect(store.tracks[2]?.isLeftOut).toBe(false)
    })

    it('drops the matches of the tracks a removed track merges, and keeps the others', async () => {
      const store = await pressedFiveTracks()

      // 02, 03 and 04 become one track; 05 still names 01.
      store.removeTrack(store.tracks[2]!)

      expect(store.tracks).toHaveLength(3)
      expect(duplicatesOf(store)).toEqual([null, null, 1])
      expect(store.tracks[1]?.inclusion).toBe('included')
    })

    it('makes two included tracks of a split added inside a duplicate', async () => {
      const store = await pressedFiveTracks()
      const duplicate = store.tracks[2]!

      store.addSplitAt(duplicate.startSeconds + 20)

      expect(store.tracks.slice(2, 4).map((track) => track.inclusion)).toEqual([
        'included',
        'included',
      ])
      // 04 and 05 hold their matches, now as tracks 05 and 06.
      expect(duplicatesOf(store)).toEqual([null, null, null, null, 2, 1])
    })

    it('drops the matches that name a track a split is added inside', async () => {
      const store = await pressedFiveTracks()

      // Inside 01, the kept copy of 03 and 05: they are not copies of a half.
      store.addSplitAt(20)

      expect(store.tracks).toHaveLength(6)
      expect(duplicatesOf(store)).toEqual([null, null, null, null, 3, null])
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('drops the matches of a track that Find gaps cuts, and keeps the others', async () => {
      const curve = playlist(A_WITH_DIP(), B(), A_WITH_DIP(), B())
      const store = useSplitStore()
      store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
      store.setSilenceThreshold(-48)
      store.addGapSplits()
      expect(store.tracks).toHaveLength(4)
      await store.findDuplicates()
      expect(duplicatesOf(store)).toEqual([null, null, 1, 2])

      store.setSilenceThreshold(-40)
      store.setMinimumGapLength(2)
      store.addGapSplits()

      // The dips are gaps now, in 01 and in 03: both are cut. 04 still names 02, now 03.
      expect(store.tracks).toHaveLength(6)
      expect(duplicatesOf(store)).toEqual([null, null, null, null, null, 3])
    })

    it('keeps the matches when an edit touches no track of them', async () => {
      const store = await pressedFiveTracks()
      store.renameTrack(store.tracks[0]?.startSplit?.id ?? null, 'Opening')
      leaveOut(store, 2)

      expect(duplicatesOf(store)).toEqual([null, null, 1, 2, 1])
      expect(store.duplicateResult).toEqual({ duplicates: 3, partialMatches: 0 })
    })

    it('shows the live number and the name of the kept copy after a split elsewhere', async () => {
      const store = openPlaylist(C(), A(), B(), A())
      store.renameTrack(store.tracks[1]?.startSplit?.id ?? null, 'Opening')
      await store.findDuplicates()
      expect(store.tracks[3]?.matches[0]).toMatchObject({ number: 2, ownName: 'Opening' })

      // Inside 01, which no match holds: every track after it moves one place on.
      store.addSplitAt(20)

      expect(store.tracks[4]?.matches[0]).toMatchObject({ number: 3, ownName: 'Opening' })
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('gives no name while the kept copy has none', async () => {
      const store = openPlaylist(A(), B(), A())

      await store.findDuplicates()

      expect(store.tracks[2]?.matches[0]).toMatchObject({
        number: 1,
        ownName: null,
        startSplitId: null,
      })
    })
  })

  describe('a search that an edit overtakes', () => {
    it('leaves dead the matches of a track a split moved meanwhile', async () => {
      const store = openPlaylist(A(), B(), A(), B(), A())
      client.isHolding = true
      const search = store.findDuplicates()
      const start = store.tracks[2]!.startSplit!
      store.selectSplit(start.id)
      store.moveSplit(start.id, start.seconds + 1)

      for (const answer of client.held) answer()
      await search

      // 03 and 02 changed, so the matches of 03 and 04 are dead on arrival; 05 keeps its own.
      expect(duplicatesOf(store)).toEqual([null, null, null, null, 1])
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })
    })

    it('leaves dead the matches of a track a split was added inside meanwhile', async () => {
      const store = openPlaylist(A(), B(), A())
      client.isHolding = true
      const search = store.findDuplicates()
      store.addSplitAt(100)

      for (const answer of client.held) answer()
      await search

      expect(store.duplicateResult).toEqual({ duplicates: 0, partialMatches: 0 })
      expect(store.tracks.every((track) => !track.isLeftOut)).toBe(true)
    })

    it('drops the answer of an older press when a newer one has gone out', async () => {
      const store = openPlaylist(A(), B(), A())
      client.isHolding = true
      const first = store.findDuplicates()
      store.addSplitAt(100)
      store.clearSplits()
      store.open(playlist(A(), B(), A()), {
        windowSeconds: 0.05,
        durationSeconds: playlist(A(), B(), A()).length * 0.05,
      })
      store.addGapSplits()
      const second = store.findDuplicates()

      // The older answer arrives last: it must not replace the newer one.
      client.held.reverse()
      for (const answer of client.held) answer()
      await Promise.all([first, second])

      expect(duplicatesOf(store)).toEqual([null, null, 1])
    })
  })

  describe('dismissing a match', () => {
    it('exports a dismissed duplicate again, and keeps the other matches', async () => {
      const store = await pressedFiveTracks()

      dismiss(store, 3)

      expect(duplicatesOf(store)).toEqual([null, null, null, 2, 1])
      expect(store.tracks.map((track) => track.inclusion)).toEqual([
        'included',
        'included',
        'included',
        'duplicate',
        'duplicate',
      ])
      expect(store.tracks.map((track) => track.exportNumber)).toEqual([1, 2, 3, null, null])
      expect(store.exportTrackCount).toBe(3)
    })

    it('leaves a track left out by hand out, without its words', async () => {
      const store = openPlaylist(A(), B(), A())
      leaveOut(store, 3)
      await store.findDuplicates()
      expect(duplicatesOf(store)).toEqual([null, null, 1])

      dismiss(store, 3)

      expect(duplicatesOf(store)).toEqual([null, null, null])
      expect(store.tracks[2]).toMatchObject({ inclusion: 'by-hand', isLeftOut: true })
    })

    it('drops the match from the counts', async () => {
      const store = await pressedFiveTracks()
      expect(store.duplicateResult).toEqual({ duplicates: 3, partialMatches: 0 })

      dismiss(store, 4)

      expect(store.duplicateResult).toEqual({ duplicates: 2, partialMatches: 0 })
    })

    it('refuses a pair that is no live match', async () => {
      const store = await pressedFiveTracks()

      // 02 and 04 are no match in this order, and 01 does not repeat 02.
      store.dismissMatch(
        store.tracks[1]?.startSplit?.id ?? null,
        store.tracks[3]?.startSplit?.id ?? null,
      )
      store.dismissMatch(
        store.tracks[0]?.startSplit?.id ?? null,
        store.tracks[1]?.startSplit?.id ?? null,
      )
      store.dismissMatch(999, null)

      expect(duplicatesOf(store)).toEqual([null, null, 1, 2, 1])
      expect(store.editCount).toBe(0)
    })

    it('is one edit while both tracks keep their ends, and no edit once one changes', async () => {
      const store = await pressedFiveTracks()
      expect(store.editCount).toBe(0)

      dismiss(store, 3)
      expect(store.editCount).toBe(1)
      expect(store.hasEdits).toBe(true)

      // 03's start moves: the dismissal is no longer live, so only the move is an edit.
      const start = store.tracks[2]!.startSplit!
      store.selectSplit(start.id)
      store.moveSplit(start.id, start.seconds + 1)
      expect(duplicatesOf(store)[2]).toBeNull()
      expect(store.editCount).toBe(1)
    })

    it('counts two dismissals as two edits', async () => {
      const store = await pressedFiveTracks()

      dismiss(store, 3)
      dismiss(store, 4)

      expect(store.editCount).toBe(2)
    })

    it('is dropped by Clear splits', async () => {
      const store = await pressedFiveTracks()
      dismiss(store, 3)

      store.clearSplits()

      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
    })

    it('is dropped by a new file, so the same tracks are found again', async () => {
      const store = await pressedFiveTracks()
      dismiss(store, 3)

      const curve = playlist(A(), B(), A())
      store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
      store.addGapSplits()
      await store.findDuplicates()

      expect(store.editCount).toBe(0)
      expect(duplicatesOf(store)).toEqual([null, null, 1])
    })

    it('stays dismissed on a second press while neither track changed', async () => {
      const store = await pressedFiveTracks()
      dismiss(store, 3)

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null, 2, 1])
      expect(store.duplicateResult).toEqual({ duplicates: 2, partialMatches: 0 })
    })

    it('is found again on a second press once a track of the pair has changed', async () => {
      const store = await pressedFiveTracks()
      dismiss(store, 3)
      const start = store.tracks[2]!.startSplit!
      store.selectSplit(start.id)
      store.moveSplit(start.id, start.seconds + 1)

      await store.findDuplicates()

      // The moved split is a second off: 03 is within the 2 s of its ends, so 03 and 05 name 01.
      expect(duplicatesOf(store)[2]).toBe(1)
    })

    it('does not let a dismissed pair join its recording through a third copy', async () => {
      const store = openPlaylist(A(), B(), A(), A())
      await store.findDuplicates()
      expect(duplicatesOf(store)).toEqual([null, null, 1, 1])

      dismiss(store, 3)
      await store.findDuplicates()

      // 03 is not a duplicate of 01 any more; 04 still repeats 01.
      expect(duplicatesOf(store)).toEqual([null, null, null, 1])
    })

    it('keeps a dismissed last copy out of a second press', async () => {
      const store = await pressedFiveTracks()
      dismiss(store, 5)

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, 1, 2, null])
    })
  })

  describe('bringing a duplicate back', () => {
    it('dismisses the match instead of leaving the track out by hand', async () => {
      const store = await pressedFiveTracks()

      leaveOut(store, 3)

      expect(duplicatesOf(store)).toEqual([null, null, null, 2, 1])
      expect(store.tracks[2]).toMatchObject({ inclusion: 'included', isLeftOut: false })
      expect(store.editCount).toBe(1)
    })

    it('leaves a dismissed duplicate out by hand, as any track', async () => {
      const store = await pressedFiveTracks()
      leaveOut(store, 3)

      leaveOut(store, 3)

      expect(store.tracks[2]).toMatchObject({ inclusion: 'by-hand', isLeftOut: true })
      expect(store.editCount).toBe(2)
    })

    it('brings a duplicate left out by hand back to a duplicate, then dismisses it', async () => {
      const store = openPlaylist(A(), B(), A())
      leaveOut(store, 3)
      await store.findDuplicates()
      expect(store.tracks[2]?.inclusion).toBe('by-hand')

      leaveOut(store, 3)
      expect(store.tracks[2]).toMatchObject({ inclusion: 'duplicate', isLeftOut: true })

      leaveOut(store, 3)
      expect(store.tracks[2]).toMatchObject({ inclusion: 'included', isLeftOut: false })
    })
  })

  describe('a second press', () => {
    it('replaces every match with a fresh result', async () => {
      const store = openPlaylist(A(), B(), A(), B())
      await store.findDuplicates()
      expect(duplicatesOf(store)).toEqual([null, null, 1, 2])
      // 03 and 04 stop being matches by an edit: 02 and 03 changed.
      const start = store.tracks[2]!.startSplit!
      store.selectSplit(start.id)
      store.moveSplit(start.id, start.seconds + 1)
      expect(duplicatesOf(store)).toEqual([null, null, null, null])

      await store.findDuplicates()

      // The moved split is a second off now: 03 is within the 2 s of the ends, so it is back.
      expect(duplicatesOf(store)).toEqual([null, null, 1, 2])
      expect(store.duplicateResult).toEqual({ duplicates: 2, partialMatches: 0 })
    })
  })
})
