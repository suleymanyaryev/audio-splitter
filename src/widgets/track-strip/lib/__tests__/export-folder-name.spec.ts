import { describe, it, expect } from 'vitest'

import { exportFolderName } from '../export-folder-name.ts'

describe('exportFolderName', () => {
  it('is the stem when nothing is taken', () => {
    expect(exportFolderName('evening-set-vol3', [])).toBe('evening-set-vol3')
  })

  it('adds (2) when the stem is taken, then (3), and so on', () => {
    expect(exportFolderName('evening-set-vol3', ['evening-set-vol3'])).toBe('evening-set-vol3 (2)')
    expect(exportFolderName('evening-set-vol3', ['evening-set-vol3', 'evening-set-vol3 (2)'])).toBe(
      'evening-set-vol3 (3)',
    )
  })

  it('takes the first free number, not the next after the highest', () => {
    expect(exportFolderName('set', ['set', 'set (3)'])).toBe('set (2)')
  })

  it('treats names that differ only in case as taken, as the file systems of macOS and Windows do', () => {
    expect(exportFolderName('Set', ['set'])).toBe('Set (2)')
  })

  it('sanitises the stem like a track name', () => {
    expect(exportFolderName('live: 2024/11?', [])).toBe('live- 2024-11-')
  })

  it('checks the sanitised name against the taken ones', () => {
    expect(exportFolderName('a/b', ['a-b'])).toBe('a-b (2)')
  })

  it('falls back to "tracks" when the stem is empty after sanitising', () => {
    expect(exportFolderName('', [])).toBe('tracks')
    expect(exportFolderName(' .. ', ['tracks'])).toBe('tracks (2)')
  })
})
