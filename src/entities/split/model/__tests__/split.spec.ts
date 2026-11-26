import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { watch } from 'vue'

import {
  DEFAULT_DEPTH_DB,
  DEFAULT_MINIMUM_GAP_SECONDS,
  DEFAULT_OFFSET_DB,
  DEFAULT_SETTINGS_STORAGE_KEY,
} from '../../config/defaults.ts'
import { MAX_TRACK_NAME_LENGTH } from '../../config/track-name.ts'
import { ZOOM_WINDOW_SECONDS } from '../../config/zoom-window.ts'
import { SPECTRUM_BAND_COUNT } from '@/shared/lib/audio/spectrogram-builder.ts'
import { useSplitStore } from '../split.ts'

const LOUD = -10
const QUIET = -50

// A curve from runs: [value, count] pairs, in order. Windows are 50 ms.
function curveOf(...runs: [number, number][]) {
  return Float32Array.from(
    runs.flatMap(([value, count]) => Array.from({ length: count }, () => value)),
  )
}

function timing(curve: Float32Array) {
  return { windowSeconds: 0.05, durationSeconds: curve.length * 0.05 }
}

/*
30 s, median -10 dB. Quiet from 2 s to 5 s (3 s) and from 25 s to 27 s (2 s, the default minimum),
so the splits are at 3.5 s and 26 s, over the 15 s one boundary takes, and the tracks are 3.5 s,
22.5 s and 4 s long.
*/
const twoGaps = () => curveOf([LOUD, 40], [QUIET, 60], [LOUD, 400], [QUIET, 40], [LOUD, 60])

/*
60 s, median -10 dB. Quiet from 20 s to 24 s and from 40 s to 44 s, so the splits are at 22 s and
42 s: 20 s apart, so the zoom window on one (centre ± 10 s) never reaches the other.
*/
const farGaps = () => curveOf([LOUD, 400], [QUIET, 80], [LOUD, 320], [QUIET, 80], [LOUD, 320])

// Three splits at 22 s, 42 s and 62 s, each 20 s from the next, in a 80 s file.
const threeFarGapsCurve = () =>
  curveOf([LOUD, 400], [QUIET, 80], [LOUD, 320], [QUIET, 80], [LOUD, 320], [QUIET, 80], [LOUD, 320])

/*
12 s with splits added by hand at 3.5 s and 8 s: closer than Find splits ever puts two (15 s), for
the tests of what a split keeps from its neighbours.
*/
function closeSplitsStore() {
  const curve = curveOf([LOUD, 40], [QUIET, 60], [LOUD, 40], [QUIET, 40], [LOUD, 60])
  const store = useSplitStore()
  store.open(curve, timing(curve))
  store.addSplitAt(3.5)
  store.addSplitAt(8)
  return store
}

// A store with the file opened at the default settings.
function openCurve(curve: Float32Array) {
  const store = useSplitStore()
  store.open(curve, timing(curve))
  return store
}

// 4 s from 20 s that sit 16 dB under the music: no gap at -28 dB, but a dip 16 dB deep.
const shallowDip = () => curveOf([LOUD, 400], [-26, 80], [LOUD, 400])

// The times Find splits would add now.
const seconds = (store: ReturnType<typeof useSplitStore>) =>
  store.proposedSplits.map((proposal) => proposal.seconds)

// Every kind of edit at once: split 1 moved, split 2 deleted, one added, a track renamed.
function editedStore() {
  const curve = threeFarGapsCurve()
  const store = useSplitStore()
  store.open(curve, timing(curve))
  store.findSplits()
  // A split moves only inside the window, and detection leaves the window at the file's start.
  store.selectSplit(store.splits[0]!.id)
  store.moveSplit(store.splits[0]!.id, 25)
  store.deleteSplit(store.splits[1]!.id)
  store.moveZoomTo(50)
  store.addSplit()
  store.renameTrack(null, 'Opening')
  expect(store.editCount).toBe(4)
  return store
}

// Four tracks in 80 s (0–22, 22–42, 42–62, 62–80), named A to D.
function namedFourTracks() {
  const curve = threeFarGapsCurve()
  const store = useSplitStore()
  store.open(curve, timing(curve))
  store.findSplits()
  const [first, second, third] = store.splits
  store.renameTrack(null, 'A')
  store.renameTrack(first!.id, 'B')
  store.renameTrack(second!.id, 'C')
  store.renameTrack(third!.id, 'D')
  return store
}

const trackNames = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => track.name)

function storeWithTwoGaps() {
  const curve = twoGaps()
  const store = useSplitStore()
  store.open(curve, timing(curve))
  store.findSplits()
  return { curve, store }
}

// Splits at 22 s, 42 s and 62 s in 80 s.
function threeSplits() {
  const curve = threeFarGapsCurve()
  const store = useSplitStore()
  store.open(curve, timing(curve))
  store.findSplits()
  return store
}

// A range does not depend on the splits; 60 s with two of them will do.
function loadedStore() {
  const curve = farGaps()
  const store = useSplitStore()
  store.open(curve, timing(curve))
  store.findSplits()
  return store
}

// A store with the range of 10 s to 30 s and the mark placed.
function markedStore(markSeconds: number) {
  const store = loadedStore()
  store.setRange(10, 30)
  store.placeMark(markSeconds)
  return store
}

// Track 2 (22 s to 42 s) is selected with the window on its end split, so that split can move.
function markedSecondTrack() {
  const store = loadedStore()
  store.moveZoomTo(42)
  store.selectTrack(store.tracks[1]!)
  store.placeTrackMark(30)
  return store
}

// Track 2 (22 s to 42 s) is selected with its mark at 30 s.
function pendingStore() {
  const store = loadedStore()
  store.selectTrack(store.tracks[1]!)
  store.placeTrackMark(30)
  return store
}

// Pending splits at 27 s and 36 s, the second selected.
function pendingTwo() {
  const store = pendingStore()
  store.addPendingSplit(27, false)
  store.addPendingSplit(36, true)
  return store
}

// A file opened with no split: the two gaps of `twoGaps`, 2 s to 5 s and 7 s to 9 s.
function openTwoGaps() {
  const curve = twoGaps()
  const store = useSplitStore()
  store.open(curve, timing(curve))
  return store
}

// A file opened with no split and a pending split at 5 s in its one track.
function openWithPending() {
  const curve = farGaps()
  const store = useSplitStore()
  store.open(curve, timing(curve))
  store.placeTrackMark(5)
  store.addPendingSplit(5, true)
  return store
}

// What localStorage does when the browser blocks it: every read and write throws.
function throwBlocked(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

// The default settings' files: median -10 dB, so the built-in threshold is -28 dB, and median -20 dB.
const loudFile = () => curveOf([LOUD, 100])
const quietFile = () => curveOf([-20, 100])

function openFile(store: ReturnType<typeof useSplitStore>, curve: Float32Array) {
  store.open(curve, timing(curve))
}

const inclusions = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => track.inclusion)

// `loadedStore` is 60 s with splits at 22 s and 42 s: three tracks. Track 2 is left out.
function withSecondTrackLeftOut() {
  const store = loadedStore()
  store.toggleLeftOut(store.splits[0]!.id)
  expect(inclusions(store)).toEqual(['included', 'by-hand', 'included'])
  return store
}

// 80 s with splits at 22 s, 42 s and 62 s: four tracks.
function fourTracks(states: ('included' | 'by-hand')[]) {
  const store = threeSplits()
  for (const [index, state] of states.entries()) {
    const track = store.tracks[index]!
    if (track.inclusion !== state) store.toggleLeftOut(track.startSplit?.id ?? null)
  }
  expect(inclusions(store)).toEqual(states)
  return store
}

/*
What an open discard question leaves of `pendingTwo`: the question is open, and the held action has
not run, so the track, the list and the view are as they were. The third track is 42 s to 60 s.
*/
function heldState(store: ReturnType<typeof useSplitStore>) {
  return {
    question: store.discardQuestion,
    pending: store.pendingSplits,
    trackNumber: store.selectedTrack?.number,
    view: store.view,
  }
}
const HELD = {
  question: { pendingCount: 2 },
  pending: [27, 36],
  trackNumber: 2,
  view: 'track',
}

const selectedTracks = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => store.isTrackSelected(track))

// A gap 40 dB deep, then dips of 12 dB and 6 dB, each far from the others.
function threeDepths() {
  return curveOf(
    [LOUD, 400],
    [QUIET, 60],
    [LOUD, 400],
    [-22, 80],
    [LOUD, 400],
    [-16, 80],
    [LOUD, 400],
  )
}

/*
Dips of 6, 12 and 9 dB in time order (a doubtful, a sure-looking 12 is likely, and a likely 9),
and a gap of 40 dB: the order is 6, 9, 12, then the gap's 40.
*/
function openWithFourDepths() {
  const curve = curveOf(
    [LOUD, 400],
    [-16, 80],
    [LOUD, 400],
    [-22, 80],
    [LOUD, 400],
    [-19, 80],
    [LOUD, 400],
    [QUIET, 60],
    [LOUD, 400],
  )
  const store = openCurve(curve)
  store.setDepthSetting(3)
  store.findSplits()
  return store
}

const depths = (store: ReturnType<typeof useSplitStore>) =>
  store.splits.map((split) => split.confidence?.depth?.toFixed(0))

