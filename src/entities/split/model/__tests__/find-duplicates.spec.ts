import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { matchWords } from '../../lib/match-words.ts'
import { useSplitStore } from '../split.ts'
import { client, resetClient } from './fake-find-matches-client.ts'
import {
  A,
  B,
  C,
  FOREIGN,
  LONG,
  WINDOWS_PER_SECOND,
  playlist,
  recording,
} from './made-up-recordings.ts'

vi.mock('../../api/find-matches-client.ts', () => import('./fake-find-matches-client.ts'))

function openPlaylist(...recordings: number[][]) {
  const curve = playlist(...recordings)
  const store = useSplitStore()
  store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
  store.findSplits()
  expect(store.tracks).toHaveLength(recordings.length)
  return store
}

// The track's match that makes it a duplicate, or undefined.
const duplicateOf = (track: { matches: { kind: string; number: number }[] }) =>
  track.matches.find((match) => match.kind === 'full')

// What each track's partial matches say, as the track list words them.
const partialsOf = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) =>
    track.matches
      .filter((match) => match.kind !== 'full')
      .map((match) => matchWords(match, store.tracks.length)),
  )

// Where each track repeats: the number of the track it is a duplicate of, or null.
const duplicatesOf = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => duplicateOf(track)?.number ?? null)

// Leaves track `number` (1-based) out by hand, as the eye button does.
function leaveOut(store: ReturnType<typeof useSplitStore>, number: number) {
  store.toggleLeftOut(store.tracks[number - 1]?.startSplit?.id ?? null)
}

// Where track `number` (1-based) starts, as the split at its start holds it.
const startOf = (store: ReturnType<typeof useSplitStore>, number: number) =>
  store.tracks[number - 1]?.startSplit

// A time in track `number` (1-based), as the playhead of the file holds it.
const at = (store: ReturnType<typeof useSplitStore>, number: number, seconds: number) =>
  store.tracks[number - 1]!.startSeconds + seconds

// The swap target as where it lands: the track's number, and the time in that track.
function landing(store: ReturnType<typeof useSplitStore>, playhead: number) {
  const target = store.swapTarget(playhead)
  return target === null
    ? null
    : [target.track.number, Math.round((target.seconds - target.track.startSeconds) * 10) / 10]
}

// Track 4 holds 01 and 02 with other music between them, and is selected.
async function pressedHolder() {
  const store = openPlaylist(A(), B(), C(), [...A(), ...FOREIGN(), ...B()])
  await store.findDuplicates()
  expect(partialsOf(store)[3]).toEqual(['01 from 0:02', '02 from 1:12'])
  store.selectTrack(store.tracks[3]!)
  return store
}

// A, B, A, B, A and the press: 03 and 05 name 01, 04 names 02.
async function pressedFiveTracks() {
  const store = openPlaylist(A(), B(), A(), B(), A())
  await store.findDuplicates()
  expect(duplicatesOf(store)).toEqual([null, null, 1, 2, 1])
  return store
}

// Dismisses track 3's match with its kept copy, as its button in the track list does.
function dismissThird(store: ReturnType<typeof useSplitStore>) {
  const track = store.tracks[2]!
  store.dismissMatch(
    track,
    track.matches.find((match) => match.kind === 'full')!,
  )
}

