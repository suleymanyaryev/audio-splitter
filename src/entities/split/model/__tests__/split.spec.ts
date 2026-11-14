import { beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DEFAULT_MINIMUM_GAP_SECONDS, DEFAULT_OFFSET_DB } from '../../config/defaults.ts'
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

  it('forgets everything on reset', () => {
    const curve = twoGaps()
    const store = useSplitStore()
    store.detect(curve, timing(curve))

    store.reset()

    expect(store.silenceThreshold).toBeNull()
    expect(store.gaps).toEqual([])
    expect(store.splits).toEqual([])
    expect(store.tracks).toEqual([])
  })
})
