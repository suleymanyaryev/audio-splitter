import { describe, it, expect } from 'vitest'

import { sourceStem } from '../source-stem.ts'

describe('sourceStem', () => {
  it('is the file name without its extension', () => {
    expect(sourceStem('evening-set-vol3.m4a')).toBe('evening-set-vol3')
  })

  it('drops only the last extension', () => {
    expect(sourceStem('sample 1.2.mp3')).toBe('sample 1.2')
  })

  it('keeps the whole name when it has no extension', () => {
    expect(sourceStem('recording')).toBe('recording')
  })

  it('is empty for a name that is only an extension', () => {
    expect(sourceStem('.opus')).toBe('')
  })
})