describe('the split store', () => {
  beforeEach(() => {
    // The default settings are kept in localStorage, which a spec must not inherit from another.
    localStorage.clear()
    vi.restoreAllMocks()
    setActivePinia(createPinia())
  })

  it('starts the silence threshold at the median minus the default offset, and the minimum gap at its default', () => {
    // 140 of the 240 windows are at -10 dB, so the median is -10 dB.
    const curve = twoGaps()
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(store.silenceThreshold).toBe(-10 - DEFAULT_OFFSET_DB)
    expect(store.minimumGapLength).toBe(DEFAULT_MINIMUM_GAP_SECONDS)
  })

  it('rounds the starting threshold to the Slider step of 0.1 dB', () => {
    // sample1.m4a: median -16.72 dB, so -34.72 dB rounds to -34.7 dB, as the readout shows it.
    const curve = curveOf([-16.72, 100])
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(store.silenceThreshold).toBeCloseTo(-34.7, 12)
  })

  it('proposes a split in the middle of each gap, with no names yet', () => {
    const curve = twoGaps()
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(store.gaps).toHaveLength(2)
    expect(store.splits.map((split) => split.seconds)).toEqual([
      expect.closeTo(3.5, 9),
      expect.closeTo(26, 9),
    ])
    expect(store.splits.map((split) => split.name)).toEqual([null, null])
    expect(store.firstTrackName).toBeNull()
  })

  it('makes N + 1 numbered tracks from N splits, the last one running to the end of the file', () => {
    const curve = twoGaps()
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(store.tracks.map((track) => track.number)).toEqual([1, 2, 3])
    expect(store.tracks.map((track) => track.name)).toEqual(['01', '02', '03'])
    expect(store.tracks.map((track) => track.startSeconds)).toEqual([
      0,
      expect.closeTo(3.5, 9),
      expect.closeTo(26, 9),
    ])
    expect(store.tracks.map((track) => track.lengthSeconds)).toEqual([
      expect.closeTo(3.5, 9),
      expect.closeTo(22.5, 9),
      expect.closeTo(4, 9),
    ])
    const total = store.tracks.reduce((sum, track) => sum + track.lengthSeconds, 0)
    expect(total).toBeCloseTo(30, 9)
  })

  it('tells which split starts each track: none for the first', () => {
    const curve = twoGaps()
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(store.tracks[0]?.startSplit).toBeNull()
    expect(store.tracks[1]?.startSplit).toBe(store.splits[0])
    expect(store.tracks[2]?.startSplit).toBe(store.splits[1])
  })

  it('shows a track name when the track has one, and keeps the others numbered by position', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.open(curve, timing(curve))
    store.findSplits()

    store.firstTrackName = 'Opening'
    store.splits[1]!.name = 'Encore'

    expect(store.tracks.map((track) => track.name)).toEqual(['Opening', '02', 'Encore'])
  })

  it('gives the own name beside the shown name: the typed name, or null while unnamed', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.open(curve, timing(curve))
    store.findSplits()

    store.firstTrackName = 'Opening'
    store.splits[1]!.name = 'Encore'

    expect(store.tracks.map((track) => track.ownName)).toEqual(['Opening', null, 'Encore'])

    store.firstTrackName = null

    expect(store.tracks[0]).toMatchObject({ ownName: null, name: '01' })
    expect(store.tracks[1]).toMatchObject({ ownName: null, name: '02' })
  })

  it('is one track over the whole file when there is no split', () => {
    const curve = curveOf([LOUD, 100])
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(store.splits).toEqual([])
    expect(store.tracks).toEqual([
      {
        number: 1,
        inclusion: 'included',
        isLeftOut: false,
        matches: [],
        exportNumber: 1,
        ownName: null,
        name: '01',
        placeName: '01',
        startSeconds: 0,
        lengthSeconds: 5,
        startSplit: null,
      },
    ])
  })

  it('keeps a lead-in and a run-out as gaps but proposes no split in them', () => {
    // 2.5 s quiet, 5 s loud (so the median is -10 dB), 2.5 s quiet.
    const curve = curveOf([QUIET, 50], [LOUD, 100], [QUIET, 50])
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(store.gaps.map((gap) => gap.edge)).toEqual(['lead-in', 'run-out'])
    expect(store.splits).toEqual([])
    expect(store.tracks).toHaveLength(1)
  })

  it('finds the gaps again when the silence threshold moves, and changes no split or name', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.open(curve, timing(curve))
    store.findSplits()
    store.firstTrackName = 'Opening'
    store.splits[0]!.name = 'Middle'

    // A threshold under every window's level: nothing is quiet.
    store.setSilenceThreshold(-60)

    expect(store.silenceThreshold).toBe(-60)
    expect(store.gaps).toEqual([])
    expect(store.splits).toHaveLength(2)
    expect(store.firstTrackName).toBe('Opening')
    expect(store.splits[0]?.name).toBe('Middle')

    store.setSilenceThreshold(-25)

    expect(store.gaps).toHaveLength(2)
    expect(store.splits).toHaveLength(2)
    expect(store.splits[0]?.name).toBe('Middle')
  })

  it('finds the gaps again when the minimum gap length changes, and changes no split or name', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.open(curve, timing(curve))
    store.findSplits()
    store.firstTrackName = 'Opening'
    store.splits[1]!.name = 'Encore'

    // The 2 s gap is dropped; the 3 s gap stays.
    store.setMinimumGapLength(2.5)

    expect(store.minimumGapLength).toBe(2.5)
    expect(store.gaps).toHaveLength(1)
    expect(store.splits.map((split) => split.seconds)).toEqual([
      expect.closeTo(3.5, 9),
      expect.closeTo(26, 9),
    ])
    expect(store.splits[1]?.name).toBe('Encore')
    expect(store.firstTrackName).toBe('Opening')
  })

  it('keeps the silence threshold the user set when the minimum gap length changes', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.open(curve, timing(curve))
    store.findSplits()
    store.setSilenceThreshold(-40)

    store.setMinimumGapLength(1.5)

    expect(store.silenceThreshold).toBe(-40)
  })

  it('does not change the curve it was given', () => {
    const curve = twoGaps()
    const before = Float32Array.from(curve)
    const store = useSplitStore()

    store.open(curve, timing(curve))
    store.findSplits()

    expect(curve).toEqual(before)
  })

  it('starts over with the defaults of a new file on the next detection', () => {
    const store = useSplitStore()
    const first = twoGaps()
    store.open(first, timing(first))
    store.findSplits()
    store.setSilenceThreshold(-40)
    store.setMinimumGapLength(3)

    const second = curveOf([-20, 100])
    store.open(second, timing(second))
    store.findSplits()

    expect(store.silenceThreshold).toBe(-20 - DEFAULT_OFFSET_DB)
    expect(store.minimumGapLength).toBe(DEFAULT_MINIMUM_GAP_SECONDS)
    expect(store.tracks).toHaveLength(1)
  })

  it('gives every split its own id, and keeps it when the split moves', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.open(curve, timing(curve))
    store.findSplits()

    const [first, second] = store.splits
    expect(first!.id).not.toBe(second!.id)

    store.moveSplit(first!.id, 3)

    expect(store.splits.map((split) => split.id)).toEqual([first!.id, second!.id])
  })

  describe('opening a file', () => {
    it('is one track with no splits, selected, on the Track view, with the gaps found', () => {
      const curve = twoGaps()
      const store = useSplitStore()

      store.open(curve, timing(curve))

      expect(store.splits).toEqual([])
      expect(store.tracks).toHaveLength(1)
      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.view).toBe('track')
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
      expect(store.gaps).toHaveLength(2)
      expect(store.editCount).toBe(0)
    })

    it('starts over when another file opens', () => {
      const store = editedStore()
      const curve = twoGaps()

      store.open(curve, timing(curve))

      expect(store.splits).toEqual([])
      expect(store.firstTrackName).toBeNull()
      expect(store.hasEdits).toBe(false)
      expect(store.pendingSplits).toEqual([])
    })
  })

  describe('Find splits', () => {
    it('would add the middle of each inner gap, and a press adds exactly those', () => {
      const store = openTwoGaps()
      const times = [...store.proposedSplits.map((proposal) => proposal.seconds)]

      expect(times).toEqual([expect.closeTo(3.5, 9), expect.closeTo(26, 9)])

      store.findSplits()

      expect(store.splits.map((split) => split.seconds)).toEqual(times)
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([])
    })

    it('follows the settings live, with no split changed', () => {
      const store = openTwoGaps()

      // The 2 s gap is dropped; the 3 s gap stays.
      store.setMinimumGapLength(2.5)
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([
        expect.closeTo(3.5, 9),
      ])

      store.setSilenceThreshold(-60)
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([])
      expect(store.splits).toEqual([])
    })

    it('adds nothing for a lead-in or a run-out gap', () => {
      const curve = curveOf([QUIET, 50], [LOUD, 100], [QUIET, 50])
      const store = useSplitStore()
      store.open(curve, timing(curve))

      expect(store.gaps.map((gap) => gap.edge)).toEqual(['lead-in', 'run-out'])
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([])
    })

    it('skips a gap that already holds a split, wherever the split is in it', () => {
      const store = openTwoGaps()
      // The first gap is 2 s to 5 s: a split at 2.5 s is inside it, off its middle.
      store.moveZoomTo(3)
      store.addSplitAt(2.5)

      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([
        expect.closeTo(26, 9),
      ])
    })

    it('skips a middle less than 1 s from a split, and adds it again once the split is gone', () => {
      // 4.6 s with a 0.6 s gap from 2 s to 2.6 s, whose middle is 2.3 s.
      const curve = curveOf([LOUD, 40], [QUIET, 12], [LOUD, 40])
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.setMinimumGapLength(0.5)
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([
        expect.closeTo(2.3, 9),
      ])

      // A split at 2.9 s is outside the gap and 0.6 s from its middle.
      store.addSplitAt(2.9)
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([])

      store.deleteSplit(store.splits[0]!.id)
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([
        expect.closeTo(2.3, 9),
      ])
    })

    it('skips a middle less than 1 s from the end of the file', () => {
      // 2 s with a 0.6 s gap from 1 s to 1.6 s: its middle is 0.7 s from the end.
      const curve = curveOf([LOUD, 20], [QUIET, 12], [LOUD, 8])
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.setMinimumGapLength(0.5)

      expect(store.gaps).toHaveLength(1)
      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([])
    })

    it('keeps every split and name, the selection, the window and the view', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.moveZoomTo(5)
      store.addSplitAt(5.5)
      store.renameTrack(null, 'Opening')
      store.selectSplit(store.splits[0]!.id)
      store.setRange(1, 5)
      const before = { ...store.splits[0]! }

      store.findSplits()

      expect(store.splits).toHaveLength(3)
      expect(store.splits.find((split) => split.id === before.id)).toEqual(before)
      expect(store.firstTrackName).toBe('Opening')
      expect(store.selectedSplit?.id).toBe(before.id)
      expect(store.zoomCentreSeconds).toBe(5.5)
      expect(store.view).toBe('range')
    })

    it('adds splits that are no edit, until one is moved or deleted', () => {
      const store = openTwoGaps()

      store.findSplits()
      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)

      store.selectSplit(store.splits[0]!.id)
      store.moveSplit(store.splits[0]!.id, 3.6)
      expect(store.editCount).toBe(1)

      store.deleteSplit(store.splits[1]!.id)
      expect(store.editCount).toBe(2)
    })

    it('adds splits that a later press does not double', () => {
      const store = openTwoGaps()

      store.findSplits()
      store.findSplits()

      expect(store.splits).toHaveLength(2)
    })

    describe('the depth setting', () => {
      it('starts at 15 dB, which a dip of 16 dB reaches and one of 17 dB does not', () => {
        const store = openCurve(shallowDip())

        expect(store.depthSetting).toBe(15)
        expect(store.gaps).toEqual([])
        expect(seconds(store)).toHaveLength(1)

        store.setDepthSetting(16.5)
        expect(seconds(store)).toEqual([])
      })

      it('shows what a press would add as it moves, and changes no split, name or selection', () => {
        const store = openCurve(shallowDip())
        store.renameTrack(null, 'Opening')
        const selection = store.selectedTrack?.number
        store.setDepthSetting(30)
        expect(store.proposedSplits).toEqual([])

        store.setDepthSetting(3)

        expect(store.proposedSplits.length).toBeGreaterThan(0)
        expect(store.splits).toEqual([])
        expect(store.firstTrackName).toBe('Opening')
        expect(store.selectedTrack?.number).toBe(selection)
        expect(store.editCount).toBe(1)
      })

      it('is held to the slider: 3 to 30 dB', () => {
        const store = openCurve(shallowDip())

        store.setDepthSetting(1)
        expect(store.depthSetting).toBe(3)

        store.setDepthSetting(99)
        expect(store.depthSetting).toBe(30)
      })

      it('marks the proposals of dips, and not those of gaps', () => {
        const store = openCurve(
          curveOf([LOUD, 400], [-26, 80], [LOUD, 400], [QUIET, 60], [LOUD, 400]),
        )

        expect(store.proposedSplits.map((proposal) => proposal.kind)).toEqual(['dip', 'gap'])
      })
    })

    describe('the confidence of a split', () => {
      it('is the band of the depth, sure for a gap, set by Find splits', () => {
        const store = openCurve(threeDepths())
        store.setDepthSetting(3)

        store.findSplits()

        expect(store.splits.map((split) => split.confidence?.band)).toEqual([
          'sure',
          'likely',
          'doubtful',
        ])
        expect(store.splits[1]?.confidence?.depth).toBeCloseTo(12, 3)
        expect(store.splits[2]?.confidence?.depth).toBeCloseTo(6, 3)
      })

      it('has its depth and no contrast for a gap or a dip split', () => {
        const store = openCurve(threeDepths())
        store.setDepthSetting(3)

        store.findSplits()

        expect(store.splits.map((split) => split.confidence?.contrast)).toEqual([null, null, null])
      })

      it('is none for a split added by hand, from a pending split or from the Range view', () => {
        const curve = farGaps()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.addSplitAt(5)
        store.selectTrack(store.tracks[1]!)
        store.placeTrackMark(50)
        store.addPendingSplit(50, true)
        store.applyPendingSplits()

        expect(store.splits.map((split) => split.confidence)).toEqual([null, null])
      })

      it('is set once: a later change of the depth leaves it', () => {
        const store = openCurve(threeDepths())
        store.setDepthSetting(3)
        store.findSplits()
        const before = store.splits.map((split) => split.confidence)

        store.setDepthSetting(30)
        store.setSilenceThreshold(-60)

        expect(store.splits.map((split) => split.confidence)).toEqual(before)
      })

      it('goes when the split is moved, with no edit beyond the move', () => {
        const store = openCurve(threeDepths())
        store.setDepthSetting(3)
        store.findSplits()
        const moved = store.splits[1]!
        store.selectSplit(moved.id)

        store.moveSplit(moved.id, moved.seconds + 0.5)

        expect(moved.confidence).toBeNull()
        expect(store.splits[0]?.confidence?.band).toBe('sure')
        expect(store.editCount).toBe(1)
      })

      it('is kept by the splits that stay when a track is removed, and goes with a deleted split', () => {
        const store = openCurve(threeDepths())
        store.setDepthSetting(3)
        store.findSplits()

        // Track 2 runs from the first split to the second: removing it deletes both.
        store.removeTrack(store.tracks[1]!)
        expect(store.splits.map((split) => split.confidence?.band)).toEqual(['doubtful'])

        store.deleteSplit(store.splits[0]!.id)
        expect(store.splits).toEqual([])
      })
    })

    describe('going through by confidence', () => {
      it('walks the splits with a confidence, least deep first', () => {
        const store = openWithFourDepths()
        expect(depths(store)).toEqual(['6', '12', '9', '40'])
        const walked: (string | undefined)[] = []

        while (store.selectAdjacentByConfidence(1)) {
          walked.push(store.selectedSplit?.confidence?.depth?.toFixed(0))
        }

        expect(walked).toEqual(['6', '9', '12', '40'])
      })

      it('goes to the first from none and to the last backwards from none', () => {
        const store = openWithFourDepths()

        store.selectAdjacentByConfidence(-1)
        expect(store.selectedSplit?.confidence?.depth?.toFixed(0)).toBe('40')

        store.moveZoomTo(1)
        store.selectTrack(store.tracks[0]!)
        store.selectAdjacentByConfidence(1)
        expect(store.selectedSplit?.confidence?.depth?.toFixed(0)).toBe('6')
      })

      it('goes to the first from a split with no confidence, and opens the Split view', () => {
        const store = openWithFourDepths()
        store.addSplitAt(10)
        const manual = store.splits.find((split) => split.confidence === null)!
        store.selectSplit(manual.id)
        store.showView('track')

        store.selectAdjacentByConfidence(1)

        expect(store.selectedSplit?.confidence?.depth?.toFixed(0)).toBe('6')
        expect(store.view).toBe('split')
      })

      it('stops at either end of the order', () => {
        const store = openWithFourDepths()
        store.selectAdjacentByConfidence(1)

        expect(store.selectAdjacentByConfidence(-1)).toBe(false)
        expect(store.selectedSplit?.confidence?.depth?.toFixed(0)).toBe('6')
      })

      it('breaks a tie by time', () => {
        const curve = curveOf([LOUD, 400], [-16, 80], [LOUD, 400], [-16, 80], [LOUD, 400])
        const store = openCurve(curve)
        store.setDepthSetting(3)
        store.findSplits()

        store.selectAdjacentByConfidence(1)
        const first = store.selectedSplit!.seconds
        store.selectAdjacentByConfidence(1)

        expect(store.selectedSplit!.seconds).toBeGreaterThan(first)
      })

      it('does nothing when no split has a confidence', () => {
        const store = openCurve(curveOf([LOUD, 400], [QUIET, 60], [LOUD, 400]))
        store.addSplitAt(10)

        expect(store.selectAdjacentByConfidence(1)).toBe(false)
        expect(store.selectAdjacentByConfidence(-1)).toBe(false)
        expect(store.selectedSplit).toBeNull()
      })

      it('lets a moved split leave the walk', () => {
        const store = openWithFourDepths()
        store.selectAdjacentByConfidence(1)
        store.moveSplit(store.selectedSplit!.id, store.selectedSplit!.seconds + 0.5)

        store.selectAdjacentByConfidence(1)

        expect(store.selectedSplit?.confidence?.depth?.toFixed(0)).toBe('9')
      })

      describe('marking a split checked', () => {
        it('clears its confidence, keeps its place and counts one edit', () => {
          const store = openWithFourDepths()
          store.selectAdjacentByConfidence(1)
          const { id, seconds } = store.selectedSplit!

          store.markChecked()

          const checked = store.splits.find((split) => split.id === id)!
          expect(checked.confidence).toBeNull()
          expect(checked.seconds).toBe(seconds)
          expect(store.editCount).toBe(1)
          store.selectAdjacentByConfidence(1)
          expect(store.selectedSplit?.confidence?.depth?.toFixed(0)).toBe('9')
        })

        it('counts once when pressed again, and does nothing for a split with no confidence', () => {
          const store = openWithFourDepths()
          store.selectAdjacentByConfidence(1)
          store.markChecked()
          store.markChecked()
          store.addSplitAt(10)
          store.selectSplit(store.splits.find((split) => split.confidence === null)!.id)
          store.markChecked()

          expect(store.editCount).toBe(2)
        })

        it('does nothing with no split selected', () => {
          const store = openWithFourDepths()

          store.markChecked()

          expect(store.editCount).toBe(0)
        })
      })
    })

    describe('dips and one split per boundary', () => {
      it('proposes a split in a silence shorter than the minimum gap length', () => {
        // 1.5 s of quiet from 20 s to 21.5 s: no gap at the default 2 s, but a dip 40 dB deep.
        const store = openCurve(curveOf([LOUD, 400], [QUIET, 30], [LOUD, 400]))

        expect(store.gaps).toEqual([])
        expect(seconds(store)).toHaveLength(1)
        expect(seconds(store)[0]).toBeGreaterThan(20)
        expect(seconds(store)[0]).toBeLessThan(21.5)

        store.findSplits()

        expect(store.splits).toHaveLength(1)
        expect(store.tracks).toHaveLength(2)
      })

      it('proposes nothing for a quiet passage shallower than the depth', () => {
        // 5 s that are 10 dB under the music, short of 15 dB, and not under the threshold.
        const store = openCurve(curveOf([LOUD, 400], [-20, 100], [LOUD, 400]))

        expect(seconds(store)).toEqual([])
      })

      it('splits a long silence at its middle, where no window is deep', () => {
        // 60 s of silence from 75 s to 135 s: the loudness around is the silence itself.
        const store = openCurve(curveOf([LOUD, 1500], [QUIET, 1200], [LOUD, 1500]))

        expect(seconds(store)).toEqual([expect.closeTo(105, 9)])
      })

      it("gives a gap and the dip inside it one split, at the gap's middle", () => {
        const store = openCurve(curveOf([LOUD, 400], [QUIET, 60], [LOUD, 400]))

        expect(store.gaps).toHaveLength(1)
        expect(seconds(store)).toEqual([expect.closeTo(21.5, 9)])
      })

      it("gives two gaps around a short sound one split, at the deeper gap's middle", () => {
        // Gaps of 2.5 s (20 s to 22.5 s) and 4 s (25.5 s to 29.5 s), the second one quieter.
        const store = openCurve(
          curveOf([LOUD, 400], [QUIET, 50], [LOUD, 60], [-58, 80], [LOUD, 400]),
        )

        expect(store.gaps).toHaveLength(2)
        expect(seconds(store)).toEqual([expect.closeTo(27.5, 9)])
      })

      it('gives each of two boundaries that are 15 s apart a split', () => {
        // Gap middles at 21.25 s and 36.25 s.
        const store = openCurve(
          curveOf([LOUD, 400], [QUIET, 50], [LOUD, 250], [QUIET, 50], [LOUD, 400]),
        )

        expect(seconds(store)).toEqual([expect.closeTo(21.25, 9), expect.closeTo(36.25, 9)])
      })

      it('proposes nothing within 15 s of a split, and what is further off stays', () => {
        const curve = farGaps()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.addSplitAt(30)

        // Split 22 s and 42 s are 8 s and 12 s from the split at 30 s.
        expect(seconds(store)).toEqual([])

        store.deleteSplit(store.splits[0]!.id)
        store.addSplitAt(5)

        expect(seconds(store)).toEqual([expect.closeTo(22, 9), expect.closeTo(42, 9)])
      })

      it('proposes no dip near the middle of a gap that holds a split, far as the split may be', () => {
        // Room noise from 20 s to 38 s, quietest near its end, and a split at 20.6 s.
        const curve = curveOf([LOUD, 400], [QUIET, 320], [-58, 30], [QUIET, 10], [LOUD, 400])
        const store = openCurve(curve)
        expect(seconds(store)).toEqual([expect.closeTo(29, 9)])

        store.addSplitAt(20.6)

        expect(seconds(store)).toEqual([])
      })

      it('proposes no dip in the first or last 10 s of the file', () => {
        // A 1.5 s silence at 5 s, and one 5 s before the end: under 10 s from each edge.
        const first = openCurve(curveOf([LOUD, 100], [QUIET, 30], [LOUD, 500]))
        const last = openCurve(curveOf([LOUD, 500], [QUIET, 30], [LOUD, 100]))

        expect(first.gaps).toEqual([])
        expect(seconds(first)).toEqual([])
        expect(seconds(last)).toEqual([])
      })
    })

    describe('with pending splits', () => {
      it('asks first when a split would land inside the selected track', () => {
        const store = openWithPending()

        store.findSplits()

        expect(store.discardQuestion).toEqual({ pendingCount: 1 })
        expect(store.splits).toEqual([])
      })

      it('adds the splits and drops the pending splits after "Discard"', () => {
        const store = openWithPending()
        store.findSplits()

        store.discardPending()

        expect(store.splits).toHaveLength(2)
        expect(store.pendingSplits).toEqual([])
      })

      it('adds the pending split first, then the gaps, after "Apply first"', () => {
        const store = openWithPending()
        store.findSplits()

        store.applyFirst()

        expect(store.splits.map((split) => split.seconds)).toEqual([
          5,
          expect.closeTo(22, 9),
          expect.closeTo(42, 9),
        ])
      })

      it('adds nothing and keeps the pending splits after "Cancel"', () => {
        const store = openWithPending()
        store.findSplits()

        store.cancelDiscard()

        expect(store.splits).toEqual([])
        expect(store.pendingSplits).toEqual([5])
      })

      it('asks nothing when every split would land outside the selected track', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        // A split inside the third gap holds it, so Find splits adds 22 s and 42 s, in track 1.
        store.addSplitAt(62)
        store.selectTrack(store.tracks[1]!)
        store.placeTrackMark(70)
        store.addPendingSplit(70, true)

        store.findSplits()

        expect(store.discardQuestion).toBeNull()
        expect(store.splits).toHaveLength(3)
        expect(store.pendingSplits).toEqual([70])
      })

      it('checks the room again when the held press runs', () => {
        const store = openWithPending()
        store.findSplits()
        // "Apply first" adds the pending split at 5 s, which is over 15 s from both middles.
        store.applyFirst()

        expect(store.splits).toHaveLength(3)
        expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([])
      })
    })
  })

  describe('Clear splits', () => {
    it('is disabled with no split, and enabled with one', () => {
      const store = openTwoGaps()
      expect(store.canClearSplits).toBe(false)

      store.findSplits()
      expect(store.canClearSplits).toBe(true)

      store.clearSplits()
      expect(store.canClearSplits).toBe(false)
    })

    it('deletes every split and name, and clears the edits and the pending splits', () => {
      const store = editedStore()
      store.selectTrack(store.tracks[1]!)
      store.placeTrackMark(store.tracks[1]!.startSeconds + 5)
      store.addPendingSplit(store.tracks[1]!.startSeconds + 5, true)

      store.clearSplits()

      expect(store.splits).toEqual([])
      expect(store.tracks).toHaveLength(1)
      expect(store.tracks[0]?.ownName).toBeNull()
      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
      expect(store.pendingSplits).toEqual([])
      expect(store.selectedPendingSplit).toBeNull()
      expect(store.trackMarkSeconds).toBeNull()
    })

    it('keeps the prefix, the range and the settings, and the gaps with them', () => {
      const store = editedStore()
      store.setTrackNamePrefix('set-')
      store.setRange(10, 30)
      store.setSilenceThreshold(-30)
      store.setMinimumGapLength(1.5)
      const gaps = store.gaps

      store.clearSplits()

      expect(store.trackNamePrefix).toBe('set-')
      expect(store.range).toEqual({ startSeconds: 10, endSeconds: 30 })
      expect(store.silenceThreshold).toBe(-30)
      expect(store.minimumGapLength).toBe(1.5)
      expect(store.gaps).toBe(gaps)
      expect(store.tracks[0]?.name).toBe('set-01')
    })

    it('selects track 1 and shows the Track view, with the window at the start', () => {
      const store = loadedStore()
      store.selectSplit(store.splits[1]!.id)

      store.clearSplits()

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.selectedSplit).toBeNull()
      expect(store.view).toBe('track')
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
    })

    it('keeps the Range view when it is on show, with track 1 selected behind it', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      store.showView('range')

      store.clearSplits()

      expect(store.view).toBe('range')
      expect(store.selectedTrack).toBe(store.tracks[0])
    })

    it('leaves Find splits able to add the splits again', () => {
      const store = openTwoGaps()
      store.findSplits()

      store.clearSplits()

      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toHaveLength(2)
    })
  })

  describe('the default settings', () => {
    it('are the built-in ones at first: 18 dB under the median and 2 s', () => {
      const store = useSplitStore()
      openFile(store, loudFile())

      expect(store.silenceThreshold).toBe(-28)
      expect(store.minimumGapLength).toBe(2)
      expect(store.currentOffsetDb).toBe(18)
      expect(store.matchesDefaultSettings).toBe(true)
      expect(store.areDefaultSettingsBuiltIn).toBe(true)
    })

    it('are saved as a distance under the median, so a quieter file gets a quieter threshold', () => {
      const store = useSplitStore()
      openFile(store, loudFile())
      store.setSilenceThreshold(-25.5)
      store.setMinimumGapLength(1.4)

      store.saveAsDefault()
      openFile(store, quietFile())

      // 15.5 dB under the quieter file's median of -20 dB.
      expect(store.silenceThreshold).toBe(-35.5)
      expect(store.minimumGapLength).toBeCloseTo(1.4, 9)
      expect(store.matchesDefaultSettings).toBe(true)
    })

    it('are kept for a fresh store, as after a reload', () => {
      const first = useSplitStore()
      openFile(first, loudFile())
      first.setSilenceThreshold(-30)
      first.saveAsDefault()

      setActivePinia(createPinia())
      const second = useSplitStore()
      openFile(second, loudFile())

      expect(second.silenceThreshold).toBe(-30)
      expect(second.areDefaultSettingsBuiltIn).toBe(false)
    })

    it('say what a save would keep, and whether the sliders already match them', () => {
      const store = useSplitStore()
      openFile(store, loudFile())
      expect(store.matchesDefaultSettings).toBe(true)

      store.setSilenceThreshold(-31.2)
      expect(store.currentOffsetDb).toBeCloseTo(21.2, 9)
      expect(store.matchesDefaultSettings).toBe(false)

      store.setSilenceThreshold(-28)
      store.setMinimumGapLength(2.1)
      expect(store.matchesDefaultSettings).toBe(false)

      store.saveAsDefault()
      expect(store.matchesDefaultSettings).toBe(true)
    })

    it('are the built-in ones again after "Restore built-in", which moves this file’s sliders too', () => {
      const store = useSplitStore()
      openFile(store, loudFile())
      store.setSilenceThreshold(-40)
      store.setMinimumGapLength(3)
      store.saveAsDefault()
      expect(store.areDefaultSettingsBuiltIn).toBe(false)
      store.setSilenceThreshold(-20)

      store.restoreBuiltIn()

      expect(store.silenceThreshold).toBe(-28)
      expect(store.minimumGapLength).toBe(2)
      expect(store.areDefaultSettingsBuiltIn).toBe(true)
      expect(store.matchesDefaultSettings).toBe(true)
      // A later file starts from the built-in ones, and so does a fresh store.
      setActivePinia(createPinia())
      const fresh = useSplitStore()
      openFile(fresh, loudFile())
      expect(fresh.silenceThreshold).toBe(-28)
    })

    it('find the gaps again when restored, and change no split, name or edit when saved or restored', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.renameTrack(null, 'Opening')
      store.setSilenceThreshold(-60)
      expect(store.gaps).toEqual([])

      store.saveAsDefault()
      store.restoreBuiltIn()

      expect(store.gaps).toHaveLength(2)
      expect(store.splits).toHaveLength(2)
      expect(store.firstTrackName).toBe('Opening')
      expect(store.editCount).toBe(1)
    })

    it('hold the depth too: 15 dB at first, saved with the others and used by the next file', () => {
      const store = useSplitStore()
      openFile(store, loudFile())
      expect(store.depthSetting).toBe(DEFAULT_DEPTH_DB)
      expect(store.matchesDefaultSettings).toBe(true)

      store.setDepthSetting(11.5)
      expect(store.matchesDefaultSettings).toBe(false)

      store.saveAsDefault()
      expect(store.matchesDefaultSettings).toBe(true)
      expect(store.areDefaultSettingsBuiltIn).toBe(false)
      openFile(store, quietFile())
      expect(store.depthSetting).toBe(11.5)

      store.restoreBuiltIn()
      expect(store.depthSetting).toBe(15)
      expect(store.areDefaultSettingsBuiltIn).toBe(true)
    })

    it('start a version 1 entry, which has no depth, at 15 dB', () => {
      localStorage.setItem(
        DEFAULT_SETTINGS_STORAGE_KEY,
        '{"version":1,"offsetDb":12,"minimumGapSeconds":3}',
      )

      const store = useSplitStore()
      openFile(store, loudFile())

      expect(store.silenceThreshold).toBe(-22)
      expect(store.minimumGapLength).toBe(3)
      expect(store.depthSetting).toBe(15)
    })

    it('hold a saved threshold to the slider’s range for a file of another loudness', () => {
      localStorage.setItem(
        DEFAULT_SETTINGS_STORAGE_KEY,
        '{"version":1,"offsetDb":60,"minimumGapSeconds":2}',
      )

      const store = useSplitStore()
      openFile(store, loudFile())
      expect(store.silenceThreshold).toBe(-60)

      localStorage.setItem(
        DEFAULT_SETTINGS_STORAGE_KEY,
        '{"version":1,"offsetDb":-30,"minimumGapSeconds":2}',
      )
      setActivePinia(createPinia())
      const raised = useSplitStore()
      openFile(raised, loudFile())
      expect(raised.silenceThreshold).toBe(0)
    })

    it.each([
      ['nothing saved', null],
      ['text that is no JSON', 'loud'],
      ['an offset off the 0.1 grid', '{"version":1,"offsetDb":18.25,"minimumGapSeconds":2}'],
      ['a minimum gap length out of range', '{"version":1,"offsetDb":12,"minimumGapSeconds":9}'],
      ['another version', '{"version":3,"offsetDb":12,"minimumGapSeconds":3,"depthDb":9}'],
      ['a depth out of range', '{"version":2,"offsetDb":12,"minimumGapSeconds":3,"depthDb":40}'],
    ])('are the built-in ones for %s', (_, saved) => {
      if (saved !== null) localStorage.setItem(DEFAULT_SETTINGS_STORAGE_KEY, saved)

      const store = useSplitStore()
      openFile(store, loudFile())

      expect(store.silenceThreshold).toBe(-28)
      expect(store.minimumGapLength).toBe(DEFAULT_MINIMUM_GAP_SECONDS)
    })

    it('work with blocked storage: the built-in ones, and a save that lasts for the visit', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlocked)
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlocked)
      const store = useSplitStore()
      openFile(store, loudFile())
      expect(store.silenceThreshold).toBe(-28)

      store.setSilenceThreshold(-35)
      store.saveAsDefault()
      openFile(store, quietFile())

      // 25 dB under the quieter file's median of -20 dB.
      expect(store.silenceThreshold).toBe(-45)
      expect(store.areDefaultSettingsBuiltIn).toBe(false)
    })

    it('stay when the store is reset, and are not saved before a file opens', () => {
      const store = useSplitStore()
      store.saveAsDefault()
      expect(localStorage.getItem(DEFAULT_SETTINGS_STORAGE_KEY)).toBeNull()

      openFile(store, loudFile())
      store.setSilenceThreshold(-30)
      store.saveAsDefault()
      store.reset()

      expect(store.areDefaultSettingsBuiltIn).toBe(false)
    })
  })

  describe('leaving a track out', () => {
    // `loadedStore` has three tracks: 0–22 s, 22–42 s and 42–60 s.
    it('starts with every track included, each with its place as its export number', () => {
      const store = loadedStore()

      expect(inclusions(store)).toEqual(['included', 'included', 'included'])
      expect(store.tracks.map((track) => track.isLeftOut)).toEqual([false, false, false])
      expect(store.tracks.map((track) => track.exportNumber)).toEqual([1, 2, 3])
      expect(store.exportTrackCount).toBe(3)
    })

    it('leaves out the track that starts at a split, and brings it back, changing no split or name', () => {
      const store = loadedStore()
      store.renameTrack(store.splits[0]!.id, 'Middle')
      const before = store.splits.map((point) => ({ ...point, inclusion: 'included' }))

      store.toggleLeftOut(store.splits[0]!.id)

      expect(inclusions(store)).toEqual(['included', 'by-hand', 'included'])
      expect(store.tracks[1]).toMatchObject({ isLeftOut: true, ownName: 'Middle' })
      expect(store.splits.map((point) => ({ ...point, inclusion: 'included' }))).toEqual(before)

      store.toggleLeftOut(store.splits[0]!.id)
      expect(inclusions(store)).toEqual(['included', 'included', 'included'])
    })

    it('leaves the first track out too, which has no split to sit on', () => {
      const store = loadedStore()

      store.toggleLeftOut(null)

      expect(inclusions(store)).toEqual(['by-hand', 'included', 'included'])
      expect(store.exportTrackCount).toBe(2)
    })

    it('does nothing for a split that is gone', () => {
      const store = loadedStore()

      store.toggleLeftOut(999)

      expect(inclusions(store)).toEqual(['included', 'included', 'included'])
      expect(store.editCount).toBe(0)
    })

    it('numbers the tracks written 1 to K, padded to K, and the left-out track gets none', () => {
      const store = loadedStore()
      store.setTrackNamePrefix('set-')

      store.toggleLeftOut(store.splits[0]!.id)

      expect(store.tracks.map((track) => track.exportNumber)).toEqual([1, null, 2])
      expect(store.tracks.map((track) => track.name)).toEqual(['set-01', 'set-', 'set-02'])
      // The place in the file stays: `number` and the name the Track view titles by.
      expect(store.tracks.map((track) => track.number)).toEqual([1, 2, 3])
      expect(store.tracks.map((track) => track.placeName)).toEqual(['set-01', 'set-02', 'set-03'])
    })

    it('pads the export numbers to the count written, not to the count of tracks', () => {
      // A 0.3 s gap every 15 s, the closest two splits can be: 103 inner gaps, so 104 tracks.
      const curve = Float32Array.from({ length: 31_000 }, (_, index) =>
        index % 300 < 6 ? QUIET : LOUD,
      )
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.setMinimumGapLength(0.2)
      store.findSplits()
      expect(store.tracks.length).toBeGreaterThan(99)

      // Leave out all but the first two: two files are written, so their numbers have two digits.
      for (const track of store.tracks.slice(2)) store.toggleLeftOut(track.startSplit?.id ?? null)

      expect(store.tracks.slice(0, 2).map((track) => track.name)).toEqual(['01', '02'])
    })

    it('keeps the own name of a left-out track as it is', () => {
      const store = loadedStore()
      store.renameTrack(store.splits[0]!.id, 'Interlude')

      store.toggleLeftOut(store.splits[0]!.id)

      expect(store.tracks[1]?.name).toBe('Interlude')
      expect(store.tracks[1]?.placeName).toBe('Interlude')
    })

    it('counts as one edit', () => {
      const store = loadedStore()

      store.toggleLeftOut(store.splits[0]!.id)

      expect(store.editCount).toBe(1)
      expect(store.hasEdits).toBe(true)
    })

    it('keeps its state with the track when a split moves', () => {
      const store = loadedStore()
      store.toggleLeftOut(store.splits[0]!.id)
      store.selectSplit(store.splits[0]!.id)

      store.moveSplit(store.splits[0]!.id, 23)

      expect(inclusions(store)).toEqual(['included', 'by-hand', 'included'])
      expect(store.tracks[1]?.startSeconds).toBe(23)
    })

    it('takes the state with a deleted split', () => {
      const store = loadedStore()
      store.toggleLeftOut(store.splits[0]!.id)

      store.deleteSplit(store.splits[0]!.id)

      expect(inclusions(store)).toEqual(['included', 'included'])
    })

    it('leaves "Remove track" merging the track into its neighbours, as it does', () => {
      const store = loadedStore()
      store.toggleLeftOut(null)

      store.removeTrack(store.tracks[1]!)

      // Both splits go, so the merged track is the first one, with its state.
      expect(store.tracks).toHaveLength(1)
      expect(store.tracks[0]?.isLeftOut).toBe(true)
    })

    it('is brought back by Clear splits, and forgotten by a new file', () => {
      const store = loadedStore()
      store.toggleLeftOut(null)
      store.toggleLeftOut(store.splits[1]!.id)

      store.clearSplits()
      expect(inclusions(store)).toEqual(['included'])
      expect(store.editCount).toBe(0)

      store.toggleLeftOut(null)
      store.reset()
      const curve = farGaps()
      store.open(curve, timing(curve))
      expect(inclusions(store)).toEqual(['included'])
    })

    it('says no track is written when every track is left out', () => {
      const store = loadedStore()

      for (const track of store.tracks) store.toggleLeftOut(track.startSplit?.id ?? null)

      expect(store.exportTrackCount).toBe(0)
      expect(store.tracks.map((track) => track.exportNumber)).toEqual([null, null, null])
    })
  })

  describe('the left-out state following the splits', () => {
    describe('a split added inside a left-out track', () => {
      it('makes two left-out tracks with Add split, at the window’s centre', () => {
        const store = withSecondTrackLeftOut()
        store.moveZoomTo(32)

        store.addSplit()

        expect(inclusions(store)).toEqual(['included', 'by-hand', 'by-hand', 'included'])
      })

      it('makes two left-out tracks at the mark in the Range view', () => {
        const store = withSecondTrackLeftOut()
        store.setRange(20, 40)
        store.placeMark(30)

        store.addSplitAtMark()

        expect(inclusions(store)).toEqual(['included', 'by-hand', 'by-hand', 'included'])
      })

      it('makes two left-out tracks at the playhead', () => {
        const store = withSecondTrackLeftOut()

        store.addSplitAt(30.004)

        expect(inclusions(store)).toEqual(['included', 'by-hand', 'by-hand', 'included'])
      })

      it('makes every track left out for each applied pending split', () => {
        const store = withSecondTrackLeftOut()
        store.selectTrack(store.tracks[1]!)
        store.placeTrackMark(27)
        store.addPendingSplit(27, false)
        store.addPendingSplit(36, false)

        store.applyPendingSplits()

        expect(inclusions(store)).toEqual(['included', 'by-hand', 'by-hand', 'by-hand', 'included'])
      })

      it('makes two left-out tracks when Find splits cuts a left-out track', () => {
        const curve = farGaps()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.toggleLeftOut(null)

        store.findSplits()

        expect(inclusions(store)).toEqual(['by-hand', 'by-hand', 'by-hand'])
      })

      it('also cuts the first track, which has no split to take the state from', () => {
        const store = loadedStore()
        store.toggleLeftOut(null)

        store.addSplitAt(10)

        expect(inclusions(store)).toEqual(['by-hand', 'by-hand', 'included', 'included'])
      })

      it('leaves an included track included, whatever its neighbours are', () => {
        const store = withSecondTrackLeftOut()

        store.addSplitAt(50)

        expect(inclusions(store)).toEqual(['included', 'by-hand', 'included', 'included'])
      })

      it('counts no edit for the state it inherits, only for the split the user added', () => {
        const store = withSecondTrackLeftOut()
        expect(store.editCount).toBe(1)

        store.addSplitAt(30)
        expect(store.editCount).toBe(2)

        store.findSplits()
        expect(store.editCount).toBe(2)
      })
    })

    describe('deleting the split between two tracks', () => {
      it('gives the merged track the earlier track’s state: left out', () => {
        const store = withSecondTrackLeftOut()

        // The split at 42 s ends the left-out track.
        store.deleteSplit(store.splits[1]!.id)

        expect(inclusions(store)).toEqual(['included', 'by-hand'])
      })

      it('gives the merged track the earlier track’s state: included', () => {
        const store = withSecondTrackLeftOut()

        // The split at 22 s starts the left-out track; the earlier track is included.
        store.deleteSplit(store.splits[0]!.id)

        expect(inclusions(store)).toEqual(['included', 'included'])
      })
    })

    describe('removing a track', () => {
      it('merges a middle track into its neighbours, which keep the earlier track’s state, and leaves the next track alone', () => {
        const store = fourTracks(['by-hand', 'included', 'included', 'by-hand'])

        store.removeTrack(store.tracks[1]!)

        // Tracks 1 to 3 are one track, left out as track 1 was; track 4 is as it was.
        expect(inclusions(store)).toEqual(['by-hand', 'by-hand'])
      })

      it('keeps an included first track’s state too', () => {
        const store = fourTracks(['included', 'by-hand', 'by-hand', 'included'])

        store.removeTrack(store.tracks[2]!)

        expect(inclusions(store)).toEqual(['included', 'by-hand'])
      })

      it('removes the last track, leaving the one before it as it was', () => {
        const store = fourTracks(['included', 'included', 'by-hand', 'by-hand'])

        store.removeTrack(store.tracks[3]!)

        expect(inclusions(store)).toEqual(['included', 'included', 'by-hand'])
      })

      it('moves the next track’s state to the file’s start when the first track is removed', () => {
        const store = fourTracks(['included', 'by-hand', 'included', 'included'])

        store.removeTrack(store.tracks[0]!)

        expect(inclusions(store)).toEqual(['by-hand', 'included', 'included'])
      })

      it('moves an included next track’s state to the file’s start, bringing a left-out first track back', () => {
        const store = fourTracks(['by-hand', 'included', 'by-hand', 'included'])

        store.removeTrack(store.tracks[0]!)

        expect(inclusions(store)).toEqual(['included', 'by-hand', 'included'])
      })

      it('counts a left-out file start as an edit when the next track took its state from a cut', () => {
        const store = fourTracks(['by-hand', 'included', 'included', 'included'])
        // A split added inside the left-out track 1 makes two left-out tracks, the new one no edit.
        store.addSplitAt(10)
        expect(inclusions(store)).toEqual([
          'by-hand',
          'by-hand',
          'included',
          'included',
          'included',
        ])

        store.removeTrack(store.tracks[0]!)

        // The file's start is left out, which the file did not open with: that is an edit.
        expect(inclusions(store)).toEqual(['by-hand', 'included', 'included', 'included'])
        // The added split went with its edit: the file's start is the only edit left.
        expect(store.editCount).toBe(1)
      })
    })
  })

  describe('selection and the zoom window', () => {
    it('selects track 1 and starts the window at the file’s start when detection ends', () => {
      const curve = farGaps()
      const store = useSplitStore()

      store.open(curve, timing(curve))
      store.findSplits()

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.selectedSplit).toBeNull()
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
    })

    it('opens the same way on a file with no gap, one track over the whole file', () => {
      const curve = curveOf([LOUD, 100])
      const store = useSplitStore()

      store.open(curve, timing(curve))
      store.findSplits()

      expect(store.tracks).toHaveLength(1)
      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.selectedSplit).toBeNull()
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
      expect(store.view).toBe('track')
    })

    it('selects a split and centres the window on it', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.selectSplit(store.splits[1]!.id)

      expect(store.selectedSplit).toBe(store.splits[1])
      expect(store.zoomCentreSeconds).toBeCloseTo(42, 9)
    })

    it('ignores an id that is no split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.selectSplit(-1)

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
    })

    it('moves the window to a time and selects nothing', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.moveZoomTo(31.5)

      expect(store.zoomCentreSeconds).toBe(31.5)
      expect(store.selectedSplit).toBeNull()
      expect(store.selectedSplit).toBeNull()
    })

    it('says which place in the order the selected split has, or null with none', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      expect(store.selectedSplitIndex).toBeNull()

      store.selectSplit(store.splits[0]!.id)
      expect(store.selectedSplitIndex).toBe(0)

      store.selectSplit(store.splits[1]!.id)
      expect(store.selectedSplitIndex).toBe(1)

      store.moveZoomTo(31.5)
      expect(store.selectedSplitIndex).toBeNull()
    })

    it('follows the selection to a split added between two others', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.moveZoomTo(31.5)
      store.addSplit()

      expect(store.selectedSplitIndex).toBe(1)
      expect(store.splits).toHaveLength(3)
    })

    it('selects a track, the first included, and clears the selected split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.selectTrack(store.tracks[2]!)

      expect(store.selectedSplit).toBeNull()
      expect(store.selectedTrack).toBe(store.tracks[2])

      store.selectTrack(store.tracks[0]!)

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.selectedSplit).toBeNull()
    })

    it('refuses a stale track, whose start split was deleted, and keeps the selection and view', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      const stale = store.tracks[2]!
      store.selectSplit(store.splits[0]!.id)
      store.deleteSplit(stale.startSplit!.id)

      store.selectTrack(stale)

      expect(store.selectedTrack).toBeNull()
      expect(store.selectedSplit).toBe(store.splits[0])
      expect(store.view).toBe('split')
    })

    it('selects no track before detection', () => {
      const curve = farGaps()
      const other = useSplitStore()
      other.open(curve, timing(curve))
      other.findSplits()
      const track = other.tracks[0]!
      other.reset()

      other.selectTrack(track)

      expect(other.selectedTrack).toBeNull()
      expect(other.view).toBe('split')
    })

    it('clears the selected track when a split is selected', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectTrack(store.tracks[1]!)

      store.selectSplit(store.splits[1]!.id)

      expect(store.selectedTrack).toBeNull()
      expect(store.selectedSplit).toBe(store.splits[1])
    })

    it('clears the selected track when the zoom window is moved', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectTrack(store.tracks[1]!)

      store.moveZoomTo(5)

      expect(store.selectedTrack).toBeNull()
    })

    it('does not move the zoom window when a track is selected', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.moveZoomTo(31.5)

      store.selectTrack(store.tracks[2]!)

      expect(store.zoomCentreSeconds).toBe(31.5)
    })

    it('has no selected track before detection', () => {
      const store = useSplitStore()

      expect(store.selectedTrack).toBeNull()
    })

    it('follows the selected track as the split where it starts moves', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      // A split moves only inside the window, and selecting a track leaves the window where it is.
      store.moveZoomTo(22)
      store.selectTrack(store.tracks[1]!)

      store.moveSplit(store.splits[0]!.id, 24)

      expect(store.selectedTrack?.number).toBe(2)
      expect(store.selectedTrack?.startSeconds).toBe(24)
    })

    it('marks as selected only the selected track, the first included', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      // Detection selects the first track.
      expect(selectedTracks(store)).toEqual([true, false, false])

      store.selectTrack(store.tracks[1]!)
      expect(selectedTracks(store)).toEqual([false, true, false])

      store.selectTrack(store.tracks[2]!)
      expect(selectedTracks(store)).toEqual([false, false, true])

      store.selectSplit(store.splits[1]!.id)
      expect(selectedTracks(store)).toEqual([false, false, false])
    })

    it('leaves the selection and the window where they are after every setting change', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectSplit(store.splits[1]!.id)
      const centre = store.zoomCentreSeconds

      store.setMinimumGapLength(3)
      store.setSilenceThreshold(-45)

      expect(store.selectedSplit?.id).toBe(store.splits[1]!.id)
      expect(store.zoomCentreSeconds).toBe(centre)
      expect(store.splits).toHaveLength(2)
    })
  })

  describe('stepping to the next or previous split', () => {
    it('selects the next or previous split and centres the window on it', () => {
      const store = threeSplits()
      store.selectSplit(store.splits[1]!.id)

      expect(store.selectAdjacentSplit(1)).toBe(true)
      expect(store.selectedSplit).toBe(store.splits[2])
      expect(store.zoomCentreSeconds).toBeCloseTo(62, 9)

      expect(store.selectAdjacentSplit(-1)).toBe(true)
      expect(store.selectAdjacentSplit(-1)).toBe(true)
      expect(store.selectedSplit).toBe(store.splits[0])
    })

    it('stays at the first or last split', () => {
      const store = threeSplits()
      store.selectSplit(store.splits[2]!.id)
      expect(store.selectAdjacentSplit(1)).toBe(false)
      expect(store.selectedSplit).toBe(store.splits[2])

      store.selectSplit(store.splits[0]!.id)
      expect(store.selectAdjacentSplit(-1)).toBe(false)
      expect(store.selectedSplit).toBe(store.splits[0])
    })

    it('with none selected, steps from the window’s centre', () => {
      const store = threeSplits()
      store.moveZoomTo(50)
      expect(store.selectAdjacentSplit(1)).toBe(true)
      expect(store.selectedSplit).toBe(store.splits[2])

      store.moveZoomTo(50)
      expect(store.selectAdjacentSplit(-1)).toBe(true)
      expect(store.selectedSplit).toBe(store.splits[1])
    })

    it('looks strictly past the centre, so a split on it is neither next nor previous', () => {
      const store = threeSplits()
      store.moveZoomTo(42)
      expect(store.selectAdjacentSplit(1)).toBe(true)
      expect(store.selectedSplit).toBe(store.splits[2])

      store.moveZoomTo(42)
      expect(store.selectAdjacentSplit(-1)).toBe(true)
      expect(store.selectedSplit).toBe(store.splits[0])
    })

    it('does nothing with no split on that side of the centre, or none at all', () => {
      const store = threeSplits()
      store.moveZoomTo(70)
      expect(store.selectAdjacentSplit(1)).toBe(false)
      store.moveZoomTo(10)
      expect(store.selectAdjacentSplit(-1)).toBe(false)
      expect(store.selectedSplit).toBeNull()

      // A file with no gap has no split at all.
      store.reset()
      const curve = curveOf([LOUD, 100])
      store.open(curve, timing(curve))
      expect(store.splits).toEqual([])
      expect(store.selectAdjacentSplit(1)).toBe(false)
      expect(store.selectAdjacentSplit(-1)).toBe(false)
    })

    it('asks the discard question as a click does, with the track’s pending splits still there', () => {
      const store = pendingTwo()
      store.showView('split')

      expect(store.selectAdjacentSplit(1)).toBe(false)
      expect(heldState(store)).toEqual({ ...HELD, view: 'split' })

      store.discardPending()
      expect(store.pendingSplits).toEqual([])
      expect(store.selectedSplit).not.toBeNull()
    })
  })

  describe('stepping to the next or previous track', () => {
    it('selects the next or previous track', () => {
      const store = loadedStore()
      expect(store.selectedTrack).toBe(store.tracks[0])

      expect(store.selectAdjacentTrack(1)).toBe(true)
      expect(store.selectedTrack).toBe(store.tracks[1])

      expect(store.selectAdjacentTrack(-1)).toBe(true)
      expect(store.selectedTrack).toBe(store.tracks[0])
    })

    it('stays at the first or last track', () => {
      const store = loadedStore()
      expect(store.selectAdjacentTrack(-1)).toBe(false)
      expect(store.selectedTrack).toBe(store.tracks[0])

      store.selectTrack(store.tracks[2]!)
      expect(store.selectAdjacentTrack(1)).toBe(false)
      expect(store.selectedTrack).toBe(store.tracks[2])
    })

    it('does nothing with no track selected', () => {
      const store = loadedStore()
      store.selectSplit(store.splits[0]!.id)

      expect(store.selectAdjacentTrack(1)).toBe(false)
      expect(store.selectedSplit).toBe(store.splits[0])
    })

    it('asks the discard question as a click on the row does, and steps once it is answered', () => {
      const store = pendingTwo()

      expect(store.selectAdjacentTrack(1)).toBe(false)
      expect(heldState(store)).toEqual(HELD)

      store.discardPending()
      expect(store.selectedTrack?.number).toBe(3)
    })
  })

  describe('moving a split', () => {
    it('moves the split to the requested time and keeps its track name', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectSplit(store.splits[0]!.id)
      store.splits[0]!.name = 'Opening'

      store.moveSplit(store.splits[0]!.id, 23.34)

      expect(store.splits[0]!.seconds).toBeCloseTo(23.34, 9)
      expect(store.tracks[1]!.name).toBe('Opening')
      expect(store.tracks[1]!.startSeconds).toBeCloseTo(23.34, 9)
      expect(store.tracks[0]!.lengthSeconds).toBeCloseTo(23.34, 9)
    })

    it('does not recentre the window or change the selection', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectSplit(store.splits[0]!.id)

      store.moveSplit(store.splits[0]!.id, 25)

      expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
      expect(store.selectedSplit).toBe(store.splits[0])
    })

    it('stops at the window edges, 10 s either side of the centre', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectSplit(store.splits[0]!.id)
      const id = store.splits[0]!.id

      store.moveSplit(id, 40)
      expect(store.splits[0]!.seconds).toBeCloseTo(32, 9)

      store.moveSplit(id, 3)
      expect(store.splits[0]!.seconds).toBeCloseTo(12, 9)
    })

    it('stays 1 s from its neighbouring splits', () => {
      // The window on split 1 (3.5 s) runs from -6.5 s to 13.5 s, so it reaches split 2 (8 s).
      const store = closeSplitsStore()

      store.moveSplit(store.splits[0]!.id, 9)
      expect(store.splits[0]!.seconds).toBeCloseTo(7, 9)

      store.selectSplit(store.splits[1]!.id)
      store.moveSplit(store.splits[1]!.id, 0)
      expect(store.splits[1]!.seconds).toBeCloseTo(8, 9)
    })

    it('stays 1 s from the start and the end of the file', () => {
      const store = closeSplitsStore()

      store.moveSplit(store.splits[0]!.id, 0)
      expect(store.splits[0]!.seconds).toBeCloseTo(1, 9)

      store.selectSplit(store.splits[1]!.id)
      store.moveSplit(store.splits[1]!.id, 12)
      expect(store.splits[1]!.seconds).toBeCloseTo(11, 9)
    })

    it('never reorders the splits', () => {
      const store = closeSplitsStore()

      store.moveSplit(store.splits[1]!.id, 0)

      expect(store.splits[0]!.seconds).toBeLessThan(store.splits[1]!.seconds)
    })

    it('leaves a split where it was when it is outside the window', () => {
      // Split 1 is selected, the window is on 12 s to 32 s, and split 2 is at 42 s.
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.moveSplit(store.splits[1]!.id, 35)

      expect(store.splits[1]!.seconds).toBeCloseTo(42, 9)
    })

    it('leaves a split where it was when its limits cannot all be met', () => {
      // Splits 0.7 s apart: split 1 must be under 3.2 s to be 1 s from split 2, but it is at 3.5 s.
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.splits[1]!.seconds = 4.2

      store.moveSplit(store.splits[0]!.id, 3)
      expect(store.splits[0]!.seconds).toBeCloseTo(3.5, 9)

      store.moveSplit(store.splits[0]!.id, 2)
      expect(store.splits[0]!.seconds).toBeCloseTo(3.5, 9)
    })

    it('ignores an id that is no split', () => {
      const store = closeSplitsStore()

      store.moveSplit(-1, 5)

      expect(store.splits.map((split) => split.seconds)).toEqual([
        expect.closeTo(3.5, 9),
        expect.closeTo(8, 9),
      ])
    })
  })

  describe('adding a split', () => {
    it('adds an unnamed split at the window centre, in time order, and selects it', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.moveZoomTo(31.5)

      store.addSplit()

      expect(store.splits.map((split) => split.seconds)).toEqual([
        expect.closeTo(22, 9),
        31.5,
        expect.closeTo(42, 9),
      ])
      expect(store.splits[1]!.name).toBeNull()
      expect(store.selectedSplit).toBe(store.splits[1])
      expect(store.zoomCentreSeconds).toBe(31.5)
      expect(store.tracks.map((track) => track.name)).toEqual(['01', '02', '03', '04'])
    })

    it('does nothing when there is no room for it', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.moveZoomTo(22.5)

      store.addSplit()

      expect(store.splits).toHaveLength(2)
      expect(store.selectedSplit).toBeNull()
    })

    it('does nothing before detection', () => {
      const store = useSplitStore()

      store.addSplit()

      expect(store.splits).toEqual([])
    })

    it('keeps the names of renamed tracks while the unnamed ones renumber', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.splits[1]!.name = 'Encore'
      store.moveZoomTo(31.5)

      store.addSplit()

      expect(store.tracks.map((track) => track.name)).toEqual(['01', '02', '03', 'Encore'])
    })
  })

  describe('whether a split can be added', () => {
    it('is false before detection, and true on open ground between splits', () => {
      const store = useSplitStore()
      expect(store.canAddSplit).toBe(false)

      const curve = farGaps()
      store.open(curve, timing(curve))
      store.findSplits()
      store.moveZoomTo(31.5)

      expect(store.canAddSplit).toBe(true)
    })

    it('is false within 1 s of a split, and true at exactly 1 s', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectSplit(store.splits[0]!.id)

      // Split 1 is selected, so the centre is on it.
      expect(store.canAddSplit).toBe(false)

      store.moveZoomTo(22.9)
      expect(store.canAddSplit).toBe(false)

      store.moveZoomTo(21.1)
      expect(store.canAddSplit).toBe(false)

      store.moveZoomTo(23)
      expect(store.canAddSplit).toBe(true)

      store.moveZoomTo(21)
      expect(store.canAddSplit).toBe(true)
    })

    it('is false within 1 s of the start and of the end of the file, and true at exactly 1 s', () => {
      // 60 s long.
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.moveZoomTo(0.5)
      expect(store.canAddSplit).toBe(false)

      store.moveZoomTo(1)
      expect(store.canAddSplit).toBe(true)

      store.moveZoomTo(59.5)
      expect(store.canAddSplit).toBe(false)

      store.moveZoomTo(59)
      expect(store.canAddSplit).toBe(true)
    })

    it('is false when the window centre lies beyond the end of a short file', () => {
      // 5 s long, no split: the window starts at 10 s.
      const curve = curveOf([LOUD, 100])
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      expect(store.canAddSplit).toBe(false)
    })
  })

  describe('deleting a split', () => {
    it('removes the split and its track name, so the merged track keeps the earlier name', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.firstTrackName = 'Opening'
      store.splits[0]!.name = 'Middle'
      store.splits[1]!.name = 'Encore'

      store.deleteSplit(store.splits[0]!.id)

      expect(store.splits.map((split) => split.seconds)).toEqual([expect.closeTo(26, 9)])
      expect(store.tracks.map((track) => track.name)).toEqual(['Opening', 'Encore'])
      expect(store.tracks[0]!.lengthSeconds).toBeCloseTo(26, 9)
    })

    describe('the selection afterwards', () => {
      it('moves to the next split, centring the window on it, when the selected one goes', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()
        store.selectSplit(store.splits[1]!.id)

        store.deleteSplit(store.splits[1]!.id)

        expect(store.splits).toHaveLength(2)
        expect(store.selectedSplit).toBe(store.splits[1])
        expect(store.zoomCentreSeconds).toBeCloseTo(62, 9)
      })

      it('moves to the previous split when the selected one was the last', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()
        store.selectSplit(store.splits[2]!.id)

        store.deleteSplit(store.splits[2]!.id)

        expect(store.selectedSplit).toBe(store.splits[1])
        expect(store.zoomCentreSeconds).toBeCloseTo(42, 9)
      })

      it('selects nothing and leaves the window where it is when no split remains', () => {
        const curve = farGaps()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()
        store.selectSplit(store.splits[0]!.id)
        store.deleteSplit(store.splits[1]!.id)

        store.deleteSplit(store.splits[0]!.id)

        expect(store.splits).toEqual([])
        expect(store.selectedSplit).toBeNull()
        expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
      })

      it('keeps the selection and the window when another split is deleted', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()
        store.selectSplit(store.splits[0]!.id)
        const selected = store.splits[0]!

        store.deleteSplit(store.splits[2]!.id)

        expect(store.selectedSplit).toBe(selected)
        expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
      })
    })

    it('ignores an id that is no split', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.deleteSplit(-1)

      expect(store.splits).toHaveLength(2)
    })
  })

  describe('removing a track', () => {
    describe('which splits go', () => {
      it('deletes the splits at both ends of a middle track, which merges it with both neighbours', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[1]!)

        expect(store.splits.map((split) => split.seconds)).toEqual([expect.closeTo(62, 9)])
        expect(store.tracks.map((track) => [track.startSeconds, track.lengthSeconds])).toEqual([
          [0, expect.closeTo(62, 9)],
          [expect.closeTo(62, 9), expect.closeTo(18, 9)],
        ])
      })

      it('merges the first track into the next, deleting the one split it has', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[0]!)

        expect(store.splits.map((split) => split.seconds)).toEqual([
          expect.closeTo(42, 9),
          expect.closeTo(62, 9),
        ])
        expect(store.tracks[0]!.lengthSeconds).toBeCloseTo(42, 9)
      })

      it('merges the last track into the previous one, deleting the one split it has', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[3]!)

        expect(store.splits.map((split) => split.seconds)).toEqual([
          expect.closeTo(22, 9),
          expect.closeTo(42, 9),
        ])
        expect(store.tracks[2]!.lengthSeconds).toBeCloseTo(38, 9)
      })

      it('leaves one track when one of two is removed, and no split', () => {
        const curve = farGaps()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()
        store.deleteSplit(store.splits[1]!.id)

        store.removeTrack(store.tracks[0]!)

        expect(store.splits).toEqual([])
        expect(store.tracks).toHaveLength(1)
      })

      it('refuses the only track, whose removal would remove the file', () => {
        const curve = curveOf([LOUD, 100])
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()

        store.removeTrack(store.tracks[0]!)

        expect(store.tracks).toHaveLength(1)
        expect(store.editCount).toBe(0)
      })

      it('refuses a track whose start split is gone', () => {
        const store = namedFourTracks()
        const stale = store.tracks[2]!
        store.deleteSplit(stale.startSplit!.id)
        const edits = store.editCount

        store.removeTrack(stale)

        expect(store.splits).toHaveLength(2)
        expect(store.editCount).toBe(edits)
      })
    })

    describe('the names', () => {
      it('takes the removed track’s name with it, and the merged track keeps the previous name', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[1]!)

        expect(trackNames(store)).toEqual(['A', 'D'])
      })

      it('keeps the previous track’s name when the last track is removed', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[3]!)

        expect(trackNames(store)).toEqual(['A', 'B', 'C'])
      })

      it('moves the next track’s name to the file’s start when the first track is removed', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[0]!)

        expect(store.firstTrackName).toBe('B')
        expect(trackNames(store)).toEqual(['B', 'C', 'D'])
      })

      it('numbers the merged first track when the next track had no name', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()
        store.renameTrack(null, 'A')

        store.removeTrack(store.tracks[0]!)

        expect(store.firstTrackName).toBeNull()
        expect(trackNames(store)).toEqual(['01', '02', '03'])
        // The deleted split only: the next track had no name to move to the file's start.
        expect(store.editCount).toBe(1)
      })

      it('keeps the names of the tracks that were not merged', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[1]!)

        expect(store.tracks[1]!.name).toBe('D')
        expect(store.tracks[1]!.number).toBe(2)
      })

      it('counts the file’s start as renamed while it holds the next track’s name', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[0]!)

        // The deleted split, the file's start (now B), C and D.
        expect(store.editCount).toBe(4)
      })
    })

    describe('the selection afterwards', () => {
      it('is the merged track when the removed track was selected', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[1]!)

        store.removeTrack(store.tracks[1]!)

        expect(store.selectedTrack).toBe(store.tracks[0])
        expect(store.selectedTrack?.lengthSeconds).toBeCloseTo(62, 9)
        expect(store.view).toBe('track')
      })

      it('is the merged track when the next track was selected, whose start split goes', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[2]!)

        store.removeTrack(store.tracks[1]!)

        expect(store.selectedTrack).toBe(store.tracks[0])
      })

      it('is the merged track when the previous track was selected, now longer', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[0]!)

        store.removeTrack(store.tracks[1]!)

        expect(store.selectedTrack).toBe(store.tracks[0])
        expect(store.selectedTrack?.lengthSeconds).toBeCloseTo(62, 9)
      })

      it('stays on the first track, now longer, when it is selected and removed', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[0]!)

        store.removeTrack(store.tracks[0]!)

        expect(store.selectedTrack).toBe(store.tracks[0])
        expect(store.selectedTrack?.lengthSeconds).toBeCloseTo(42, 9)
      })

      it('is the merged first track when the second track is selected and the first is removed', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[1]!)

        store.removeTrack(store.tracks[0]!)

        expect(store.selectedTrack).toBe(store.tracks[0])
      })

      it('is the merged track, the previous one, when the last track is removed while selected', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[3]!)

        store.removeTrack(store.tracks[3]!)

        expect(store.selectedTrack).toBe(store.tracks[2])
        expect(store.selectedTrack?.lengthSeconds).toBeCloseTo(38, 9)
      })

      it('stays on a track that was not merged, which is renumbered', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[3]!)

        store.removeTrack(store.tracks[1]!)

        expect(store.selectedTrack).toBe(store.tracks[1])
        expect(store.selectedTrack?.name).toBe('D')
      })

      it('stays on a selected split that is not deleted', () => {
        const store = namedFourTracks()
        store.selectSplit(store.splits[2]!.id)
        const kept = store.splits[2]

        store.removeTrack(store.tracks[1]!)

        expect(store.selectedSplit).toBe(kept)
        expect(store.zoomCentreSeconds).toBeCloseTo(62, 9)
      })

      it('falls back to the neighbour, as a delete does, when the selected split is deleted', () => {
        const store = namedFourTracks()
        store.selectSplit(store.splits[0]!.id)

        store.removeTrack(store.tracks[1]!)

        expect(store.selectedSplit).toBe(store.splits[0])
        expect(store.selectedSplit?.seconds).toBeCloseTo(62, 9)
        expect(store.zoomCentreSeconds).toBeCloseTo(62, 9)
      })

      it('selects nothing when the one split goes and a split was selected', () => {
        const curve = farGaps()
        const store = useSplitStore()
        store.open(curve, timing(curve))
        store.findSplits()
        store.deleteSplit(store.splits[1]!.id)
        store.selectSplit(store.splits[0]!.id)

        store.removeTrack(store.tracks[0]!)

        expect(store.selection).toBeNull()
      })

      it('leaves nothing selected as it was', () => {
        const store = namedFourTracks()
        store.moveZoomTo(50)

        store.removeTrack(store.tracks[1]!)

        expect(store.selection).toBeNull()
        expect(store.view).toBe('split')
      })
    })
  })

  describe('renaming a track', () => {
    it('names the track that starts at a split, and the first track with null', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.renameTrack(store.splits[1]!.id, 'Encore')
      store.renameTrack(null, 'Opening')

      expect(store.tracks.map((track) => track.name)).toEqual(['Opening', '02', 'Encore'])
      expect(store.splits[1]!.name).toBe('Encore')
      expect(store.firstTrackName).toBe('Opening')
    })

    it('trims the name', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.renameTrack(store.splits[0]!.id, '  Intro \t')

      expect(store.splits[0]!.name).toBe('Intro')
    })

    it('falls back to the number when the name is empty after trimming', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.renameTrack(store.splits[0]!.id, 'Intro')
      store.renameTrack(null, 'Opening')

      store.renameTrack(store.splits[0]!.id, ' '.repeat(3))
      store.renameTrack(null, '')

      expect(store.splits[0]!.name).toBeNull()
      expect(store.firstTrackName).toBeNull()
      expect(store.tracks.map((track) => track.name)).toEqual(['01', '02', '03'])
    })

    it('keeps at most 100 characters, counted after trimming', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.renameTrack(store.splits[0]!.id, `  ${'a'.repeat(150)}`)

      expect(MAX_TRACK_NAME_LENGTH).toBe(100)
      expect(store.splits[0]!.name).toBe('a'.repeat(100))
    })

    it('ignores an id that is no split', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.renameTrack(-1, 'Ghost')

      expect(store.tracks.map((track) => track.name)).toEqual(['01', '02', '03'])
      expect(store.firstTrackName).toBeNull()
    })
  })

  describe('the track name prefix', () => {
    it('starts empty, so an unnamed track shows its padded number', () => {
      const { store } = storeWithTwoGaps()

      expect(store.trackNamePrefix).toBe('')
      expect(trackNames(store)).toEqual(['01', '02', '03'])
    })

    it('goes before the padded number of every unnamed track, with nothing between them', () => {
      const { store } = storeWithTwoGaps()

      store.setTrackNamePrefix('dreamscape-')
      expect(trackNames(store)).toEqual(['dreamscape-01', 'dreamscape-02', 'dreamscape-03'])

      store.setTrackNamePrefix('dreamscape ')
      expect(trackNames(store)).toEqual(['dreamscape 01', 'dreamscape 02', 'dreamscape 03'])
    })

    it('leaves a renamed track alone, whatever the prefix', () => {
      const { store } = storeWithTwoGaps()
      store.renameTrack(store.splits[0]!.id, 'Intro')

      store.setTrackNamePrefix('set-')

      expect(trackNames(store)).toEqual(['set-01', 'Intro', 'set-03'])
      expect(store.tracks.map((track) => track.ownName)).toEqual([null, 'Intro', null])
    })

    it('pads to the width of the track count, as the number alone does', () => {
      // 150 s, so 99 splits 1.5 s apart make 100 tracks, numbered from 001.
      const curve = curveOf([LOUD, 3000])
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      for (let index = 1; index <= 99; index++) store.addSplitAt(index * 1.5)

      store.setTrackNamePrefix('t')

      expect(store.tracks).toHaveLength(100)
      expect(trackNames(store).slice(0, 2)).toEqual(['t001', 't002'])
      expect(trackNames(store).at(-1)).toBe('t100')
    })

    it('is kept as typed: a space or a separator at its end stays', () => {
      const { store } = storeWithTwoGaps()

      store.setTrackNamePrefix('  a b - ')

      expect(store.trackNamePrefix).toBe('  a b - ')
    })

    it('keeps at most 100 characters', () => {
      const { store } = storeWithTwoGaps()

      store.setTrackNamePrefix('a'.repeat(150))

      expect(store.trackNamePrefix).toBe('a'.repeat(MAX_TRACK_NAME_LENGTH))
    })

    it('is no edit', () => {
      const { store } = storeWithTwoGaps()

      store.setTrackNamePrefix('set-')

      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
    })

    it('survives a change of either detection setting', () => {
      const { store } = storeWithTwoGaps()
      store.setTrackNamePrefix('set-')

      store.setSilenceThreshold(-40)
      expect(store.trackNamePrefix).toBe('set-')

      store.setMinimumGapLength(1)
      expect(store.trackNamePrefix).toBe('set-')
      expect(trackNames(store)[0]).toBe('set-01')
    })

    it('is forgotten on reset', () => {
      const { store } = storeWithTwoGaps()
      store.setTrackNamePrefix('set-')

      store.reset()

      expect(store.trackNamePrefix).toBe('')
    })
  })

  describe('the edit count', () => {
    it('is 0 after detection, and selecting or moving the window are not edits', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.selectSplit(store.splits[1]!.id)
      store.moveZoomTo(5)

      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
    })

    it('counts a moved split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectSplit(store.splits[0]!.id)

      store.moveSplit(store.splits[0]!.id, 23)

      expect(store.editCount).toBe(1)
      expect(store.hasEdits).toBe(true)
    })

    it('does not count a move that leaves the split where it was', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      // Split 2 is outside the window and does not move; split 1 is asked to go where it is.
      store.moveSplit(store.splits[1]!.id, 35)
      store.moveSplit(store.splits[0]!.id, store.splits[0]!.seconds)

      expect(store.editCount).toBe(0)
    })

    it('counts a move held at a limit once, and a second push at the same limit not at all', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.selectSplit(store.splits[0]!.id)
      const id = store.splits[0]!.id

      store.moveSplit(id, 40)
      store.moveSplit(id, 41)

      expect(store.editCount).toBe(1)
    })

    it('counts an added split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.moveZoomTo(31.5)

      store.addSplit()

      expect(store.editCount).toBe(1)
    })

    it('counts a deleted detected split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.deleteSplit(store.splits[0]!.id)

      expect(store.editCount).toBe(1)
    })

    it('counts a renamed track', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.renameTrack(store.splits[0]!.id, 'Intro')

      expect(store.editCount).toBe(1)
    })

    it('does not count a rename that leaves the stored name as it was', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()

      store.renameTrack(store.splits[0]!.id, ' '.repeat(3))
      store.renameTrack(null, '')
      store.renameTrack(-1, 'Ghost')
      expect(store.editCount).toBe(0)

      store.renameTrack(store.splits[0]!.id, 'Intro')
      store.renameTrack(store.splits[0]!.id, ' Intro ')
      expect(store.editCount).toBe(1)
    })

    it('takes back the edit of a track renamed to its detected name, the number', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.open(curve, timing(curve))
      store.findSplits()
      store.renameTrack(store.splits[0]!.id, 'Intro')
      store.renameTrack(null, 'Opening')

      store.renameTrack(store.splits[0]!.id, '')
      expect(store.editCount).toBe(1)

      store.renameTrack(null, '  ')
      expect(store.editCount).toBe(0)
    })

    it('starts again at 0 when a new file is detected', () => {
      const store = editedStore()
      const second = twoGaps()

      store.open(second, timing(second))
      store.findSplits()

      expect(store.editCount).toBe(0)
      store.moveSplit(store.splits[0]!.id, 3)
      expect(store.editCount).toBe(1)
    })

    it('keeps the edits when the silence threshold changes', () => {
      const store = editedStore()

      store.setSilenceThreshold(-45)

      expect(store.editCount).toBe(4)
      expect(store.hasEdits).toBe(true)
    })

    it('keeps the edits when the minimum gap length changes', () => {
      const store = editedStore()

      store.setMinimumGapLength(3)

      expect(store.editCount).toBe(4)
    })

    it('starts again at 0 on reset', () => {
      const store = editedStore()

      store.reset()

      expect(store.editCount).toBe(0)
    })
  })

  describe('the range', () => {
    it('starts with no range', () => {
      expect(loadedStore().range).toBeNull()
    })

    it('holds the range dragged from an anchor to a pointer, earlier time first', () => {
      const store = loadedStore()

      expect(store.setRange(30, 12)).toBe(true)

      expect(store.range).toEqual({ startSeconds: 12, endSeconds: 30 })
    })

    it('holds the range to the file’s ends', () => {
      const store = loadedStore()

      store.setRange(50, 90)

      expect(store.range).toEqual({ startSeconds: 50, endSeconds: 60 })
    })

    it('stops the range at 10 min from the anchor', () => {
      const curve = curveOf([LOUD, 40_000])
      const store = useSplitStore()
      // 2000 s of file.
      store.open(curve, timing(curve))
      store.findSplits()

      store.setRange(100, 1900)

      expect(store.range).toEqual({ startSeconds: 100, endSeconds: 700 })
    })

    it('refuses a range under 1 s and leaves the range it had', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      expect(store.setRange(30, 30.4)).toBe(false)

      expect(store.range).toEqual({ startSeconds: 10, endSeconds: 20 })
    })

    it('replaces the range with a new one', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.setRange(40, 55)

      expect(store.range).toEqual({ startSeconds: 40, endSeconds: 55 })
    })

    it('refuses a range before a file is analysed', () => {
      const store = useSplitStore()

      expect(store.setRange(10, 20)).toBe(false)

      expect(store.range).toBeNull()
    })

    it('keeps the range when a setting changes, and when splits are edited', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.setMinimumGapLength(3)
      store.setSilenceThreshold(-40)
      store.addSplit()
      store.moveZoomTo(5)

      expect(store.range).toEqual({ startSeconds: 10, endSeconds: 20 })
    })

    it('does not count as an edit', () => {
      const store = loadedStore()

      store.setRange(10, 20)

      expect(store.editCount).toBe(0)
    })

    it('is forgotten on reset', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.reset()

      expect(store.range).toBeNull()
    })
  })

  describe('the mark', () => {
    it('is none on a new range, and placed inside the range', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      expect(store.markSeconds).toBeNull()

      store.placeMark(14.25)

      expect(store.markSeconds).toBe(14.25)
    })

    it('is held inside the range, at its ends', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.placeMark(4)
      expect(store.markSeconds).toBe(10)

      store.placeMark(31)
      expect(store.markSeconds).toBe(20)
    })

    it('is not placed without a range', () => {
      const store = loadedStore()

      store.placeMark(14)

      expect(store.markSeconds).toBeNull()
    })

    it('is cleared by a new range, but not by a refused one', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      store.placeMark(14)

      store.setRange(30, 30.4)
      expect(store.markSeconds).toBe(14)

      store.setRange(12, 25)
      expect(store.markSeconds).toBeNull()
    })

    it('is kept while the split view is shown, and through setting changes and edits', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      store.placeMark(14)

      store.showView('split')
      store.showView('range')
      store.setMinimumGapLength(3)
      store.moveZoomTo(5)

      expect(store.markSeconds).toBe(14)
    })

    it('is forgotten on reset', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      store.placeMark(14)

      store.reset()

      expect(store.markSeconds).toBeNull()
    })

    it('does not count as an edit', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.placeMark(14)

      expect(store.editCount).toBe(0)
    })
  })

  describe('the Track view’s mark', () => {
    // Track 1 is selected after detection: 0 s to 22 s. Track 2 runs 22 s to 42 s.
    it('is none on a new track, and placed inside the selected track', () => {
      const store = loadedStore()
      expect(store.trackMarkSeconds).toBeNull()

      store.placeTrackMark(14.25)

      expect(store.trackMarkSeconds).toBe(14.25)
    })

    it('is held inside the track, at its ends', () => {
      const store = loadedStore()
      store.selectTrack(store.tracks[1]!)

      store.placeTrackMark(4)
      expect(store.trackMarkSeconds).toBe(22)

      store.placeTrackMark(50)
      expect(store.trackMarkSeconds).toBe(42)
    })

    it('is not placed with no track selected', () => {
      const store = loadedStore()
      store.moveZoomTo(5)

      store.placeTrackMark(14)

      expect(store.trackMarkSeconds).toBeNull()
    })

    it('is kept while the same track stays selected, through view switches', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      store.placeTrackMark(14)

      store.showView('track')
      store.showView('range')
      store.selectTrack(store.tracks[0]!)

      expect(store.trackMarkSeconds).toBe(14)
    })

    it('is cleared when another track is selected, and does not return with the first', () => {
      const store = loadedStore()
      store.placeTrackMark(14)

      store.selectTrack(store.tracks[1]!)
      expect(store.trackMarkSeconds).toBeNull()

      store.selectTrack(store.tracks[0]!)
      expect(store.trackMarkSeconds).toBeNull()
    })

    it('is cleared when a split is selected, and when the zoom window is moved', () => {
      const store = loadedStore()
      store.placeTrackMark(14)
      store.selectSplit(store.splits[0]!.id)
      expect(store.trackMarkSeconds).toBeNull()

      store.selectTrack(store.tracks[0]!)
      store.placeTrackMark(14)
      store.moveZoomTo(5)
      expect(store.trackMarkSeconds).toBeNull()
    })

    describe('when an end of its track changes', () => {
      it('is cleared when the split at the end moves', () => {
        const store = markedSecondTrack()

        store.moveSplit(store.splits[1]!.id, 40)

        expect(store.trackMarkSeconds).toBeNull()
      })

      it('is cleared when the split at the end is deleted, and the track grows', () => {
        const store = markedSecondTrack()

        store.deleteSplit(store.splits[1]!.id)

        expect(store.trackMarkSeconds).toBeNull()
      })

      it('is cleared when a split is added inside the track, and it shrinks', () => {
        const store = markedSecondTrack()

        store.addSplitAt(36)

        expect(store.trackMarkSeconds).toBeNull()
      })

      it('is kept when a split is added in another track', () => {
        const store = markedSecondTrack()

        store.addSplitAt(10)

        expect(store.trackMarkSeconds).toBe(30)
      })
    })

    it('is kept by a setting change, cleared by opening a file, and forgotten on reset', () => {
      const store = loadedStore()
      store.placeTrackMark(14)
      store.setMinimumGapLength(3)
      expect(store.trackMarkSeconds).toBe(14)

      const curve = farGaps()
      store.open(curve, timing(curve))
      expect(store.trackMarkSeconds).toBeNull()

      store.placeTrackMark(14)
      store.reset()
      expect(store.trackMarkSeconds).toBeNull()
    })

    it('is its own: placing it leaves the Range view’s mark, and the other way round', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      store.placeMark(12)

      store.placeTrackMark(14)
      expect(store.markSeconds).toBe(12)

      store.placeMark(16)
      expect(store.trackMarkSeconds).toBe(14)
    })

    it('does not count as an edit', () => {
      const store = loadedStore()

      store.placeTrackMark(14)

      expect(store.editCount).toBe(0)
    })
  })

  describe('the end splits of the selected track', () => {
    it('are the split before and the split after, none at the file’s ends', () => {
      const store = loadedStore()
      const [first, second] = store.splits

      expect(store.selectedTrackEndSplits).toEqual([first])

      store.selectTrack(store.tracks[1]!)
      expect(store.selectedTrackEndSplits).toEqual([first, second])

      store.selectTrack(store.tracks[2]!)
      expect(store.selectedTrackEndSplits).toEqual([second])
    })

    it('are none with no selected track, and for a track over the whole file', () => {
      const store = useSplitStore()
      expect(store.selectedTrackEndSplits).toEqual([])

      const curve = curveOf([LOUD, 100])
      store.open(curve, timing(curve))
      store.findSplits()
      expect(store.selectedTrackEndSplits).toEqual([])

      store.moveZoomTo(2)
      expect(store.selectedTrackEndSplits).toEqual([])
    })
  })

  describe('pending splits', () => {
    describe('adding at the mark', () => {
      it('adds a pending split at the mark and selects it', () => {
        const store = pendingStore()

        store.addPendingSplitAtMark()

        expect(store.pendingSplits).toEqual([30])
        expect(store.selectedPendingSplit).toBe(30)
      })

      it('keeps the mark, the track, the view and the splits as they were', () => {
        const store = pendingStore()

        store.addPendingSplitAtMark()

        expect(store.trackMarkSeconds).toBe(30)
        expect(store.selectedTrack?.number).toBe(2)
        expect(store.view).toBe('track')
        expect(store.splits).toHaveLength(2)
        expect(store.editCount).toBe(0)
      })

      it('does nothing with no mark', () => {
        const store = loadedStore()
        store.selectTrack(store.tracks[1]!)

        store.addPendingSplitAtMark()

        expect(store.pendingSplits).toEqual([])
      })

      it('is refused while a pending split is selected', () => {
        const store = pendingStore()
        store.addPendingSplitAtMark()
        store.placeTrackMark(35)

        store.addPendingSplitAtMark()

        expect(store.pendingSplits).toEqual([30])
      })
    })

    describe('adding at a time', () => {
      it('adds a pending split there without selecting it', () => {
        const store = pendingStore()

        store.addPendingSplit(27, false)

        expect(store.pendingSplits).toEqual([27])
        expect(store.selectedPendingSplit).toBeNull()
      })

      it('selects the new one when asked to', () => {
        const store = pendingStore()

        store.addPendingSplit(27, true)

        expect(store.selectedPendingSplit).toBe(27)
      })

      it('is seen by a watcher of the list, which the Track view redraws on', () => {
        const store = pendingStore()
        const seen: number[][] = []
        watch(
          () => store.pendingSplits,
          (list) => {
            seen.push([...list])
          },
          { flush: 'sync' },
        )

        store.addPendingSplit(27, false)

        expect(seen).toEqual([[27]])
      })

      it('is allowed while another pending split is selected, and leaves that one selected', () => {
        const store = pendingStore()
        store.addPendingSplitAtMark()

        store.addPendingSplit(36, false)

        expect(store.pendingSplits).toEqual([30, 36])
        expect(store.selectedPendingSplit).toBe(30)
      })

      it('lands on the 10 ms grid', () => {
        const store = pendingStore()

        store.addPendingSplit(27.004, false)
        store.addPendingSplit(35.006, false)

        expect(store.pendingSplits).toEqual([27, 35.01])
      })

      it('keeps them in time order', () => {
        const store = pendingStore()

        store.addPendingSplit(36, false)
        store.addPendingSplit(25, false)
        store.addPendingSplit(30, false)

        expect(store.pendingSplits).toEqual([25, 30, 36])
      })

      it('does nothing with no track selected, or before detection', () => {
        const store = useSplitStore()
        store.addPendingSplit(5, false)
        expect(store.pendingSplits).toEqual([])

        const loaded = loadedStore()
        loaded.moveZoomTo(30)
        loaded.addPendingSplit(30, false)
        expect(loaded.pendingSplits).toEqual([])
      })

      it('does not count as an edit', () => {
        const store = pendingStore()

        store.addPendingSplit(27, false)

        expect(store.editCount).toBe(0)
      })
    })

    describe('the room', () => {
      it('is 1 s from another pending split: refused inside, allowed at exactly 1 s', () => {
        const store = pendingStore()
        store.addPendingSplit(30, false)

        store.addPendingSplit(30.99, false)
        store.addPendingSplit(29.01, false)
        expect(store.pendingSplits).toEqual([30])

        store.addPendingSplit(31, false)
        store.addPendingSplit(29, false)
        expect(store.pendingSplits).toEqual([29, 30, 31])
      })

      it('is 1 s from the track’s ends: refused inside, allowed at exactly 1 s', () => {
        const store = pendingStore()

        store.addPendingSplit(22.99, false)
        store.addPendingSplit(41.01, false)
        expect(store.pendingSplits).toEqual([])

        store.addPendingSplit(23, false)
        store.addPendingSplit(41, false)
        expect(store.pendingSplits).toEqual([23, 41])
      })

      it('is 1 s from the file’s start in the first track', () => {
        const store = loadedStore()

        store.addPendingSplit(0.5, false)
        store.addPendingSplit(1, false)

        expect(store.pendingSplits).toEqual([1])
      })

      it('is 1 s from the file’s end in the last track', () => {
        const store = loadedStore()
        store.selectTrack(store.tracks[2]!)

        store.addPendingSplit(59.5, false)
        store.addPendingSplit(59, false)

        expect(store.pendingSplits).toEqual([59])
      })

      it('is refused outside the selected track', () => {
        const store = pendingStore()

        store.addPendingSplit(10, false)
        store.addPendingSplit(50, false)

        expect(store.pendingSplits).toEqual([])
      })
    })

    describe('whether one can be added at the mark', () => {
      it('is false with no mark, and true on open ground', () => {
        const store = loadedStore()
        store.selectTrack(store.tracks[1]!)
        expect(store.canAddPendingSplit).toBe(false)

        store.placeTrackMark(30)
        expect(store.canAddPendingSplit).toBe(true)
      })

      it('is false when the mark is within 1 s of a pending split or of the track’s ends', () => {
        const store = pendingStore()
        store.addPendingSplit(36, false)

        store.placeTrackMark(36.5)
        expect(store.canAddPendingSplit).toBe(false)

        store.placeTrackMark(22.5)
        expect(store.canAddPendingSplit).toBe(false)

        store.placeTrackMark(41.5)
        expect(store.canAddPendingSplit).toBe(false)

        store.placeTrackMark(35)
        expect(store.canAddPendingSplit).toBe(true)
      })

      it('is false while a pending split is selected', () => {
        const store = pendingStore()
        store.addPendingSplitAtMark()
        store.placeTrackMark(36)
        expect(store.canAddPendingSplit).toBe(false)

        store.deselectPendingSplit()
        expect(store.canAddPendingSplit).toBe(true)
      })

      it('judges the room by the time it would land on, on the grid', () => {
        const store = pendingStore()
        store.addPendingSplit(30, false)

        // 30.996 s is under 1 s from 30 s, but lands on 31.00 s, exactly 1 s away.
        store.placeTrackMark(30.996)
        expect(store.canAddPendingSplit).toBe(true)

        store.placeTrackMark(30.994)
        expect(store.canAddPendingSplit).toBe(false)
      })
    })

    describe('selecting, deselecting and deleting', () => {
      it('selects the pending split at a time, and one selection replaces another', () => {
        const store = pendingStore()
        store.addPendingSplit(27, false)
        store.addPendingSplit(36, false)

        store.selectPendingSplit(36)
        expect(store.selectedPendingSplit).toBe(36)

        store.selectPendingSplit(27)
        expect(store.selectedPendingSplit).toBe(27)
      })

      it('ignores a time that is no pending split', () => {
        const store = pendingStore()
        store.addPendingSplit(27, false)

        store.selectPendingSplit(30)

        expect(store.selectedPendingSplit).toBeNull()
      })

      it('deselects without deleting', () => {
        const store = pendingStore()
        store.addPendingSplitAtMark()

        store.deselectPendingSplit()

        expect(store.selectedPendingSplit).toBeNull()
        expect(store.pendingSplits).toEqual([30])
      })

      it('deletes the selected one, and the others stay', () => {
        const store = pendingStore()
        store.addPendingSplit(27, false)
        store.addPendingSplit(36, false)
        store.selectPendingSplit(36)

        store.deleteSelectedPendingSplit()

        expect(store.pendingSplits).toEqual([27])
        expect(store.selectedPendingSplit).toBeNull()
      })

      it('deletes nothing with none selected', () => {
        const store = pendingStore()
        store.addPendingSplit(27, false)

        store.deleteSelectedPendingSplit()

        expect(store.pendingSplits).toEqual([27])
      })

      it('lets a new one be added at the same place once it is deleted', () => {
        const store = pendingStore()
        store.addPendingSplitAtMark()
        store.deleteSelectedPendingSplit()

        store.addPendingSplitAtMark()

        expect(store.pendingSplits).toEqual([30])
      })
    })

    describe('applying', () => {
      it('inserts one split for each, in time order, each an added split', () => {
        const store = pendingStore()
        store.addPendingSplit(36, false)
        store.addPendingSplit(27, false)

        store.applyPendingSplits()

        expect(store.splits.map((split) => split.seconds)).toEqual([22, 27, 36, 42])
        expect(store.editCount).toBe(2)
        expect(store.tracks).toHaveLength(5)
      })

      it('empties the list and the selection', () => {
        const store = pendingStore()
        store.addPendingSplitAtMark()

        store.applyPendingSplits()

        expect(store.pendingSplits).toEqual([])
        expect(store.selectedPendingSplit).toBeNull()
      })

      it('selects the first new split, centres the window on it and shows the Split view', () => {
        const store = pendingStore()
        store.addPendingSplit(36, false)
        store.addPendingSplit(27, false)

        store.applyPendingSplits()

        expect(store.selectedSplit?.seconds).toBe(27)
        expect(store.zoomCentreSeconds).toBe(27)
        expect(store.view).toBe('split')
      })

      it('works the same with one of them selected', () => {
        const store = pendingStore()
        store.addPendingSplit(27, false)
        store.addPendingSplit(36, true)

        store.applyPendingSplits()

        expect(store.splits.map((split) => split.seconds)).toEqual([22, 27, 36, 42])
        expect(store.selectedSplit?.seconds).toBe(27)
      })

      it('does nothing with no pending split', () => {
        const store = pendingStore()

        store.applyPendingSplits()

        expect(store.splits).toHaveLength(2)
        expect(store.view).toBe('track')
        expect(store.selectedTrack?.number).toBe(2)
      })

      it('takes the added edit back when an applied split is deleted again', () => {
        const store = pendingStore()
        store.addPendingSplit(27, false)
        store.applyPendingSplits()
        expect(store.editCount).toBe(1)

        store.deleteSplit(store.selectedSplit!.id)

        expect(store.editCount).toBe(0)
      })
    })

    describe('what empties them', () => {
      it('keeps them through a view switch while the track stays selected', () => {
        const store = pendingTwo()
        store.setRange(10, 20)

        store.showView('split')
        store.showView('range')
        store.showView('track')

        expect(store.pendingSplits).toEqual([27, 36])
        expect(store.selectedPendingSplit).toBe(36)
      })

      it('keeps them when the same track is selected again', () => {
        const store = pendingTwo()

        store.selectTrack(store.selectedTrack!)

        expect(store.pendingSplits).toEqual([27, 36])
      })

      it('empties them when another track is selected, and they do not return with this one', () => {
        const store = pendingTwo()

        store.selectTrack(store.tracks[0]!)
        store.discardPending()
        store.selectTrack(store.tracks[1]!)

        expect(store.pendingSplits).toEqual([])
        expect(store.selectedPendingSplit).toBeNull()
      })

      it('empties them when a split is selected, and when the zoom window is moved', () => {
        const store = pendingTwo()
        store.selectSplit(store.splits[0]!.id)
        store.discardPending()
        expect(store.pendingSplits).toEqual([])

        store.selectTrack(store.tracks[1]!)
        store.addPendingSplit(27, false)
        store.moveZoomTo(5)
        store.discardPending()
        expect(store.pendingSplits).toEqual([])
      })

      it('empties them when the split at either end moves', () => {
        const store = loadedStore()
        store.moveZoomTo(42)
        store.selectTrack(store.tracks[1]!)
        store.addPendingSplit(30, false)

        store.moveSplit(store.splits[1]!.id, 40)

        expect(store.pendingSplits).toEqual([])
      })

      it('empties them when the split at either end goes', () => {
        const store = pendingTwo()

        store.deleteSplit(store.splits[0]!.id)
        store.discardPending()

        expect(store.pendingSplits).toEqual([])
      })

      it('empties them when a split is added inside the track, and keeps them for one in another', () => {
        const store = pendingTwo()
        store.addSplitAt(10)
        expect(store.pendingSplits).toEqual([27, 36])

        store.addSplitAt(40)
        store.discardPending()
        expect(store.pendingSplits).toEqual([])
      })

      it('keeps them when a setting changes', () => {
        const store = pendingTwo()

        store.setMinimumGapLength(3)

        expect(store.pendingSplits).toEqual([27, 36])
        expect(store.selectedPendingSplit).toBe(36)
      })

      it('empties them on reset', () => {
        const store = pendingTwo()

        store.reset()

        expect(store.pendingSplits).toEqual([])
        expect(store.selectedPendingSplit).toBeNull()
      })
    })
  })

  describe('the discard question', () => {
    describe('holds back an action that would discard them', () => {
      it('selecting a split', () => {
        const store = pendingTwo()

        store.selectSplit(store.splits[0]!.id)

        expect(heldState(store)).toEqual(HELD)
        expect(store.selectedSplit).toBeNull()
      })

      it('selecting another track', () => {
        const store = pendingTwo()

        store.selectTrack(store.tracks[2]!)

        expect(heldState(store)).toEqual(HELD)
      })

      it('moving the zoom window onto empty ground', () => {
        const store = pendingTwo()
        const centre = store.zoomCentreSeconds

        store.moveZoomTo(5)

        expect(heldState(store)).toEqual(HELD)
        expect(store.zoomCentreSeconds).toBe(centre)
      })

      it.each([0, 1])('deleting the split at either end of the track (split %i)', (index) => {
        const store = pendingTwo()

        store.deleteSplit(store.splits[index]!.id)

        expect(heldState(store)).toEqual(HELD)
        expect(store.splits).toHaveLength(2)
      })

      it.each([0, 1, 2])(
        'removing the track, or a neighbour, which deletes one of its end splits (track %i)',
        (index) => {
          const store = pendingTwo()

          store.removeTrack(store.tracks[index]!)

          expect(heldState(store)).toEqual(HELD)
          expect(store.splits).toHaveLength(2)
        },
      )

      it('adding a split at the window’s centre, which selects it', () => {
        const store = pendingTwo()

        store.addSplit()

        expect(heldState(store)).toEqual(HELD)
        expect(store.splits).toHaveLength(2)
      })

      it('adding a split inside the track from the Range view, which shortens it', () => {
        const store = pendingTwo()

        store.addSplitAt(30)

        expect(heldState(store)).toEqual(HELD)
        expect(store.splits).toHaveLength(2)
      })
    })

    describe('asks nothing', () => {
      it('with no pending split: the action runs at once', () => {
        const store = loadedStore()
        store.selectTrack(store.tracks[1]!)

        store.selectSplit(store.splits[0]!.id)

        expect(store.discardQuestion).toBeNull()
        expect(store.selectedSplit?.seconds).toBe(22)
      })

      it('for the track that is already selected', () => {
        const store = pendingTwo()

        store.selectTrack(store.selectedTrack!)

        expect(store.discardQuestion).toBeNull()
        expect(store.pendingSplits).toEqual([27, 36])
      })

      it('for a view switch', () => {
        const store = pendingTwo()
        store.setRange(10, 20)

        store.showView('split')
        store.showView('range')
        store.showView('track')

        expect(store.discardQuestion).toBeNull()
        expect(store.pendingSplits).toEqual([27, 36])
      })

      it('for a split added in another track, or deleted away from the track’s ends', () => {
        const store = namedFourTracks()
        store.selectTrack(store.tracks[1]!)
        store.addPendingSplit(30, false)

        store.addSplitAt(10)
        store.deleteSplit(store.splits.at(-1)!.id)

        expect(store.discardQuestion).toBeNull()
        expect(store.splits.map((point) => point.seconds)).toEqual([10, 22, 42])
        expect(store.pendingSplits).toEqual([30])
      })

      it('for the pending splits’ own actions', () => {
        const store = pendingTwo()

        store.deselectPendingSplit()
        store.addPendingSplit(31, false)
        store.deleteSelectedPendingSplit()
        store.selectPendingSplit(31)
        store.placeTrackMark(30)

        expect(store.discardQuestion).toBeNull()
      })
    })

    describe('apply first', () => {
      it('applies them, then runs the held action, and closes the question', () => {
        const store = pendingTwo()
        const target = store.splits[1]!
        store.selectSplit(target.id)

        store.applyFirst()

        expect(store.discardQuestion).toBeNull()
        expect(store.splits.map((point) => point.seconds)).toEqual([22, 27, 36, 42])
        expect(store.editCount).toBe(2)
        expect(store.selectedSplit?.id).toBe(target.id)
        expect(store.pendingSplits).toEqual([])
      })

      it('leaves the view to the held action: a split at the playhead keeps the Range view', () => {
        const store = pendingTwo()
        store.setRange(20, 50)
        store.addSplitAt(31)

        store.applyFirst()

        expect(store.splits.map((point) => point.seconds)).toEqual([22, 27, 31, 36, 42])
        expect(store.view).toBe('range')
        expect(store.range).toEqual({ startSeconds: 20, endSeconds: 50 })
      })

      it('runs a held track selection on the track it named', () => {
        const store = pendingTwo()
        const third = store.tracks[2]!
        store.selectTrack(third)

        store.applyFirst()

        expect(store.selectedTrack?.startSeconds).toBe(42)
        expect(store.view).toBe('track')
        expect(store.splits).toHaveLength(4)
      })

      it('runs a held split at the window’s centre where the centre was, and only with room', () => {
        const store = pendingTwo()
        store.addSplit()

        store.applyFirst()

        const seconds = store.splits.map((point) => point.seconds)
        const gaps = seconds.slice(1).map((value, index) => value - seconds[index]!)
        expect(Math.min(...gaps)).toBeGreaterThanOrEqual(1)
      })

      it('drops a held split from the Range view that no longer has room after the apply', () => {
        const store = pendingTwo()
        store.addSplitAt(27.4)

        store.applyFirst()

        expect(store.splits.map((point) => point.seconds)).toEqual([22, 27, 36, 42])
      })

      it('runs a held track removal on the track as it was, not on the part left of it', () => {
        const store = pendingTwo()
        store.removeTrack(store.tracks[1]!)

        store.applyFirst()

        // The track's two end splits, 22 s and 42 s, go; the applied 27 s and 36 s stay.
        expect(store.splits.map((point) => point.seconds)).toEqual([27, 36])
      })
    })

    describe('discard', () => {
      it('drops them, then runs the held action, and closes the question', () => {
        const store = pendingTwo()
        const target = store.splits[0]!
        store.selectSplit(target.id)

        store.discardPending()

        expect(store.discardQuestion).toBeNull()
        expect(store.pendingSplits).toEqual([])
        expect(store.selectedPendingSplit).toBeNull()
        expect(store.splits).toHaveLength(2)
        expect(store.editCount).toBe(0)
        expect(store.selectedSplit?.id).toBe(target.id)
      })

      it('runs a held delete', () => {
        const store = pendingTwo()
        store.deleteSplit(store.splits[1]!.id)

        store.discardPending()

        expect(store.splits.map((point) => point.seconds)).toEqual([22])
      })
    })

    describe('cancel', () => {
      it('does nothing: the action is forgotten and the pending splits stay', () => {
        const store = pendingTwo()
        store.selectSplit(store.splits[0]!.id)

        store.cancelDiscard()

        expect(store.discardQuestion).toBeNull()
        expect(store.pendingSplits).toEqual([27, 36])
        expect(store.selectedSplit).toBeNull()
        expect(store.selectedTrack?.number).toBe(2)
      })

      it('asks again the next time', () => {
        const store = pendingTwo()
        store.selectSplit(store.splits[0]!.id)
        store.cancelDiscard()

        store.selectSplit(store.splits[0]!.id)

        expect(heldState(store)).toEqual(HELD)
      })
    })

    describe('while it is open', () => {
      it('ignores a second discarding action, so the answer runs the first', () => {
        const store = pendingTwo()
        const first = store.splits[0]!
        store.selectSplit(first.id)

        store.selectTrack(store.tracks[2]!)
        store.moveZoomTo(5)
        store.discardPending()

        expect(store.selectedSplit?.id).toBe(first.id)
      })

      it('keeps the count it was asked with', () => {
        const store = pendingTwo()
        store.selectSplit(store.splits[0]!.id)

        store.selectPendingSplit(27)
        store.addPendingSplit(39, false)

        expect(store.discardQuestion).toEqual({ pendingCount: 2 })
      })
    })

    describe('answering with no question open', () => {
      it('does nothing', () => {
        const store = pendingTwo()

        store.applyFirst()
        store.discardPending()
        store.cancelDiscard()

        expect(store.pendingSplits).toEqual([27, 36])
        expect(store.splits).toHaveLength(2)
      })
    })

    describe('a reset', () => {
      it('closes it and forgets the held action', () => {
        const store = pendingTwo()
        store.selectSplit(store.splits[0]!.id)

        store.reset()

        expect(store.discardQuestion).toBeNull()
        store.discardPending()
        expect(store.selectedSplit).toBeNull()
      })
    })
  })

  describe('whether a split can be added at the mark', () => {
    // The splits are at 22 s and 42 s of a 60 s file.
    it('is false before detection, with no range and with no mark', () => {
      expect(useSplitStore().canAddSplitAtMark).toBe(false)

      const store = loadedStore()
      expect(store.canAddSplitAtMark).toBe(false)

      store.setRange(10, 30)
      expect(store.canAddSplitAtMark).toBe(false)
    })

    it('is true on open ground', () => {
      const store = loadedStore()
      store.setRange(10, 30)

      store.placeMark(15)

      expect(store.canAddSplitAtMark).toBe(true)
    })

    it('is false within 1 s of a split, and true at exactly 1 s', () => {
      const store = loadedStore()
      store.setRange(10, 30)

      store.placeMark(22.5)
      expect(store.canAddSplitAtMark).toBe(false)

      store.placeMark(21.1)
      expect(store.canAddSplitAtMark).toBe(false)

      store.placeMark(23)
      expect(store.canAddSplitAtMark).toBe(true)

      store.placeMark(21)
      expect(store.canAddSplitAtMark).toBe(true)
    })

    it('is false within 1 s of the file’s start and end, and true at exactly 1 s', () => {
      const store = loadedStore()
      store.setRange(0, 10)
      store.placeMark(0.5)
      expect(store.canAddSplitAtMark).toBe(false)
      store.placeMark(1)
      expect(store.canAddSplitAtMark).toBe(true)

      store.setRange(50, 60)
      store.placeMark(59.5)
      expect(store.canAddSplitAtMark).toBe(false)
      store.placeMark(59)
      expect(store.canAddSplitAtMark).toBe(true)
    })
  })

  describe('adding a split at the mark', () => {
    it('adds an unnamed split at the mark, in time order', () => {
      const store = markedStore(15)

      store.addSplitAtMark()

      expect(store.splits.map((split) => split.seconds)).toEqual([
        15,
        expect.closeTo(22, 9),
        expect.closeTo(42, 9),
      ])
      expect(store.splits[0]!.name).toBeNull()
      expect(store.tracks.map((track) => track.name)).toEqual(['01', '02', '03', '04'])
    })

    it('does not select it, move the zoom window or leave the range view', () => {
      const store = markedStore(15)
      const selectedId = store.selectedSplit?.id
      const centre = store.zoomCentreSeconds

      store.addSplitAtMark()

      expect(store.selectedSplit?.id).toBe(selectedId)
      expect(store.zoomCentreSeconds).toBe(centre)
      expect(store.view).toBe('range')
    })

    it('keeps the mark and the range', () => {
      const store = markedStore(15)

      store.addSplitAtMark()

      expect(store.markSeconds).toBe(15)
      expect(store.range).toEqual({ startSeconds: 10, endSeconds: 30 })
    })

    it('counts as one added-split edit, and none once it is deleted again', () => {
      const store = markedStore(15)

      store.addSplitAtMark()
      expect(store.editCount).toBe(1)

      store.deleteSplit(store.splits[0]!.id)
      expect(store.editCount).toBe(0)
    })

    it('does nothing with no room for it, and again at the same mark', () => {
      const store = markedStore(22.5)
      store.addSplitAtMark()
      expect(store.splits).toHaveLength(2)

      store.placeMark(15)
      store.addSplitAtMark()
      store.addSplitAtMark()
      expect(store.splits).toHaveLength(3)
      expect(store.editCount).toBe(1)
    })

    it('does nothing with no mark', () => {
      const store = loadedStore()
      store.setRange(10, 30)

      store.addSplitAtMark()

      expect(store.splits).toHaveLength(2)
    })
  })

  describe('adding a split at a time', () => {
    it('adds an unnamed split there, in time order, on the 10 ms grid', () => {
      const store = markedStore(12)

      store.addSplitAt(15.004)
      store.addSplitAt(17.006)

      expect(store.splits.map((split) => split.seconds)).toEqual([
        15,
        17.01,
        expect.closeTo(22, 9),
        expect.closeTo(42, 9),
      ])
      expect(store.splits.map((split) => split.name)).toEqual([null, null, null, null])
    })

    it('does not select it, move the zoom window, leave the range view or touch the mark', () => {
      const store = markedStore(12)
      const selectedId = store.selectedSplit?.id
      const centre = store.zoomCentreSeconds

      store.addSplitAt(15)

      expect(store.selectedSplit?.id).toBe(selectedId)
      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.zoomCentreSeconds).toBe(centre)
      expect(store.view).toBe('range')
      expect(store.markSeconds).toBe(12)
    })

    it('needs no mark, and no range on show', () => {
      const store = loadedStore()

      store.addSplitAt(15)

      expect(store.splits).toHaveLength(3)
    })

    it('is refused within 1 s of a split, and allowed at exactly 1 s', () => {
      const store = loadedStore()

      store.addSplitAt(22.5)
      store.addSplitAt(21.5)
      expect(store.splits).toHaveLength(2)

      store.addSplitAt(23)
      expect(store.splits).toHaveLength(3)
    })

    it('is refused within 1 s of the file’s start and end, and allowed at exactly 1 s', () => {
      const store = loadedStore()

      store.addSplitAt(0.5)
      store.addSplitAt(59.5)
      store.addSplitAt(0)
      store.addSplitAt(60)
      store.addSplitAt(-3)
      store.addSplitAt(75)
      expect(store.splits).toHaveLength(2)

      store.addSplitAt(1)
      store.addSplitAt(59)
      expect(store.splits).toHaveLength(4)
    })

    it('judges the room by the time it would land on, on the grid', () => {
      const store = loadedStore()

      // 22.996 would land on 23: 1 s from the split at 22.
      store.addSplitAt(22.996)
      expect(store.splits).toHaveLength(3)

      // 0.996 would land on 1: 1 s from the file's start.
      store.addSplitAt(0.996)
      expect(store.splits.map((split) => split.seconds)).toContain(1)
    })

    it('counts as one added-split edit, and none once it is deleted again', () => {
      const store = loadedStore()

      store.addSplitAt(15)
      expect(store.editCount).toBe(1)

      store.deleteSplit(store.splits[0]!.id)
      expect(store.editCount).toBe(0)
    })

    it('adds one split for a time asked twice, since the second is within 1 s of the first', () => {
      const store = loadedStore()

      store.addSplitAt(15)
      store.addSplitAt(15)
      store.addSplitAt(15.4)

      expect(store.splits).toHaveLength(3)
    })

    it('does nothing before detection', () => {
      const store = useSplitStore()

      store.addSplitAt(15)

      expect(store.splits).toEqual([])
    })
  })

  describe('the panel view', () => {
    it('starts on the track view, on the first track', () => {
      const store = loadedStore()

      expect(store.view).toBe('track')
      expect(store.selectedTrack).toBe(store.tracks[0])
    })

    it('switches to the range view when a range is made', () => {
      const store = loadedStore()

      store.setRange(10, 20)

      expect(store.view).toBe('range')
    })

    it('stays where it is when a range is refused', () => {
      const store = loadedStore()

      store.setRange(30, 30.4)

      expect(store.view).toBe('track')
    })

    it('switches to the range view on request once there is a range, and back', () => {
      const store = loadedStore()
      store.setRange(10, 20)
      store.showView('split')

      store.showView('range')
      expect(store.view).toBe('range')

      store.showView('split')
      expect(store.view).toBe('split')
    })

    it('refuses the range view while there is no range', () => {
      const store = loadedStore()

      store.showView('range')

      expect(store.view).toBe('track')
    })

    it('switches back to the split view when a split is selected', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.selectSplit(store.splits[1]!.id)

      expect(store.view).toBe('split')
    })

    it('switches to the track view when a track is selected', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.selectTrack(store.tracks[1]!)

      expect(store.view).toBe('track')
    })

    it('switches to the track view on request once a track is selected', () => {
      const store = loadedStore()
      store.selectTrack(store.tracks[1]!)
      store.showView('split')

      store.showView('track')

      expect(store.view).toBe('track')
    })

    it('refuses the track view while no track is selected', () => {
      const store = loadedStore()
      store.selectSplit(store.splits[0]!.id)

      store.showView('track')

      expect(store.view).toBe('split')
    })

    it('switches back to the split view from the track view when a split is selected', () => {
      const store = loadedStore()
      store.selectTrack(store.tracks[1]!)

      store.selectSplit(store.splits[1]!.id)

      expect(store.view).toBe('split')
    })

    it('switches back to the split view from the track view when the zoom window is moved', () => {
      const store = loadedStore()
      store.selectTrack(store.tracks[1]!)

      store.moveZoomTo(5)

      expect(store.view).toBe('split')
    })

    describe('after a file opens', () => {
      it('shows the track view for the first one, with the window at the start', () => {
        const store = loadedStore()

        expect(store.view).toBe('track')
        expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
      })

      it('leaves the view and the selection alone for a setting change', () => {
        const store = loadedStore()
        store.selectSplit(store.splits[1]!.id)

        store.setMinimumGapLength(3)
        expect(store.view).toBe('split')
        expect(store.selectedSplit?.id).toBe(store.splits[1]!.id)

        store.selectTrack(store.tracks[1]!)
        store.setSilenceThreshold(-45)
        expect(store.view).toBe('track')
        expect(store.selectedTrack).toBe(store.tracks[1])
      })

      it('keeps the range view for a setting change, with its selection behind it', () => {
        const store = loadedStore()
        store.setRange(10, 20)
        store.selectSplit(store.splits[1]!.id)
        store.showView('range')

        store.setSilenceThreshold(-45)

        expect(store.view).toBe('range')
        expect(store.selectedSplit?.id).toBe(store.splits[1]!.id)
      })

      it('shows the track view for the first detection of a new file even with a range on show', () => {
        const store = loadedStore()
        store.setRange(10, 20)

        const second = twoGaps()
        store.open(second, timing(second))
        store.findSplits()

        expect(store.view).toBe('track')
      })

      it('keeps the split view and the range for a setting change made from the split view', () => {
        const store = loadedStore()
        store.setRange(10, 20)
        store.showView('split')

        store.setMinimumGapLength(3)

        expect(store.view).toBe('split')
        expect(store.range).toEqual({ startSeconds: 10, endSeconds: 20 })
      })
    })

    it('stays on the track view when a split other than the selected track’s start is deleted', () => {
      const store = loadedStore()
      store.selectTrack(store.tracks[1]!)

      store.deleteSplit(store.splits[1]!.id)

      expect(store.view).toBe('track')
      expect(store.selectedTrack?.number).toBe(2)
    })

    it('selects the merged track when the split where the selected track starts is deleted', () => {
      const store = loadedStore()
      store.selectTrack(store.tracks[2]!)

      store.deleteSplit(store.splits[1]!.id)

      expect(store.view).toBe('track')
      expect(store.selectedTrack).toBe(store.tracks[1])
      expect(store.selectedTrack?.startSplit).toBe(store.splits[0])
    })

    it('selects the merged first track when the split where the second track starts is deleted', () => {
      const store = loadedStore()
      store.selectTrack(store.tracks[1]!)

      store.deleteSplit(store.splits[0]!.id)

      expect(store.selectedTrack).toBe(store.tracks[0])
    })

    it('switches back to the split view when the zoom window is moved', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.moveZoomTo(5)

      expect(store.view).toBe('split')
    })

    it('keeps the range while the split view is shown', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.moveZoomTo(5)

      expect(store.range).toEqual({ startSeconds: 10, endSeconds: 20 })
    })

    it('is left alone by a setting change and by edits that select nothing', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.setMinimumGapLength(3)
      store.setSilenceThreshold(-40)

      expect(store.view).toBe('range')
    })

    it('stays on the range view when the selected split is deleted, with its neighbour selected', () => {
      const store = loadedStore()
      store.selectSplit(store.splits[0]!.id)
      store.setRange(10, 20)
      const neighbour = store.splits[1]!

      store.deleteSplit(store.selectedSplit!.id)

      expect(store.view).toBe('range')
      expect(store.selectedSplit).toBe(neighbour)
      expect(store.zoomCentreSeconds).toBe(neighbour.seconds)
    })

    it('goes back to the split view on reset', () => {
      const store = loadedStore()
      store.setRange(10, 20)

      store.reset()

      expect(store.view).toBe('split')
    })
  })

  it('forgets everything on reset', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.open(curve, timing(curve))
    store.findSplits()

    store.reset()

    expect(store.silenceThreshold).toBeNull()
    expect(store.gaps).toEqual([])
    expect(store.splits).toEqual([])
    expect(store.tracks).toEqual([])
    expect(store.selectedSplit).toBeNull()
    expect(store.zoomCentreSeconds).toBe(10)
  })
})

