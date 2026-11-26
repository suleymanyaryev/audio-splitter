import { describe, it, expect } from 'vitest'

import { zoomLayout } from '../zoom-layout.ts'

describe('zoomLayout', () => {
  it('gives the waveform the top half of a view and the spectrogram strip the bottom half', () => {
    expect(zoomLayout(320)).toEqual({ waveHeight: 160, stripTop: 160, stripHeight: 160 })
  })

  it('splits an odd height without losing a pixel', () => {
    const { waveHeight, stripTop, stripHeight } = zoomLayout(321)

    expect(stripTop).toBe(waveHeight)
    expect(waveHeight + stripHeight).toBe(321)
  })
})
