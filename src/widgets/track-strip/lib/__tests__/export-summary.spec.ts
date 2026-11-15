import { describe, expect, it } from 'vitest'

import { exportSummary } from '../export-summary.ts'

const base = { savedCount: 8, trackCount: 8, folderName: 'evening-set-vol3', failure: null }

describe('exportSummary', () => {
  it('says how many tracks were saved and where', () => {
    expect(exportSummary({ ...base, status: 'done' })).toBe('8 tracks saved to evening-set-vol3/')
  })

  it('writes "1 track" for a single track', () => {
    expect(exportSummary({ ...base, status: 'done', savedCount: 1, trackCount: 1 })).toBe(
      '1 track saved to evening-set-vol3/',
    )
  })

  it('says how many tracks a cancelled export saved', () => {
    expect(exportSummary({ ...base, status: 'cancelled', savedCount: 3 })).toBe(
      'Export cancelled. 3 of 8 tracks saved to evening-set-vol3/.',
    )
  })

  it('says so when a cancelled export saved none', () => {
    expect(exportSummary({ ...base, status: 'cancelled', savedCount: 0 })).toBe(
      'Export cancelled. No tracks saved to evening-set-vol3/.',
    )
  })

  it('names the track that failed, by its name when it has one', () => {
    const failure = { track: { number: 4, name: 'Sunrise' }, message: 'Invalid data' }

    expect(exportSummary({ ...base, status: 'failed', savedCount: 3, failure })).toBe(
      'Track 4 (Sunrise) failed: Invalid data. 3 of 8 tracks saved to evening-set-vol3/.',
    )
  })

  it('names an unnamed track by its number', () => {
    const failure = { track: { number: 1, name: null }, message: 'Disk full' }

    expect(exportSummary({ ...base, status: 'failed', savedCount: 0, failure })).toBe(
      'Track 1 failed: Disk full. 0 of 8 tracks saved to evening-set-vol3/.',
    )
  })

  it('gives only the reason when no track was reached', () => {
    const failure = { track: null, message: 'Not allowed' }

    expect(
      exportSummary({ ...base, status: 'failed', savedCount: 0, folderName: null, failure }),
    ).toBe('Export failed: Not allowed')
  })
})
