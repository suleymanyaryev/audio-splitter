import { beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DEFAULT_MINIMUM_GAP_SECONDS, DEFAULT_OFFSET_DB } from '../../config/defaults.ts'
import { MAX_TRACK_NAME_LENGTH } from '../../config/track-name.ts'
import { ZOOM_WINDOW_SECONDS } from '../../config/zoom-window.ts'
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
12 s, median -10 dB. Quiet from 2 s to 5 s (3 s) and from 7 s to 9 s (2 s, the default minimum),
so the splits are at 3.5 s and 8 s and the tracks are 3.5 s, 4.5 s and 4 s long.
*/
const twoGaps = () => curveOf([LOUD, 40], [QUIET, 60], [LOUD, 40], [QUIET, 40], [LOUD, 60])

/*
60 s, median -10 dB. Quiet from 20 s to 24 s and from 40 s to 44 s, so the splits are at 22 s and
42 s: 20 s apart, so the zoom window on one (centre ± 10 s) never reaches the other.
*/
const farGaps = () => curveOf([LOUD, 400], [QUIET, 80], [LOUD, 320], [QUIET, 80], [LOUD, 320])

// Three splits at 22 s, 42 s and 62 s, each 20 s from the next, in a 80 s file.
const threeFarGapsCurve = () =>
  curveOf([LOUD, 400], [QUIET, 80], [LOUD, 320], [QUIET, 80], [LOUD, 320], [QUIET, 80], [LOUD, 320])

// Every kind of edit at once: split 1 moved, split 2 deleted, one added, a track renamed.
function editedStore() {
  const curve = threeFarGapsCurve()
  const store = useSplitStore()
  store.detect(curve, timing(curve))
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
  store.detect(curve, timing(curve))
  const [first, second, third] = store.splits
  store.renameTrack(null, 'A')
  store.renameTrack(first!.id, 'B')
  store.renameTrack(second!.id, 'C')
  store.renameTrack(third!.id, 'D')
  return store
}

const trackNames = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => track.name)

