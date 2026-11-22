import { describe, it, expect } from 'vitest'

import { trackFileName } from '../track-file-name.ts'

describe('trackFileName', () => {
  it('is the prefix, the number and the extension for an unnamed track', () => {
    expect(
      trackFileName({ number: 3, count: 8, name: null, prefix: 'dreamscape-', extension: 'm4a' }),
    ).toBe('dreamscape-03.m4a')
  })

  it('puts nothing between the prefix and the number: the separator is the prefix’s', () => {
    expect(
      trackFileName({ number: 3, count: 8, name: null, prefix: 'set ', extension: 'm4a' }),
    ).toBe('set 03.m4a')
    expect(
      trackFileName({ number: 3, count: 8, name: null, prefix: 'set', extension: 'm4a' }),
    ).toBe('set03.m4a')
  })

  it('is the number and the extension when the prefix is empty', () => {
    expect(trackFileName({ number: 3, count: 8, name: null, prefix: '', extension: 'm4a' })).toBe(
      '03.m4a',
    )
  })

  it('pads to two digits at least, even for a single track', () => {
    expect(trackFileName({ number: 1, count: 1, name: null, prefix: '', extension: 'mp3' })).toBe(
      '01.mp3',
    )
  })

  it('pads to the width of the track count: three digits from 100 tracks', () => {
    expect(
      trackFileName({ number: 7, count: 120, name: null, prefix: 'a-', extension: 'opus' }),
    ).toBe('a-007.opus')
    expect(
      trackFileName({ number: 120, count: 120, name: null, prefix: '', extension: 'opus' }),
    ).toBe('120.opus')
    expect(trackFileName({ number: 7, count: 99, name: null, prefix: '', extension: 'opus' })).toBe(
      '07.opus',
    )
  })

  it('makes the prefix safe as one string with the number: unsafe characters become -, a separator at its end stays', () => {
    expect(
      trackFileName({ number: 2, count: 8, name: null, prefix: 'AC/DC: Live? ', extension: 'm4a' }),
    ).toBe('AC-DC- Live- 02.m4a')
    expect(trackFileName({ number: 2, count: 8, name: null, prefix: '..', extension: 'm4a' })).toBe(
      '02.m4a',
    )
  })

  it('cuts the prefix, not the number, when the name would pass 100 characters', () => {
    const name = trackFileName({
      number: 2,
      count: 8,
      name: null,
      prefix: 'x'.repeat(100),
      extension: 'm4a',
    })

    expect(name).toBe(`${'x'.repeat(98)}02.m4a`)
  })

  it('keeps the whole three-digit number when the prefix is cut', () => {
    const name = trackFileName({
      number: 7,
      count: 120,
      name: null,
      prefix: 'x'.repeat(100),
      extension: 'm4a',
    })

    expect(name).toBe(`${'x'.repeat(97)}007.m4a`)
  })

  it('adds the name after the number for a renamed track, until the next ticket drops the number', () => {
    expect(
      trackFileName({ number: 3, count: 8, name: 'Sunrise Drive', prefix: 'a-', extension: 'm4a' }),
    ).toBe('03 Sunrise Drive.m4a')
  })

  it('sanitises the name', () => {
    expect(
      trackFileName({ number: 2, count: 8, name: 'AC/DC: Live?', prefix: '', extension: 'm4a' }),
    ).toBe('02 AC-DC- Live-.m4a')
  })

  it('falls back to the plain number when the name is empty after sanitising', () => {
    expect(
      trackFileName({ number: 2, count: 8, name: ' .. ', prefix: 'a-', extension: 'm4a' }),
    ).toBe('02.m4a')
  })

  it('caps a long name at 100 characters', () => {
    const name = trackFileName({
      number: 2,
      count: 8,
      name: 'x'.repeat(300),
      prefix: '',
      extension: 'm4a',
    })

    expect(name).toBe(`02 ${'x'.repeat(100)}.m4a`)
  })

  it('lower-cases the extension', () => {
    expect(trackFileName({ number: 1, count: 2, name: null, prefix: '', extension: 'M4A' })).toBe(
      '01.m4a',
    )
  })
})
