import { describe, it, expect } from 'vitest'

import type { Track } from '@/entities/split/model/split.ts'
import { trackExtent } from '../track-extent.ts'

const track = (startSeconds: number, lengthSeconds: number): Track => ({
  number: 2,
  inclusion: 'included',
  isLeftOut: false,
  matches: [],
  exportNumber: 2,
  ownName: null,
  name: '2',
  placeName: '2',
  startSeconds,
  lengthSeconds,
  startSplit: null,
})

describe('trackExtent', () => {
  it('runs from the track’s start to its end', () => {
    expect(trackExtent(track(180.93, 109.09))).toEqual({ startSeconds: 180.93, endSeconds: 290.02 })
  })

  it('is the whole file for a track with no split', () => {
    expect(trackExtent(track(0, 42))).toEqual({ startSeconds: 0, endSeconds: 42 })
  })
})