describe('Find duplicates', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    resetClient()
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

  describe('partial matches', () => {
    it('says where in each track the shared stretch lies, for the tooltip', async () => {
      const store = openPlaylist(A(), B(), C(), [...A(), ...B()])

      await store.findDuplicates()

      expect(store.tracks[3]?.matches).toMatchObject([
        { kind: 'holds', number: 1, here: { from: 2, to: 42 }, there: { from: 0, to: 40 } },
        { kind: 'holds', number: 2, here: { from: 42, to: 92 }, there: { from: 2, to: 52 } },
      ])
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
            kind: 'full',
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

    it('writes none of the copies when the kept copy is left out after the press', async () => {
      const store = openPlaylist(A(), B(), A(), A())
      await store.findDuplicates()
      expect(duplicatesOf(store)).toEqual([null, null, 1, 1])

      leaveOut(store, 1)

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

    it('counts the leaving out by hand as an edit and the search as none', async () => {
      const store = openPlaylist(A(), B(), A())
      leaveOut(store, 3)
      expect(store.editCount).toBe(1)

      await store.findDuplicates()

      expect(store.editCount).toBe(1)
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

  describe('after the file starts over', () => {
    it('drops every match on Clear splits', async () => {
      const store = openPlaylist(A(), B(), A())
      await store.findDuplicates()
      expect(store.duplicateResult).toEqual({ duplicates: 1, partialMatches: 0 })

      store.clearSplits()

      expect(store.duplicateResult).toBeNull()
      expect(store.tracks.map((track) => track.inclusion)).toEqual(['included'])
    })

    it('drops every match on a new file', async () => {
      const store = openPlaylist(A(), B(), A())
      await store.findDuplicates()

      const curve = playlist(A(), B(), A())
      store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
      store.findSplits()

      expect(store.duplicateResult).toBeNull()
      expect(store.tracks.map((track) => track.inclusion)).toEqual([
        'included',
        'included',
        'included',
      ])
    })

    it('drops every match on a reset', async () => {
      const store = openPlaylist(A(), B(), A())
      await store.findDuplicates()

      store.reset()

      expect(store.duplicateResult).toBeNull()
    })

    it('forgets a failed search, and cannot be pressed with one track', async () => {
      const store = openPlaylist(A(), B(), A())
      expect(store.canFindDuplicates).toBe(true)
      client.failure = 'Out of memory'
      await store.findDuplicates()
      expect(store.duplicateSearchStatus).toBe('failed')
      expect(store.duplicateSearchFailure).toBe('Out of memory')

      store.clearSplits()

      expect(store.duplicateSearchStatus).toBe('idle')
      expect(store.duplicateSearchFailure).toBeNull()
      expect(store.canFindDuplicates).toBe(false)
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

    it('keeps the match when the kept copy is renamed after the press, and shows the new name', async () => {
      const store = openPlaylist(A(), B(), A())
      await store.findDuplicates()

      store.renameTrack(store.tracks[0]?.startSplit?.id ?? null, 'Opening')

      expect(duplicatesOf(store)).toEqual([null, null, 1])
      expect(store.tracks[2]?.matches[0]).toMatchObject({ number: 1, ownName: 'Opening' })
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

  describe('dismissing a match', () => {
    it('exports a dismissed duplicate again, and keeps the other matches', async () => {
      const store = await pressedFiveTracks()

      dismissThird(store)

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

      dismissThird(store)

      expect(duplicatesOf(store)).toEqual([null, null, null])
      expect(store.tracks[2]).toMatchObject({ inclusion: 'by-hand', isLeftOut: true })
    })

    it('is one edit while both tracks keep their ends, and no edit once one changes', async () => {
      const store = await pressedFiveTracks()
      expect(store.editCount).toBe(0)

      dismissThird(store)
      expect(store.editCount).toBe(1)
      expect(store.hasEdits).toBe(true)

      // 03's start moves: the dismissal is no longer live, so only the move is an edit.
      const start = store.tracks[2]!.startSplit!
      store.selectSplit(start.id)
      store.moveSplit(start.id, start.seconds + 1)
      expect(duplicatesOf(store)[2]).toBeNull()
      expect(store.editCount).toBe(1)
    })

    it('is dropped by Clear splits', async () => {
      const store = await pressedFiveTracks()
      dismissThird(store)

      store.clearSplits()

      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
    })

    it('is dropped by a new file, so the same tracks are found again', async () => {
      const store = await pressedFiveTracks()
      dismissThird(store)

      const curve = playlist(A(), B(), A())
      store.open(curve, { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 })
      store.findSplits()
      await store.findDuplicates()

      expect(store.editCount).toBe(0)
      expect(duplicatesOf(store)).toEqual([null, null, 1])
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

    it('brings a duplicate left out by hand back in one press, dismissing its match', async () => {
      const store = openPlaylist(A(), B(), A())
      leaveOut(store, 3)
      await store.findDuplicates()
      expect(store.tracks[2]?.inclusion).toBe('by-hand')

      leaveOut(store, 3)

      expect(store.tracks[2]).toMatchObject({ inclusion: 'included', isLeftOut: false })
      expect(duplicateOf(store.tracks[2]!)).toBeUndefined()
      // The hand-made leaving out is taken back, and the dismissal is the one edit left.
      expect(store.editCount).toBe(1)
    })
  })

  describe('the swap', () => {
    it('selects the target track and gives it back, and the kept copy goes back to where it came from', async () => {
      const store = await pressedHolder()

      const target = store.swapTrack(at(store, 4, 10))
      expect(target?.track.number).toBe(1)
      expect(store.selectedTrack?.number).toBe(1)

      // On the kept copy: the track the swap came from, at the same moment of the shared stretch.
      expect(landing(store, at(store, 1, 8))).toEqual([4, 10])
      store.swapTrack(at(store, 1, 8))
      expect(store.selectedTrack?.number).toBe(4)
    })

    it('has no target with no track selected', async () => {
      const store = await pressedHolder()

      store.selectSplit(store.splits[0]!.id)

      expect(store.swapTarget(10)).toBeNull()
      expect(store.swapTrack(10)).toBeNull()
    })

    it('keeps the selection when the swap would discard pending splits', async () => {
      const store = await pressedHolder()
      store.addPendingSplit(at(store, 4, 30), true)

      expect(store.swapTrack(at(store, 4, 10))).toBeNull()

      expect(store.selectedTrack?.number).toBe(4)
      expect(store.discardQuestion).not.toBeNull()
      // The swap that did not happen left no way back.
      store.cancelDiscard()
      store.deleteSelectedPendingSplit()
      store.selectTrack(store.tracks[0]!)
      expect(store.selectedTrack?.number).toBe(1)
      expect(store.swapTarget(at(store, 1, 8))).toBeNull()
    })
  })
})
