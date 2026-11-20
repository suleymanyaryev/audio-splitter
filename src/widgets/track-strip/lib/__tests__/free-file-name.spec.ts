import { describe, it, expect } from 'vitest'

import { freeFileName } from '../free-file-name.ts'

describe('freeFileName', () => {
  it('is the name with its extension when nothing is taken', () => {
    expect(freeFileName('03 Intro.m4a', [])).toBe('03 Intro.m4a')
  })

  it('adds (2) before the extension when the name is taken, then (3), and so on', () => {
    expect(freeFileName('03 Intro.m4a', ['03 Intro.m4a'])).toBe('03 Intro (2).m4a')
    expect(freeFileName('03 Intro.m4a', ['03 Intro.m4a', '03 Intro (2).m4a'])).toBe(
      '03 Intro (3).m4a',
    )
  })

  it('takes the first free number, not the next after the highest', () => {
    expect(freeFileName('set.mp3', ['set.mp3', 'set (3).mp3'])).toBe('set (2).mp3')
  })

  it('treats names that differ only in case as taken, as the file systems of macOS and Windows do', () => {
    expect(freeFileName('Intro.m4a', ['INTRO.M4A'])).toBe('Intro (2).m4a')
  })

  it('is not held up by a taken name with another extension', () => {
    expect(freeFileName('Intro.m4a', ['Intro.mp3', 'Intro'])).toBe('Intro.m4a')
  })
})
