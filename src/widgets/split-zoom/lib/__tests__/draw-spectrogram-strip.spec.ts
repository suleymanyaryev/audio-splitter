import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { createSpectrogramStrip } from '../draw-spectrogram-strip.ts'

const imageData = (width: number, height: number) => ({
  data: new Uint8ClampedArray(width * height * 4),
})

// How often the image was painted, from the offscreen context's calls.
const paintCount = (calls: { name: string }[]) =>
  calls.filter((call) => call.name === 'putImageData').length

// Records what a 2D context is asked to do; `createImageData` hands out a real pixel buffer.
function recorder() {
  const calls: { name: string; args: unknown[] }[] = []
  const context = new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === 'createImageData') return imageData
        if (name === 'measureText') return () => ({ width: 30 })
        return (...arguments_: unknown[]) => {
          calls.push({ name: String(name), args: arguments_ })
        }
      },
      set: () => true,
    },
  )
  return { calls, context: context as CanvasRenderingContext2D }
}

const style = {
  getPropertyValue: (name: string) =>
    ({ '--color-surface': '#fafbfa', '--color-ink': '#1b2326', '--color-muted': '#55615e' })[
      name
    ] ?? '',
} as CSSStyleDeclaration

// 10 s of 50 ms columns at 44.1 kHz.
const spectrogram = { bands: new Uint8Array(200 * 128).fill(100), bandCount: 128, topHz: 22_050 }

function view(startSeconds = 0) {
  return {
    spectrogram,
    columnSeconds: 0.05,
    startSeconds,
    endSeconds: startSeconds + 10,
    top: 160,
    width: 200,
    height: 160,
    style,
  }
}

describe('createSpectrogramStrip', () => {
  let offscreen: ReturnType<typeof recorder>

  beforeEach(() => {
    offscreen = recorder()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(offscreen.context)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('draws the strip into its place under the waveform, unsmoothed', () => {
    const target = recorder()
    createSpectrogramStrip()(target.context, view())

    const drawn = target.calls.find((call) => call.name === 'drawImage')
    expect(drawn?.args.slice(1)).toEqual([0, 160, 200, 160])
  })

  it('labels 100 Hz, 1 kHz and 10 kHz at the strip’s left edge, at their heights', () => {
    const target = recorder()
    createSpectrogramStrip()(target.context, view())

    const labels = target.calls
      .filter((call) => call.name === 'fillText')
      .map((call) => call.args[0])
    expect(labels).toEqual(['100 Hz', '1 kHz', '10 kHz'])
  })

  it('leaves out a label above half the sample rate', () => {
    const target = recorder()
    createSpectrogramStrip()(target.context, {
      ...view(),
      spectrogram: { ...spectrogram, topHz: 8000 },
    })

    const labels = target.calls
      .filter((call) => call.name === 'fillText')
      .map((call) => call.args[0])
    expect(labels).toEqual(['100 Hz', '1 kHz'])
  })

  it('draws only the line above the strip before the spectrogram is ready', () => {
    const target = recorder()
    createSpectrogramStrip()(target.context, { ...view(), spectrogram: null })

    expect(target.calls.map((call) => call.name)).toEqual(['fillRect'])
    expect(target.calls[0]?.args).toEqual([0, 159.25, 200, 1.5])
  })

  it('paints the strip again only when what it shows changes', () => {
    const strip = createSpectrogramStrip()

    strip(recorder().context, view())
    strip(recorder().context, view())
    expect(paintCount(offscreen.calls)).toBe(1)

    strip(recorder().context, view(1))
    expect(paintCount(offscreen.calls)).toBe(2)
  })
})
