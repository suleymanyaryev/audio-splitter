import { describe, it, expect } from 'vitest'

import type { Track } from '@/entities/split/model/split.ts'
import { trackTitle } from '../track-title.ts'

const track = (overrides: Partial<Track>): Track => ({
  number: 4,
  inclusion: 'included',
  isLeftOut: false,
  matches: [],
  exportNumber: 4,
  ownName: null,
  name: 'dreamscape-04',
  placeName: 'dreamscape-04',
  startSeconds: 180.93,
  lengthSeconds: 109.09,
  startSplit: null,
  ...overrides,
})

describe('trackTitle', () => {
  it('gives the name as the list shows it (the prefixed number while unnamed), the start and the end, with hundredths', () => {
    expect(trackTitle(track({}), 12)).toBe('dreamscape-04 · 0:03:00.93 – 0:04:50.02')
  })

  it('shows the name the user gave the track', () => {
    expect(trackTitle(track({ name: 'Intro', placeName: 'Intro' }), 12)).toBe(
      'Intro · 0:03:00.93 – 0:04:50.02',
    )
  })

  it('shows the track’s place in the file, not its export number, while it is unnamed', () => {
    const leftOut = track({
      inclusion: 'by-hand',
      isLeftOut: true,
      exportNumber: null,
      name: 'dreamscape-',
    })

    expect(trackTitle(leftOut, 12)).toBe('dreamscape-04 · 0:03:00.93 – 0:04:50.02')
  })

  it('ends the first track where its length does, from the file’s start', () => {
    expect(
      trackTitle(
        track({
          number: 1,
          name: 'dreamscape-01',
          placeName: 'dreamscape-01',
          startSeconds: 0,
          lengthSeconds: 42,
        }),
        12,
      ),
    ).toBe('dreamscape-01 · 0:00:00.00 – 0:00:42.00')
  })

  it('keeps the hour of a track late in a long file', () => {
    expect(trackTitle(track({ startSeconds: 10_400, lengthSeconds: 600 }), 12)).toBe(
      'dreamscape-04 · 2:53:20.00 – 3:03:20.00',
    )
  })

  it('adds the words of each match, with the other track’s number padded to the count', () => {
    const matches: Track['matches'] = [
      {
        kind: 'holds',
        number: 1,
        ownName: null,
        startSplitId: null,
        here: { from: 2, to: 42 },
        there: { from: 0, to: 40 },
      },
      {
        kind: 'part-of',
        number: 2,
        ownName: 'Intro',
        startSplitId: 7,
        here: { from: 42, to: 92 },
        there: { from: 12.4, to: 62.4 },
      },
    ]

    expect(trackTitle(track({ matches }), 12)).toBe(
      'dreamscape-04 · 0:03:00.93 – 0:04:50.02 · 01 from 0:02, part of 02 Intro from 0:12.4',
    )
  })

  it('says a duplicate’s one match', () => {
    const matches: Track['matches'] = [
      {
        kind: 'duplicate',
        number: 1,
        ownName: null,
        startSplitId: null,
        here: { from: 0, to: 109 },
        there: { from: 0, to: 109 },
      },
    ]

    expect(trackTitle(track({ matches }), 4)).toBe(
      'dreamscape-04 · 0:03:00.93 – 0:04:50.02 · duplicate of 01',
    )
  })
})