// 400 s of music whose top bands, 20 dB louder, start at 200 s.
function changingFile() {
  const columns = 8000
  const bands = new Uint8Array(columns * SPECTRUM_BAND_COUNT)
  for (let column = 0; column < columns; column++) {
    for (let band = 0; band < SPECTRUM_BAND_COUNT; band++) {
      bands[column * SPECTRUM_BAND_COUNT + band] = column >= 4000 && band < 60 ? 151 : 100
    }
  }
  const curve = curveOf([LOUD, columns])
  const spectrogram = { bands, bandCount: SPECTRUM_BAND_COUNT, topHz: 22_050 }
  return { curve, spectrogram }
}

describe('the contrast curve of the split store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is none until a file opens with its spectrogram', () => {
    const { curve } = changingFile()
    const store = useSplitStore()
    expect(store.contrastCurve).toBeNull()

    store.open(curve, timing(curve))

    expect(store.contrastCurve).toBeNull()
  })

  it('is worked out once, when the file opens, one value every 0.5 s', () => {
    const { curve, spectrogram } = changingFile()
    const store = useSplitStore()

    store.open(curve, timing(curve), spectrogram)

    expect(store.contrastCurve).toHaveLength(800)
    expect(store.contrastCurve?.[400]).toBeCloseTo(9.9995, 3)
    expect(store.contrastCurve?.[100]).toBeCloseTo(0, 4)
  })

  it('stays as it is when a setting moves, and goes when the store resets', () => {
    const { curve, spectrogram } = changingFile()
    const store = useSplitStore()
    store.open(curve, timing(curve), spectrogram)
    const opened = store.contrastCurve

    store.setDepthSetting(20)
    store.setSilenceThreshold(-40)

    expect(store.contrastCurve).toBe(opened)
    store.reset()
    expect(store.contrastCurve).toBeNull()
  })
})

