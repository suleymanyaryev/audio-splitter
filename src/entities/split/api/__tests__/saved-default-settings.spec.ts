import { beforeEach, describe, it, expect, vi } from 'vitest'

import { DEFAULT_SETTINGS_STORAGE_KEY } from '../../config/defaults.ts'
import { readSavedDefaultSettings, saveDefaultSettings } from '../saved-default-settings.ts'

function throwBlocked(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

describe('the saved default settings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('reads nothing the first time', () => {
    expect(readSavedDefaultSettings()).toBeNull()
  })

  it('reads back what was saved, as a versioned value under one key', () => {
    saveDefaultSettings({ offsetDb: 17.5, minimumGapSeconds: 2.4 })

    expect(JSON.parse(localStorage.getItem(DEFAULT_SETTINGS_STORAGE_KEY) ?? 'null')).toEqual({
      version: 1,
      offsetDb: 17.5,
      minimumGapSeconds: 2.4,
    })
    expect(readSavedDefaultSettings()).toEqual({ offsetDb: 17.5, minimumGapSeconds: 2.4 })
  })

  it('accepts a distance of any size or sign on the 0.1 grid, and the ends of the length range', () => {
    saveDefaultSettings({ offsetDb: -3.1, minimumGapSeconds: 0.2 })
    expect(readSavedDefaultSettings()).toEqual({ offsetDb: -3.1, minimumGapSeconds: 0.2 })

    saveDefaultSettings({ offsetDb: 75, minimumGapSeconds: 5 })
    expect(readSavedDefaultSettings()).toEqual({ offsetDb: 75, minimumGapSeconds: 5 })
  })

  it.each([
    ['text that is no JSON', 'loud'],
    ['a value that is no object', '18'],
    ['no version', '{"offsetDb":18,"minimumGapSeconds":2}'],
    ['another version', '{"version":2,"offsetDb":18,"minimumGapSeconds":2}'],
    ['a distance off the 0.1 grid', '{"version":1,"offsetDb":18.25,"minimumGapSeconds":2}'],
    ['a distance that is a string', '{"version":1,"offsetDb":"18","minimumGapSeconds":2}'],
    ['a length off the 0.1 grid', '{"version":1,"offsetDb":18,"minimumGapSeconds":2.05}'],
    ['a length under 0.2 s', '{"version":1,"offsetDb":18,"minimumGapSeconds":0.1}'],
    ['a length over 5 s', '{"version":1,"offsetDb":18,"minimumGapSeconds":5.1}'],
    ['a missing length', '{"version":1,"offsetDb":18}'],
    ['a missing distance', '{"version":1,"minimumGapSeconds":2}'],
  ])('reads nothing for %s', (_, saved) => {
    localStorage.setItem(DEFAULT_SETTINGS_STORAGE_KEY, saved)

    expect(readSavedDefaultSettings()).toBeNull()
  })

  it('reads nothing, and saves nothing, when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlocked)

    expect(readSavedDefaultSettings()).toBeNull()
    expect(() => {
      saveDefaultSettings({ offsetDb: 12, minimumGapSeconds: 3 })
    }).not.toThrow()
  })
})
