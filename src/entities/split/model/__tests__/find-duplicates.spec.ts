import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

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

// Where each track repeats: the number of the track it is a duplicate of, or null.
const duplicatesOf = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => track.duplicateOf)

// Leaves track `number` (1-based) out by hand, as the eye button does.
function leaveOut(store: ReturnType<typeof useSplitStore>, number: number) {
  store.toggleLeftOut(store.tracks[number - 1]?.startSplit?.id ?? null)
}

// Three recordings, A to C, each 40 s or more.
const A = () => recording(1, 40)
const B = () => recording(2, 50)
const C = () => recording(3, 60)

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
        duplicateOf: 1,
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
      expect(store.duplicateResult).toEqual({ duplicates: 1 })
    })

    it('gives no match to a recording left out by hand, and one to the other', async () => {
      const store = openPlaylist(A(), A(), B(), B())
      leaveOut(store, 1)
      leaveOut(store, 2)

      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, null, 3])
      expect(store.duplicateResult).toEqual({ duplicates: 1 })
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

      expect(store.duplicateResult).toEqual({ duplicates: 2 })
    })

    it('says none were found when the search ran and found none', async () => {
      const store = openPlaylist(A(), B(), C())

      await store.findDuplicates()

      expect(store.duplicateResult).toEqual({ duplicates: 0 })
    })

    it('counts again after a second press, with the same answer', async () => {
      const store = openPlaylist(A(), B(), A())

      await store.findDuplicates()
      await store.findDuplicates()

      expect(duplicatesOf(store)).toEqual([null, null, 1])
      expect(store.duplicateResult).toEqual({ duplicates: 1 })
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

      expect(store.duplicateResult).toEqual({ duplicates: 1 })
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
      expect(store.duplicateResult).toEqual({ duplicates: 1 })

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
      expect(store.duplicateResult).toEqual({ duplicates: 0 })
    })
  })
})
