import { describe, it, expect, vi } from 'vitest'

import { redrawWhenFontsLoad } from '../canvas-text.ts'

describe('redrawWhenFontsLoad', () => {
  it('draws again once the fonts are ready', async () => {
    const draw = vi.fn()

    redrawWhenFontsLoad(draw)
    expect(draw).not.toHaveBeenCalled()
    await document.fonts.ready

    expect(draw).toHaveBeenCalledOnce()
  })
})
