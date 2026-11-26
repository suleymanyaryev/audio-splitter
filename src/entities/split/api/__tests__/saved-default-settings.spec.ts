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
    saveDefaultSettings({
      offsetDb: 17.5,
      minimumGapSeconds: 2.4,
      depthDb: 12.5,
      contrastOn: true,
      contrastDb: 7.5,
    })

    expect(JSON.parse(localStorage.getItem(DEFAULT_SETTINGS_STORAGE_KEY) ?? 'null')).toEqual({
      version: 3,
      offsetDb: 17.5,
      minimumGapSeconds: 2.4,
      depthDb: 12.5,
      contrastOn: true,
      contrastDb: 7.5,
    })
    expect(readSavedDefaultSettings()).toEqual({
      offsetDb: 17.5,
      minimumGapSeconds: 2.4,
      depthDb: 12.5,
      contrastOn: true,
      contrastDb: 7.5,
    })
  })

  it('still reads a version 2 entry, with contrast off at 5.4 dB', () => {
    localStorage.setItem(
      DEFAULT_SETTINGS_STORAGE_KEY,
      '{"version":2,"offsetDb":17.5,"minimumGapSeconds":2.4,"depthDb":12.5}',
    )

    expect(readSavedDefaultSettings()).toEqual({
      offsetDb: 17.5,
      minimumGapSeconds: 2.4,
      depthDb: 12.5,
      contrastOn: false,
      contrastDb: 5.4,
    })
  })

  it('still reads a version 1 entry, with the depth at 15 dB and contrast off at 5.4 dB', () => {
    localStorage.setItem(
      DEFAULT_SETTINGS_STORAGE_KEY,
      '{"version":1,"offsetDb":17.5,"minimumGapSeconds":2.4}',
    )

    expect(readSavedDefaultSettings()).toEqual({
      offsetDb: 17.5,
      minimumGapSeconds: 2.4,
      depthDb: 15,
      contrastOn: false,
      contrastDb: 5.4,
    })
  })

  it('accepts a distance of any size or sign on the 0.1 grid, and the ends of the length range', () => {
    const low = {
      offsetDb: -3.1,
      minimumGapSeconds: 0.2,
      depthDb: 3,
      contrastOn: false,
      contrastDb: 3,
    }
    saveDefaultSettings(low)
    expect(readSavedDefaultSettings()).toEqual(low)

    const high = {
      offsetDb: 75,
      minimumGapSeconds: 5,
      depthDb: 30,
      contrastOn: true,
      contrastDb: 12,
    }
    saveDefaultSettings(high)
    expect(readSavedDefaultSettings()).toEqual(high)
  })

  it.each([
    ['text that is no JSON', 'loud'],
    ['a value that is no object', '18'],
    ['no version', '{"offsetDb":18,"minimumGapSeconds":2,"depthDb":15}'],
    [
      'another version',
      '{"version":4,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15,"contrastOn":false,"contrastDb":5.4}',
    ],
    [
      'a distance off the 0.1 grid',
      '{"version":2,"offsetDb":18.25,"minimumGapSeconds":2,"depthDb":15}',
    ],
    [
      'a distance that is a string',
      '{"version":2,"offsetDb":"18","minimumGapSeconds":2,"depthDb":15}',
    ],
    [
      'a length off the 0.1 grid',
      '{"version":2,"offsetDb":18,"minimumGapSeconds":2.05,"depthDb":15}',
    ],
    ['a length under 0.2 s', '{"version":2,"offsetDb":18,"minimumGapSeconds":0.1,"depthDb":15}'],
    ['a length over 5 s', '{"version":2,"offsetDb":18,"minimumGapSeconds":5.1,"depthDb":15}'],
    ['a missing length', '{"version":2,"offsetDb":18,"depthDb":15}'],
    ['a missing distance', '{"version":2,"minimumGapSeconds":2,"depthDb":15}'],
    ['a missing depth', '{"version":2,"offsetDb":18,"minimumGapSeconds":2}'],
    [
      'a depth off the 0.1 grid',
      '{"version":2,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15.05}',
    ],
    ['a depth under 3 dB', '{"version":2,"offsetDb":18,"minimumGapSeconds":2,"depthDb":2.9}'],
    ['a depth over 30 dB', '{"version":2,"offsetDb":18,"minimumGapSeconds":2,"depthDb":30.1}'],
    ['a version 1 length under 0.2 s', '{"version":1,"offsetDb":18,"minimumGapSeconds":0.1}'],
    [
      'a version 3 contrast threshold off the 0.1 grid',
      '{"version":3,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15,"contrastOn":true,"contrastDb":5.45}',
    ],
    [
      'a version 3 contrast threshold under 3 dB',
      '{"version":3,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15,"contrastOn":true,"contrastDb":2.9}',
    ],
    [
      'a version 3 contrast threshold over 12 dB',
      '{"version":3,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15,"contrastOn":true,"contrastDb":12.1}',
    ],
    [
      'a version 3 contrast setting that is no boolean',
      '{"version":3,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15,"contrastOn":"on","contrastDb":5.4}',
    ],
    [
      'a version 3 entry with no contrast setting',
      '{"version":3,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15,"contrastDb":5.4}',
    ],
    [
      'a version 3 entry with no contrast threshold',
      '{"version":3,"offsetDb":18,"minimumGapSeconds":2,"depthDb":15,"contrastOn":false}',
    ],
  ])('reads nothing for %s', (_, saved) => {
    localStorage.setItem(DEFAULT_SETTINGS_STORAGE_KEY, saved)

    expect(readSavedDefaultSettings()).toBeNull()
  })

  it('reads nothing, and saves nothing, when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlocked)

    expect(readSavedDefaultSettings()).toBeNull()
    expect(() => {
      saveDefaultSettings({
        offsetDb: 12,
        minimumGapSeconds: 3,
        depthDb: 15,
        contrastOn: false,
        contrastDb: 5.4,
      })
    }).not.toThrow()
  })
})
