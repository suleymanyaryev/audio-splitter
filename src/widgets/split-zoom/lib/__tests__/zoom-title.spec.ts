import { describe, it, expect } from 'vitest'

import { zoomTitle } from '../zoom-title.ts'

describe('zoomTitle', () => {
  it('is the selected split time with hundredths', () => {
    expect(zoomTitle(2523.25, 12)).toBe('0:42:03.25')
  })

  it('says no split is selected after the window was moved to empty ground', () => {
    expect(zoomTitle(null, 12)).toBe('No split selected')
  })

  it('says no splits were found when the file has none', () => {
    expect(zoomTitle(null, 0)).toBe('No splits found')
  })
})
