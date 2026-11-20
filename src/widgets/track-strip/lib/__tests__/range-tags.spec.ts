import { describe, it, expect } from 'vitest'

import { rangeTags } from '../range-tags.ts'

describe('rangeTags', () => {
  it('titles the file with the name as typed, albums it with the source stem and has no track', () => {
    expect(rangeTags({ name: 'My: chorus', sourceStem: 'sample1' })).toEqual({
      title: 'My: chorus',
      track: null,
      album: 'sample1',
    })
  })
})
