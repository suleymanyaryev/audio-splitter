import { describe, it, expect } from 'vitest'

import type { Track } from '@/entities/split/model/split.ts'
import { trackExtent, trackStretch } from '../track-extent.ts'

const track = (startSeconds: number, lengthSeconds: number): Track => ({
  number: 2,
  name: '2',
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

describe('trackStretch', () => {
  it('is the whole track when it is 10 min or less', () => {
    expect(trackStretch(track(180.93, 109.09))).toEqual({
      startSeconds: 180.93,
      endSeconds: 290.02,
    })
    expect(trackStretch(track(100, 600))).toEqual({ startSeconds: 100, endSeconds: 700 })
  })

  it('is the first 10 min of a longer track', () => {
    expect(trackStretch(track(100, 2400))).toEqual({ startSeconds: 100, endSeconds: 700 })
  })
})
