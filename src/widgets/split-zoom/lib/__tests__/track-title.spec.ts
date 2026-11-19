import { describe, it, expect } from 'vitest'

import type { Track } from '@/entities/split/model/split.ts'
import { trackTitle } from '../track-title.ts'

const track = (overrides: Partial<Track>): Track => ({
  number: 4,
  name: '4',
  startSeconds: 180.93,
  lengthSeconds: 109.09,
  startSplit: null,
  ...overrides,
})

describe('trackTitle', () => {
  it('gives the name, the start and the end, with hundredths', () => {
    expect(trackTitle(track({}))).toBe('4 · 0:03:00.93 – 0:04:50.02')
  })

  it('shows the name the user gave the track', () => {
    expect(trackTitle(track({ name: 'Intro' }))).toBe('Intro · 0:03:00.93 – 0:04:50.02')
  })

  it('ends the first track where its length does, from the file’s start', () => {
    expect(trackTitle(track({ number: 1, name: '1', startSeconds: 0, lengthSeconds: 42 }))).toBe(
      '1 · 0:00:00.00 – 0:00:42.00',
    )
  })

  it('keeps the hour of a track late in a long file', () => {
    expect(trackTitle(track({ startSeconds: 10_400, lengthSeconds: 600 }))).toBe(
      '4 · 2:53:20.00 – 3:03:20.00',
    )
  })
})