// A range does not depend on the splits; 60 s with two of them will do.
function loadedStore() {
  const curve = farGaps()
  const store = useSplitStore()
  store.detect(curve, timing(curve))
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

const selectedTracks = (store: ReturnType<typeof useSplitStore>) =>
  store.tracks.map((track) => store.isTrackSelected(track))

describe('the split store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts the silence threshold at the median minus the default offset, and the minimum gap at its default', () => {
    // 140 of the 240 windows are at -10 dB, so the median is -10 dB.
    const curve = twoGaps()
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(store.silenceThreshold).toBe(-10 - DEFAULT_OFFSET_DB)
    expect(store.minimumGapLength).toBe(DEFAULT_MINIMUM_GAP_SECONDS)
  })

  it('rounds the starting threshold to the Slider step of 0.1 dB', () => {
    // sample1.m4a: median -16.72 dB, so -34.72 dB rounds to -34.7 dB, as the readout shows it.
    const curve = curveOf([-16.72, 100])
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(store.silenceThreshold).toBeCloseTo(-34.7, 12)
  })

  it('proposes a split in the middle of each gap, with no names yet', () => {
    const curve = twoGaps()
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(store.gaps).toHaveLength(2)
    expect(store.splits.map((split) => split.seconds)).toEqual([
      expect.closeTo(3.5, 9),
      expect.closeTo(8, 9),
    ])
    expect(store.splits.map((split) => split.name)).toEqual([null, null])
    expect(store.firstTrackName).toBeNull()
  })

  it('makes N + 1 numbered tracks from N splits, the last one running to the end of the file', () => {
    const curve = twoGaps()
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(store.tracks.map((track) => track.number)).toEqual([1, 2, 3])
    expect(store.tracks.map((track) => track.name)).toEqual(['1', '2', '3'])
    expect(store.tracks.map((track) => track.startSeconds)).toEqual([
      0,
      expect.closeTo(3.5, 9),
      expect.closeTo(8, 9),
    ])
    expect(store.tracks.map((track) => track.lengthSeconds)).toEqual([
      expect.closeTo(3.5, 9),
      expect.closeTo(4.5, 9),
      expect.closeTo(4, 9),
    ])
    const total = store.tracks.reduce((sum, track) => sum + track.lengthSeconds, 0)
    expect(total).toBeCloseTo(12, 9)
  })

  it('tells which split starts each track: none for the first', () => {
    const curve = twoGaps()
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(store.tracks[0]?.startSplit).toBeNull()
    expect(store.tracks[1]?.startSplit).toBe(store.splits[0])
    expect(store.tracks[2]?.startSplit).toBe(store.splits[1])
  })

  it('shows a track name when the track has one, and keeps the others numbered by position', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.detect(curve, timing(curve))

    store.firstTrackName = 'Opening'
    store.splits[1]!.name = 'Encore'

    expect(store.tracks.map((track) => track.name)).toEqual(['Opening', '2', 'Encore'])
  })

  it('is one track over the whole file when there is no split', () => {
    const curve = curveOf([LOUD, 100])
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(store.splits).toEqual([])
    expect(store.tracks).toEqual([
      { number: 1, name: '1', startSeconds: 0, lengthSeconds: 5, startSplit: null },
    ])
  })

  it('keeps a lead-in and a run-out as gaps but proposes no split in them', () => {
    // 2.5 s quiet, 5 s loud (so the median is -10 dB), 2.5 s quiet.
    const curve = curveOf([QUIET, 50], [LOUD, 100], [QUIET, 50])
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(store.gaps.map((gap) => gap.edge)).toEqual(['lead-in', 'run-out'])
    expect(store.splits).toEqual([])
    expect(store.tracks).toHaveLength(1)
  })

  it('finds the gaps again when the silence threshold moves, and replaces every split and name', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.detect(curve, timing(curve))
    store.firstTrackName = 'Opening'
    store.splits[0]!.name = 'Middle'

    // A threshold under every window's level: nothing is quiet.
    store.setSilenceThreshold(-60)

    expect(store.silenceThreshold).toBe(-60)
    expect(store.gaps).toEqual([])
    expect(store.splits).toEqual([])
    expect(store.firstTrackName).toBeNull()

    store.setSilenceThreshold(-25)

    expect(store.splits).toHaveLength(2)
    expect(store.splits.map((split) => split.name)).toEqual([null, null])
  })

  it('finds the gaps again when the minimum gap length changes, and replaces every name', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.detect(curve, timing(curve))
    store.firstTrackName = 'Opening'
    store.splits[1]!.name = 'Encore'

    // The 2 s gap is dropped; the 3 s gap stays.
    store.setMinimumGapLength(2.5)

    expect(store.minimumGapLength).toBe(2.5)
    expect(store.splits.map((split) => split.seconds)).toEqual([expect.closeTo(3.5, 9)])
    expect(store.splits[0]?.name).toBeNull()
    expect(store.firstTrackName).toBeNull()
  })

  it('keeps the silence threshold the user set when the minimum gap length changes', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.detect(curve, timing(curve))
    store.setSilenceThreshold(-40)

    store.setMinimumGapLength(1.5)

    expect(store.silenceThreshold).toBe(-40)
  })

  it('does not change the curve it was given', () => {
    const curve = twoGaps()
    const before = Float32Array.from(curve)
    const store = useSplitStore()

    store.detect(curve, timing(curve))

    expect(curve).toEqual(before)
  })

  it('starts over with the defaults of a new file on the next detection', () => {
    const store = useSplitStore()
    const first = twoGaps()
    store.detect(first, timing(first))
    store.setSilenceThreshold(-40)
    store.setMinimumGapLength(3)

    const second = curveOf([-20, 100])
    store.detect(second, timing(second))

    expect(store.silenceThreshold).toBe(-20 - DEFAULT_OFFSET_DB)
    expect(store.minimumGapLength).toBe(DEFAULT_MINIMUM_GAP_SECONDS)
    expect(store.tracks).toHaveLength(1)
  })

  it('gives every split its own id, and keeps it when the split moves', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.detect(curve, timing(curve))

    const [first, second] = store.splits
    expect(first!.id).not.toBe(second!.id)

    store.moveSplit(first!.id, 3)

    expect(store.splits.map((split) => split.id)).toEqual([first!.id, second!.id])
  })

  describe('selection and the zoom window', () => {
    it('selects track 1 and starts the window at the file’s start when detection ends', () => {
      const curve = farGaps()
      const store = useSplitStore()

      store.detect(curve, timing(curve))

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.selectedSplit).toBeNull()
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
    })

    it('opens the same way on a file with no gap, one track over the whole file', () => {
      const curve = curveOf([LOUD, 100])
      const store = useSplitStore()

      store.detect(curve, timing(curve))

      expect(store.tracks).toHaveLength(1)
      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.selectedSplit).toBeNull()
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
      expect(store.view).toBe('track')
    })

    it('selects a split and centres the window on it', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.selectSplit(store.splits[1]!.id)

      expect(store.selectedSplit).toBe(store.splits[1])
      expect(store.zoomCentreSeconds).toBeCloseTo(42, 9)
    })

    it('ignores an id that is no split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.selectSplit(-1)

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
    })

    it('moves the window to a time and selects nothing', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.moveZoomTo(31.5)

      expect(store.zoomCentreSeconds).toBe(31.5)
      expect(store.selectedSplit).toBeNull()
      expect(store.selectedSplit).toBeNull()
    })

    it('says which place in the order the selected split has, or null with none', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))
      store.moveZoomTo(31.5)
      store.addSplit()

      expect(store.selectedSplitIndex).toBe(1)
      expect(store.splits).toHaveLength(3)
    })

    it('selects a track, the first included, and clears the selected split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

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
      store.detect(curve, timing(curve))
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
      other.detect(curve, timing(curve))
      const track = other.tracks[0]!
      other.reset()

      other.selectTrack(track)

      expect(other.selectedTrack).toBeNull()
      expect(other.view).toBe('split')
    })

    it('clears the selected track when a split is selected', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectTrack(store.tracks[1]!)

      store.selectSplit(store.splits[1]!.id)

      expect(store.selectedTrack).toBeNull()
      expect(store.selectedSplit).toBe(store.splits[1])
    })

    it('clears the selected track when the zoom window is moved', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectTrack(store.tracks[1]!)

      store.moveZoomTo(5)

      expect(store.selectedTrack).toBeNull()
    })

    it('does not move the zoom window when a track is selected', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))
      // Detection selects the first track.
      expect(selectedTracks(store)).toEqual([true, false, false])

      store.selectTrack(store.tracks[1]!)
      expect(selectedTracks(store)).toEqual([false, true, false])

      store.selectTrack(store.tracks[2]!)
      expect(selectedTracks(store)).toEqual([false, false, true])

      store.selectSplit(store.splits[1]!.id)
      expect(selectedTracks(store)).toEqual([false, false, false])
    })

    it('selects track 1 again and returns the window to the start after every setting change', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[1]!.id)

      store.setMinimumGapLength(3)

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.selectedSplit).toBeNull()
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)

      store.moveZoomTo(50)
      store.setSilenceThreshold(-45)

      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
    })

    it('selects the only track and returns the window to 0:00 when a setting change leaves no split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[1]!.id)

      store.setSilenceThreshold(-60)

      expect(store.selectedSplit).toBeNull()
      expect(store.selectedTrack).toBe(store.tracks[0])
      expect(store.zoomCentreSeconds).toBe(10)
    })
  })

  describe('moving a split', () => {
    it('moves the split to the requested time and keeps its track name', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[0]!.id)

      store.moveSplit(store.splits[0]!.id, 25)

      expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
      expect(store.selectedSplit).toBe(store.splits[0])
    })

    it('stops at the window edges, 10 s either side of the centre', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[0]!.id)
      const id = store.splits[0]!.id

      store.moveSplit(id, 40)
      expect(store.splits[0]!.seconds).toBeCloseTo(32, 9)

      store.moveSplit(id, 3)
      expect(store.splits[0]!.seconds).toBeCloseTo(12, 9)
    })

    it('stays 1 s from its neighbouring splits', () => {
      // The window on split 1 (3.5 s) runs from -6.5 s to 13.5 s, so it reaches split 2 (8 s).
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.moveSplit(store.splits[0]!.id, 9)
      expect(store.splits[0]!.seconds).toBeCloseTo(7, 9)

      store.selectSplit(store.splits[1]!.id)
      store.moveSplit(store.splits[1]!.id, 0)
      expect(store.splits[1]!.seconds).toBeCloseTo(8, 9)
    })

    it('stays 1 s from the start and the end of the file', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.moveSplit(store.splits[0]!.id, 0)
      expect(store.splits[0]!.seconds).toBeCloseTo(1, 9)

      store.selectSplit(store.splits[1]!.id)
      store.moveSplit(store.splits[1]!.id, 12)
      expect(store.splits[1]!.seconds).toBeCloseTo(11, 9)
    })

    it('never reorders the splits', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.moveSplit(store.splits[1]!.id, 0)

      expect(store.splits[0]!.seconds).toBeLessThan(store.splits[1]!.seconds)
    })

    it('leaves a split where it was when it is outside the window', () => {
      // Split 1 is selected, the window is on 12 s to 32 s, and split 2 is at 42 s.
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.moveSplit(store.splits[1]!.id, 35)

      expect(store.splits[1]!.seconds).toBeCloseTo(42, 9)
    })

    it('leaves a split where it was when its limits cannot all be met', () => {
      // Splits 0.7 s apart: split 1 must be under 3.2 s to be 1 s from split 2, but it is at 3.5 s.
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.splits[1]!.seconds = 4.2

      store.moveSplit(store.splits[0]!.id, 3)
      expect(store.splits[0]!.seconds).toBeCloseTo(3.5, 9)

      store.moveSplit(store.splits[0]!.id, 2)
      expect(store.splits[0]!.seconds).toBeCloseTo(3.5, 9)
    })

    it('ignores an id that is no split', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

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
      store.detect(curve, timing(curve))
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
      expect(store.tracks.map((track) => track.name)).toEqual(['1', '2', '3', '4'])
    })

    it('does nothing when there is no room for it', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))
      store.splits[1]!.name = 'Encore'
      store.moveZoomTo(31.5)

      store.addSplit()

      expect(store.tracks.map((track) => track.name)).toEqual(['1', '2', '3', 'Encore'])
    })
  })

  describe('whether a split can be added', () => {
    it('is false before detection, and true on open ground between splits', () => {
      const store = useSplitStore()
      expect(store.canAddSplit).toBe(false)

      const curve = farGaps()
      store.detect(curve, timing(curve))
      store.moveZoomTo(31.5)

      expect(store.canAddSplit).toBe(true)
    })

    it('is false within 1 s of a split, and true at exactly 1 s', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))

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
      store.detect(curve, timing(curve))

      expect(store.canAddSplit).toBe(false)
    })
  })

  describe('deleting a split', () => {
    it('removes the split and its track name, so the merged track keeps the earlier name', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.firstTrackName = 'Opening'
      store.splits[0]!.name = 'Middle'
      store.splits[1]!.name = 'Encore'

      store.deleteSplit(store.splits[0]!.id)

      expect(store.splits.map((split) => split.seconds)).toEqual([expect.closeTo(8, 9)])
      expect(store.tracks.map((track) => track.name)).toEqual(['Opening', 'Encore'])
      expect(store.tracks[0]!.lengthSeconds).toBeCloseTo(8, 9)
    })

    describe('the selection afterwards', () => {
      it('moves to the next split, centring the window on it, when the selected one goes', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
        store.selectSplit(store.splits[1]!.id)

        store.deleteSplit(store.splits[1]!.id)

        expect(store.splits).toHaveLength(2)
        expect(store.selectedSplit).toBe(store.splits[1])
        expect(store.zoomCentreSeconds).toBeCloseTo(62, 9)
      })

      it('moves to the previous split when the selected one was the last', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
        store.selectSplit(store.splits[2]!.id)

        store.deleteSplit(store.splits[2]!.id)

        expect(store.selectedSplit).toBe(store.splits[1])
        expect(store.zoomCentreSeconds).toBeCloseTo(42, 9)
      })

      it('selects nothing and leaves the window where it is when no split remains', () => {
        const curve = farGaps()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
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
        store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))

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
        store.detect(curve, timing(curve))
        store.deleteSplit(store.splits[1]!.id)

        store.removeTrack(store.tracks[0]!)

        expect(store.splits).toEqual([])
        expect(store.tracks).toHaveLength(1)
      })

      it('refuses the only track, whose removal would remove the file', () => {
        const curve = curveOf([LOUD, 100])
        const store = useSplitStore()
        store.detect(curve, timing(curve))

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
        store.detect(curve, timing(curve))
        store.renameTrack(null, 'A')

        store.removeTrack(store.tracks[0]!)

        expect(store.firstTrackName).toBeNull()
        expect(trackNames(store)).toEqual(['1', '2', '3'])
      })

      it('keeps the names of the tracks that were not merged', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[1]!)

        expect(store.tracks[1]!.name).toBe('D')
        expect(store.tracks[1]!.number).toBe(2)
      })
    })

    describe('the edit count', () => {
      it('counts each detected split it deletes: two in the middle, one at an edge', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))

        store.removeTrack(store.tracks[1]!)
        expect(store.editCount).toBe(2)

        store.removeTrack(store.tracks[1]!)
        expect(store.editCount).toBe(3)
      })

      it('takes the added edit back for an added split, and counts a detected one', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
        store.moveZoomTo(52)
        store.addSplit()
        expect(store.editCount).toBe(1)

        // Track 3 runs from the detected split at 42 s to the added one at 52 s.
        store.removeTrack(store.tracks[2]!)

        expect(store.splits.map((split) => split.seconds)).toEqual([
          expect.closeTo(22, 9),
          expect.closeTo(62, 9),
        ])
        expect(store.editCount).toBe(1)
      })

      it('counts nothing for a track between two added splits', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
        store.moveZoomTo(30)
        store.addSplit()
        store.moveZoomTo(36)
        store.addSplit()
        expect(store.editCount).toBe(2)

        store.removeTrack(store.tracks[2]!)

        expect(store.splits).toHaveLength(3)
        expect(store.editCount).toBe(0)
      })

      it('drops the moved and the renamed edits of the splits it deletes', () => {
        const store = namedFourTracks()
        store.selectSplit(store.splits[0]!.id)
        store.moveSplit(store.splits[0]!.id, 23)
        // A, B, C and D are four renamed tracks, and split 1 moved: five edits.
        expect(store.editCount).toBe(5)

        store.removeTrack(store.tracks[1]!)

        // Splits 1 and 2 are deleted (two edits) with B's and C's rename and split 1's move
        // gone: what is left is A, D and the two deletions.
        expect(store.editCount).toBe(4)
      })

      it('counts the file’s start as renamed while the first track holds a name after the removal', () => {
        const store = namedFourTracks()

        store.removeTrack(store.tracks[0]!)

        // The deleted split, the file's start (now B), C and D.
        expect(store.editCount).toBe(4)
      })

      it('counts no rename for the file’s start when the first track is left unnamed', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
        store.renameTrack(null, 'A')
        expect(store.editCount).toBe(1)

        store.removeTrack(store.tracks[0]!)

        // The deleted split only: the next track had no name to move to the file's start.
        expect(store.editCount).toBe(1)
      })

      it('counts a rename for the file’s start when the removed first track had none', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
        store.renameTrack(store.splits[0]!.id, 'B')

        store.removeTrack(store.tracks[0]!)

        expect(store.editCount).toBe(2)
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
        store.detect(curve, timing(curve))
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
      store.detect(curve, timing(curve))

      store.renameTrack(store.splits[1]!.id, 'Encore')
      store.renameTrack(null, 'Opening')

      expect(store.tracks.map((track) => track.name)).toEqual(['Opening', '2', 'Encore'])
      expect(store.splits[1]!.name).toBe('Encore')
      expect(store.firstTrackName).toBe('Opening')
    })

    it('trims the name', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.renameTrack(store.splits[0]!.id, '  Intro \t')

      expect(store.splits[0]!.name).toBe('Intro')
    })

    it('falls back to the number when the name is empty after trimming', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.renameTrack(store.splits[0]!.id, 'Intro')
      store.renameTrack(null, 'Opening')

      store.renameTrack(store.splits[0]!.id, ' '.repeat(3))
      store.renameTrack(null, '')

      expect(store.splits[0]!.name).toBeNull()
      expect(store.firstTrackName).toBeNull()
      expect(store.tracks.map((track) => track.name)).toEqual(['1', '2', '3'])
    })

    it('keeps at most 100 characters, counted after trimming', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.renameTrack(store.splits[0]!.id, `  ${'a'.repeat(150)}`)

      expect(MAX_TRACK_NAME_LENGTH).toBe(100)
      expect(store.splits[0]!.name).toBe('a'.repeat(100))
    })

    it('ignores an id that is no split', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.renameTrack(-1, 'Ghost')

      expect(store.tracks.map((track) => track.name)).toEqual(['1', '2', '3'])
      expect(store.firstTrackName).toBeNull()
    })
  })

  describe('the edit count', () => {
    it('is 0 after detection, and selecting or moving the window are not edits', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.selectSplit(store.splits[1]!.id)
      store.moveZoomTo(5)

      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
    })

    it('counts a moved split once, however often it moves', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[0]!.id)
      const id = store.splits[0]!.id

      store.moveSplit(id, 23)
      store.moveSplit(id, 24)
      store.moveSplit(id, 21.5)

      expect(store.editCount).toBe(1)
      expect(store.hasEdits).toBe(true)
    })

    it('does not count a move that leaves the split where it was', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      // Split 2 is outside the window and does not move; split 1 is asked to go where it is.
      store.moveSplit(store.splits[1]!.id, 35)
      store.moveSplit(store.splits[0]!.id, store.splits[0]!.seconds)

      expect(store.editCount).toBe(0)
    })

    it('counts a move held at a limit once, and a second push at the same limit not at all', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[0]!.id)
      const id = store.splits[0]!.id

      store.moveSplit(id, 40)
      store.moveSplit(id, 41)

      expect(store.editCount).toBe(1)
    })

    it('counts an added split once, and moving it adds no edit', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.moveZoomTo(31.5)

      store.addSplit()
      expect(store.editCount).toBe(1)

      store.moveSplit(store.selectedSplit!.id, 33)
      store.moveSplit(store.selectedSplit!.id, 34)

      expect(store.editCount).toBe(1)
    })

    it('counts a deleted detected split once, and a move of it is replaced by the deletion', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[0]!.id)
      const id = store.splits[0]!.id
      store.moveSplit(id, 25)
      expect(store.editCount).toBe(1)

      store.deleteSplit(id)
      expect(store.editCount).toBe(1)

      store.deleteSplit(store.splits[0]!.id)
      expect(store.editCount).toBe(2)
    })

    it('takes back the edit of an added split when it is deleted again', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.moveZoomTo(31.5)
      store.addSplit()
      expect(store.editCount).toBe(1)

      store.deleteSplit(store.selectedSplit!.id)

      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
    })

    it('counts a renamed track once, however often it is renamed', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.renameTrack(store.splits[0]!.id, 'Intro')
      store.renameTrack(store.splits[0]!.id, 'Intro 2')
      expect(store.editCount).toBe(1)

      store.renameTrack(null, 'Opening')
      expect(store.editCount).toBe(2)
    })

    it('does not count a rename that leaves the stored name as it was', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

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
      store.detect(curve, timing(curve))
      store.renameTrack(store.splits[0]!.id, 'Intro')
      store.renameTrack(null, 'Opening')

      store.renameTrack(store.splits[0]!.id, '')
      expect(store.editCount).toBe(1)

      store.renameTrack(null, '  ')
      expect(store.editCount).toBe(0)
    })

    it('drops the rename of the track of a deleted split, and counts the deletion', () => {
      const curve = twoGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.renameTrack(store.splits[0]!.id, 'Intro')
      store.renameTrack(store.splits[1]!.id, 'Encore')
      expect(store.editCount).toBe(2)

      store.deleteSplit(store.splits[0]!.id)

      // The deletion and the rename of the track that is left.
      expect(store.editCount).toBe(2)
    })

    it('drops the rename of an added split with it', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.moveZoomTo(31.5)
      store.addSplit()
      store.renameTrack(store.selectedSplit!.id, 'Hidden')
      expect(store.editCount).toBe(2)

      store.deleteSplit(store.selectedSplit!.id)

      expect(store.editCount).toBe(0)
    })

    it('starts again at 0 when a new file is detected', () => {
      const store = editedStore()
      const second = twoGaps()

      store.detect(second, timing(second))

      expect(store.editCount).toBe(0)
      store.moveSplit(store.splits[0]!.id, 3)
      expect(store.editCount).toBe(1)
    })

    it('starts again at 0 when the silence threshold changes', () => {
      const store = editedStore()

      store.setSilenceThreshold(-45)

      expect(store.editCount).toBe(0)
      expect(store.hasEdits).toBe(false)
    })

    it('starts again at 0 when the minimum gap length changes', () => {
      const store = editedStore()

      store.setMinimumGapLength(3)

      expect(store.editCount).toBe(0)
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
      store.detect(curve, timing(curve))

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

    it('is cleared by a detection, and forgotten on reset', () => {
      const store = loadedStore()
      store.placeTrackMark(14)
      store.setMinimumGapLength(3)
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
      store.detect(curve, timing(curve))
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

      it('is 1 s from the file’s start in the first track, and from its end in the last', () => {
        const store = loadedStore()

        store.addPendingSplit(0.5, false)
        store.addPendingSplit(1, false)
        expect(store.pendingSplits).toEqual([1])

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
        store.selectTrack(store.tracks[1]!)

        expect(store.pendingSplits).toEqual([])
        expect(store.selectedPendingSplit).toBeNull()
      })

      it('empties them when a split is selected, and when the zoom window is moved', () => {
        const store = pendingTwo()
        store.selectSplit(store.splits[0]!.id)
        expect(store.pendingSplits).toEqual([])

        store.selectTrack(store.tracks[1]!)
        store.addPendingSplit(27, false)
        store.moveZoomTo(5)
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

        expect(store.pendingSplits).toEqual([])
      })

      it('empties them when a split is added inside the track, and keeps them for one in another', () => {
        const store = pendingTwo()
        store.addSplitAt(10)
        expect(store.pendingSplits).toEqual([27, 36])

        store.addSplitAt(40)
        expect(store.pendingSplits).toEqual([])
      })

      it('empties them when a detection runs', () => {
        const store = pendingTwo()

        store.setMinimumGapLength(3)

        expect(store.pendingSplits).toEqual([])
        expect(store.selectedPendingSplit).toBeNull()
      })

      it('empties them on reset', () => {
        const store = pendingTwo()

        store.reset()

        expect(store.pendingSplits).toEqual([])
        expect(store.selectedPendingSplit).toBeNull()
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
      expect(store.tracks.map((track) => track.name)).toEqual(['1', '2', '3', '4'])
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

    describe('after a detection', () => {
      it('shows the track view for the first one, with the window at the start', () => {
        const store = loadedStore()

        expect(store.view).toBe('track')
        expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
      })

      it('shows the track view for a setting change from the split view or the track view', () => {
        const store = loadedStore()
        store.selectSplit(store.splits[1]!.id)

        store.setMinimumGapLength(3)
        expect(store.view).toBe('track')
        expect(store.selectedTrack).toBe(store.tracks[0])

        store.selectTrack(store.tracks[1]!)
        store.setSilenceThreshold(-45)
        expect(store.view).toBe('track')
        expect(store.selectedTrack).toBe(store.tracks[0])
      })

      it('keeps the range view for a setting change, with track 1 selected behind it', () => {
        const store = loadedStore()
        store.setRange(10, 20)
        store.selectSplit(store.splits[1]!.id)
        store.showView('range')

        store.setSilenceThreshold(-45)

        expect(store.view).toBe('range')
        expect(store.selectedTrack).toBe(store.tracks[0])
        expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
      })

      it('shows the track view for the first detection of a new file even with a range on show', () => {
        const store = loadedStore()
        store.setRange(10, 20)

        const second = twoGaps()
        store.detect(second, timing(second))

        expect(store.view).toBe('track')
      })

      it('shows the track view when the setting change was made from the split view with a range held', () => {
        const store = loadedStore()
        store.setRange(10, 20)
        store.showView('split')

        store.setMinimumGapLength(3)

        expect(store.view).toBe('track')
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
    store.detect(curve, timing(curve))

    store.reset()

    expect(store.silenceThreshold).toBeNull()
    expect(store.gaps).toEqual([])
    expect(store.splits).toEqual([])
    expect(store.tracks).toEqual([])
    expect(store.selectedSplit).toBeNull()
    expect(store.zoomCentreSeconds).toBe(10)
  })
})
