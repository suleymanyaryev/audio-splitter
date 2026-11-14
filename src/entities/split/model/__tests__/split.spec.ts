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
  store.moveSplit(store.splits[0]!.id, 25)
  store.deleteSplit(store.splits[1]!.id)
  store.moveZoomTo(50)
  store.addSplit()
  store.renameTrack(null, 'Opening')
  expect(store.editCount).toBe(4)
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
    it('selects split 1 and centres the window on it when detection ends', () => {
      const curve = farGaps()
      const store = useSplitStore()

      store.detect(curve, timing(curve))

      expect(store.selectedSplitId).toBe(store.splits[0]!.id)
      expect(store.selectedSplit).toBe(store.splits[0])
      expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
    })

    it('selects nothing and starts the window at 0:00 when there is no split', () => {
      const curve = curveOf([LOUD, 100])
      const store = useSplitStore()

      store.detect(curve, timing(curve))

      expect(store.selectedSplitId).toBeNull()
      expect(store.selectedSplit).toBeNull()
      expect(store.zoomCentreSeconds).toBe(ZOOM_WINDOW_SECONDS / 2)
      expect(store.zoomCentreSeconds).toBe(10)
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

      expect(store.selectedSplit).toBe(store.splits[0])
      expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
    })

    it('moves the window to a time and selects nothing', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.moveZoomTo(31.5)

      expect(store.zoomCentreSeconds).toBe(31.5)
      expect(store.selectedSplitId).toBeNull()
      expect(store.selectedSplit).toBeNull()
    })

    it('says which place in the order the selected split has, or null with none', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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

    it('selects the split where a track starts, and leaves the first track alone', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))

      store.selectTrack(store.tracks[2]!)

      expect(store.selectedSplit).toBe(store.splits[1])
      expect(store.zoomCentreSeconds).toBeCloseTo(42, 9)

      store.selectTrack(store.tracks[0]!)

      expect(store.selectedSplit).toBe(store.splits[1])
      expect(store.zoomCentreSeconds).toBeCloseTo(42, 9)
    })

    it('marks as selected only the track that starts at the selected split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      expect(selectedTracks(store)).toEqual([false, true, false])

      store.selectSplit(store.splits[1]!.id)
      expect(selectedTracks(store)).toEqual([false, false, true])

      // The first track starts with the file, so no selection makes it selected.
      store.moveZoomTo(31.5)
      expect(selectedTracks(store)).toEqual([false, false, false])
    })

    it('selects split 1 again and recentres after every setting change', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[1]!.id)

      store.setMinimumGapLength(3)

      expect(store.selectedSplit).toBe(store.splits[0])
      expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)

      store.moveZoomTo(50)
      store.setSilenceThreshold(-45)

      expect(store.selectedSplit).toBe(store.splits[0])
      expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
    })

    it('selects nothing and returns the window to 0:00 when a setting change leaves no split', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
      store.selectSplit(store.splits[1]!.id)

      store.setSilenceThreshold(-60)

      expect(store.selectedSplitId).toBeNull()
      expect(store.zoomCentreSeconds).toBe(10)
    })
  })

  describe('moving a split', () => {
    it('moves the split to the requested time and keeps its track name', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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

      store.moveSplit(store.splits[0]!.id, 25)

      expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
      expect(store.selectedSplit).toBe(store.splits[0])
    })

    it('stops at the window edges, 10 s either side of the centre', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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
      expect(store.selectedSplitId).toBeNull()
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
        store.deleteSplit(store.splits[1]!.id)

        store.deleteSplit(store.splits[0]!.id)

        expect(store.splits).toEqual([])
        expect(store.selectedSplitId).toBeNull()
        expect(store.zoomCentreSeconds).toBeCloseTo(22, 9)
      })

      it('keeps the selection and the window when another split is deleted', () => {
        const curve = threeFarGapsCurve()
        const store = useSplitStore()
        store.detect(curve, timing(curve))
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

      store.moveSplit(store.selectedSplitId!, 33)
      store.moveSplit(store.selectedSplitId!, 34)

      expect(store.editCount).toBe(1)
    })

    it('counts a deleted detected split once, and a move of it is replaced by the deletion', () => {
      const curve = farGaps()
      const store = useSplitStore()
      store.detect(curve, timing(curve))
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

      store.deleteSplit(store.selectedSplitId!)

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
      store.renameTrack(store.selectedSplitId, 'Hidden')
      expect(store.editCount).toBe(2)

      store.deleteSplit(store.selectedSplitId!)

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

  it('forgets everything on reset', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.detect(curve, timing(curve))

    store.reset()

    expect(store.silenceThreshold).toBeNull()
    expect(store.gaps).toEqual([])
    expect(store.splits).toEqual([])
    expect(store.tracks).toEqual([])
    expect(store.selectedSplitId).toBeNull()
    expect(store.zoomCentreSeconds).toBe(10)
  })
})