/*
A file of `lengthSeconds` of music at one loudness whose sound changes at each time in `changes`.
Each stretch of sound raises its own 20 bands (sound 0 the first 20, sound 1 the next, up to 5) by
`bump` stored levels, so a change from one to the next lowers 20 bands and raises 20 by the same
amount: 2 × 20 of the 119 bands that count, a contrast of 0.58 × the bump in dB (a level is
100 / 255 dB) at the change, once a minute of each sound is either side of it. `gapAt` puts a
silence of `gapSeconds` there, which is a gap and is left out of the contrast.
*/
function soundFile(
  lengthSeconds: number,
  changes: number[],
  { bump = 51, gapAt, gapSeconds = 2 }: { bump?: number; gapAt?: number; gapSeconds?: number } = {},
) {
  const columns = lengthSeconds * 20
  const bands = new Uint8Array(columns * SPECTRUM_BAND_COUNT).fill(60)
  for (let column = 0; column < columns; column++) {
    const sound = changes.filter((change) => change * 20 <= column).length % 5
    for (let band = sound * 20; band < sound * 20 + 20; band++) {
      bands[column * SPECTRUM_BAND_COUNT + band] = 60 + bump
    }
  }
  const curve = curveOf([LOUD, columns])
  if (gapAt !== undefined) {
    curve.fill(QUIET, (gapAt - gapSeconds / 2) * 20, (gapAt + gapSeconds / 2) * 20)
  }
  return { curve, spectrogram: { bands, bandCount: SPECTRUM_BAND_COUNT, topHz: 22_050 } }
}

