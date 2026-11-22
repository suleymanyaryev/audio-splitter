import { describe, it, expect } from 'vitest'

import { defaultTrackName } from '../default-track-name.ts'

describe('defaultTrackName', () => {
  it('is the prefix and the padded number, with nothing between them', () => {
    expect(defaultTrackName('dreamscape-', 3, 8)).toBe('dreamscape-03')
    expect(defaultTrackName('take ', 3, 8)).toBe('take 03')
  })

  it('is the bare padded number when the prefix is empty', () => {
    expect(defaultTrackName('', 3, 8)).toBe('03')
  })

  it('pads to the width of the track count', () => {
    expect(defaultTrackName('t', 7, 120)).toBe('t007')
  })

  // A longer default would not fit the rename field, which would refuse a typed digit.
  it('cuts the prefix, never the number, to keep within a track name length', () => {
    expect(defaultTrackName('x'.repeat(100), 2, 8)).toBe(`${'x'.repeat(98)}02`)
    expect(defaultTrackName('x'.repeat(100), 7, 120)).toBe(`${'x'.repeat(97)}007`)
  })
})
