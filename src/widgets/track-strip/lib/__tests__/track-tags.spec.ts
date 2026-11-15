import { describe, it, expect } from 'vitest'

import { trackTags } from '../track-tags.ts'

describe('trackTags', () => {
  it('titles an unnamed track "<source stem> NN", the track "N/TOTAL" and the album the stem', () => {
    // The concept note's read-back of track 2 of 8 of sample1.m4a.
    expect(trackTags({ number: 2, count: 8, name: null, sourceStem: 'sample1' })).toEqual({
      title: 'sample1 02',
      track: '2/8',
      album: 'sample1',
    })
  })

  it('pads NN like the file name: to the width of the count, two digits at least', () => {
    expect(trackTags({ number: 7, count: 120, name: null, sourceStem: 'set' }).title).toBe(
      'set 007',
    )
    expect(trackTags({ number: 1, count: 1, name: null, sourceStem: 'set' }).title).toBe('set 01')
  })

  it('does not pad the track number', () => {
    expect(trackTags({ number: 7, count: 120, name: null, sourceStem: 'set' }).track).toBe('7/120')
  })

  it('titles a renamed track with the name exactly as typed, unsanitised', () => {
    const name = 'AC/DC: Café – ¿Qué? 日本'

    expect(trackTags({ number: 3, count: 8, name, sourceStem: 'sample1' }).title).toBe(name)
  })

  it('keeps the album as the stem as it is, unsanitised', () => {
    expect(trackTags({ number: 1, count: 2, name: null, sourceStem: 'a/b: c' }).album).toBe(
      'a/b: c',
    )
  })
})