// The store with a sound file opened and contrast switched on.
function openSoundFile(...fileArguments: Parameters<typeof soundFile>) {
  const { curve, spectrogram } = soundFile(...fileArguments)
  const store = useSplitStore()
  store.open(curve, timing(curve), spectrogram)
  store.setContrastOn(true)
  return store
}

describe('the contrast splits of the split store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('the settings', () => {
    it('start with contrast off at 5.4 dB, and change no split', () => {
      const { curve, spectrogram } = soundFile(600, [300])
      const store = useSplitStore()
      store.open(curve, timing(curve), spectrogram)
      expect(store.contrastOn).toBe(false)
      expect(store.contrastThreshold).toBeCloseTo(5.4, 9)

      store.setContrastOn(true)
      store.setContrastThreshold(7.5)

      expect(store.contrastOn).toBe(true)
      expect(store.contrastThreshold).toBe(7.5)
      expect(store.splits).toEqual([])
    })

    it('hold the threshold to its slider: 3 to 12 dB in tenths', () => {
      const store = useSplitStore()

      store.setContrastThreshold(2)
      expect(store.contrastThreshold).toBe(3)
      store.setContrastThreshold(20)
      expect(store.contrastThreshold).toBe(12)
      store.setContrastThreshold(6.04)
      expect(store.contrastThreshold).toBe(6)
    })

    it('go back to the built-in ones with the others, and start over with each file', () => {
      const { curve, spectrogram } = soundFile(600, [300])
      const store = useSplitStore()
      store.open(curve, timing(curve), spectrogram)
      store.setContrastOn(true)
      store.setContrastThreshold(8)

      store.restoreBuiltIn()
      expect(store.contrastOn).toBe(false)
      expect(store.contrastThreshold).toBeCloseTo(5.4, 9)

      store.setContrastOn(true)
      store.setContrastThreshold(8)
      store.open(curve, timing(curve), spectrogram)
      expect(store.contrastOn).toBe(false)
      expect(store.contrastThreshold).toBeCloseTo(5.4, 9)
    })
  })

  describe('Find splits', () => {
    it('adds none while contrast is off, and what it adds today for the gaps and dips', () => {
      const { curve, spectrogram } = soundFile(600, [300], { gapAt: 100 })
      const withContrast = useSplitStore()
      withContrast.open(curve, timing(curve), spectrogram)
      const proposals = withContrast.proposedSplits

      setActivePinia(createPinia())
      const without = useSplitStore()
      without.open(curve, timing(curve))

      expect(proposals.map((proposal) => proposal.kind)).toEqual(['gap'])
      expect(proposals).toEqual(without.proposedSplits)
    })

    it('adds a split at the contrast peak while contrast is on, and counts it', () => {
      const store = openSoundFile(600, [300])

      expect(store.proposedSplits).toEqual([
        // 20 bands down and 20 up by 20 dB, of 119: 20 × √(40 / 119) = 11.6 dB.
        { seconds: 300, kind: 'contrast', contrast: expect.closeTo(11.6, 1) },
      ])
      store.findSplits()

      expect(store.splits.map((split) => split.seconds)).toEqual([300])
    })

    it('adds no split under the threshold, and one at it', () => {
      const store = openSoundFile(600, [300])
      const proposal = store.proposedSplits[0]
      const peak = proposal?.kind === 'contrast' ? proposal.contrast : NaN

      store.setContrastThreshold(Math.ceil(peak * 10) / 10)
      expect(store.proposedSplits).toEqual([])

      store.setContrastThreshold(Math.floor(peak * 10) / 10)
      expect(store.proposedSplits).toHaveLength(1)
    })

    it('makes a likely split from 6.5 dB and a doubtful one under it, never a sure one', () => {
      // 29 levels of bump read 6.59 dB at the change, 28 read 6.37 dB.
      const likely = openSoundFile(600, [300], { bump: 29 })
      likely.findSplits()
      setActivePinia(createPinia())
      const doubtful = openSoundFile(600, [300], { bump: 28 })
      doubtful.findSplits()
      setActivePinia(createPinia())
      const strong = openSoundFile(600, [300], { bump: 120 })
      strong.findSplits()

      expect(likely.splits[0]?.confidence).toEqual({
        band: 'likely',
        depth: null,
        contrast: expect.closeTo(6.59, 1),
      })
      expect(doubtful.splits[0]?.confidence).toEqual({
        band: 'doubtful',
        depth: null,
        contrast: expect.closeTo(6.37, 1),
      })
      expect(strong.splits[0]?.confidence?.band).toBe('likely')
    })

    it('is no edit, and its confidence goes when the split is moved', () => {
      const store = openSoundFile(600, [300])
      store.findSplits()
      expect(store.hasEdits).toBe(false)

      store.selectSplit(store.splits[0]!.id)
      store.moveSplit(store.splits[0]!.id, 301)

      expect(store.splits[0]?.confidence).toBeNull()
    })

    it('adds two contrast splits 20 s apart', () => {
      const store = openSoundFile(900, [300, 320])

      expect(store.proposedSplits.map((proposal) => proposal.seconds)).toEqual([300, 320])
    })
  })

  describe('the room around a boundary', () => {
    it('keeps 60 s from a gap, which proposes its own split', () => {
      const near = openSoundFile(600, [300], { gapAt: 250 })
      expect(near.proposedSplits.map((proposal) => proposal.kind)).toEqual(['gap'])

      setActivePinia(createPinia())
      const far = openSoundFile(600, [300], { gapAt: 230 })
      expect(far.proposedSplits.map((proposal) => proposal.kind)).toEqual(['gap', 'contrast'])
    })

    it('keeps 60 s from an existing split', () => {
      const near = openSoundFile(600, [300])
      near.addSplitAt(341)
      expect(near.proposedSplits).toEqual([])

      setActivePinia(createPinia())
      const far = openSoundFile(600, [300])
      far.addSplitAt(239)
      expect(far.proposedSplits.map((proposal) => proposal.seconds)).toEqual([300])
    })

    it('keeps 60 s from the middle of a gap that holds a split, wherever in the gap it is', () => {
      // The gap runs from 246 s to 254 s, its middle at 250 s. The split is at its start, 60.3 s from
      // the change at 306.5 s, which is 56.5 s from the middle.
      const store = openSoundFile(600, [306.5], { gapAt: 250, gapSeconds: 8 })
      expect(store.proposedSplits.map((proposal) => proposal.kind)).toEqual(['gap'])

      store.addSplitAt(246.2)

      expect(store.proposedSplits).toEqual([])
    })

    it('keeps 60 s from the ends of the file', () => {
      expect(openSoundFile(600, [40]).proposedSplits).toEqual([])
      setActivePinia(createPinia())
      expect(openSoundFile(600, [560]).proposedSplits).toEqual([])
      setActivePinia(createPinia())
      expect(openSoundFile(600, [100]).proposedSplits).toHaveLength(1)
    })
  })
})
