import { describe, it, expect } from 'vitest'

import { trackFileName } from '../track-file-name.ts'

describe('trackFileName', () => {
  it('is the number and the extension for an unnamed track', () => {
    expect(trackFileName({ number: 3, count: 8, name: null, extension: 'm4a' })).toBe('03.m4a')
  })

  it('adds the name after the number for a renamed track', () => {
    expect(trackFileName({ number: 3, count: 8, name: 'Sunrise Drive', extension: 'm4a' })).toBe(
      '03 Sunrise Drive.m4a',
    )
  })

  it('pads to two digits at least, even for a single track', () => {
    expect(trackFileName({ number: 1, count: 1, name: null, extension: 'mp3' })).toBe('01.mp3')
  })

  it('pads to the width of the track count: three digits from 100 tracks', () => {
    expect(trackFileName({ number: 7, count: 120, name: null, extension: 'opus' })).toBe('007.opus')
    expect(trackFileName({ number: 120, count: 120, name: null, extension: 'opus' })).toBe(
      '120.opus',
    )
    expect(trackFileName({ number: 7, count: 99, name: null, extension: 'opus' })).toBe('07.opus')
  })

  it('sanitises the name', () => {
    expect(trackFileName({ number: 2, count: 8, name: 'AC/DC: Live?', extension: 'm4a' })).toBe(
      '02 AC-DC- Live-.m4a',
    )
  })

  it('falls back to the plain number when the name is empty after sanitising', () => {
    expect(trackFileName({ number: 2, count: 8, name: ' .. ', extension: 'm4a' })).toBe('02.m4a')
    expect(trackFileName({ number: 2, count: 8, name: '', extension: 'm4a' })).toBe('02.m4a')
  })

  it('keeps a name that is only unsafe characters, as hyphens', () => {
    expect(trackFileName({ number: 2, count: 8, name: '***', extension: 'm4a' })).toBe('02 ---.m4a')
  })

  it('caps a long name at 100 characters', () => {
    const name = trackFileName({ number: 2, count: 8, name: 'x'.repeat(300), extension: 'm4a' })

    expect(name).toBe(`02 ${'x'.repeat(100)}.m4a`)
  })

  it('lower-cases the extension', () => {
    expect(trackFileName({ number: 1, count: 2, name: null, extension: 'M4A' })).toBe('01.m4a')
  })
})
