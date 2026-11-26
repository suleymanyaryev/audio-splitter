import type { Spectrogram } from '@/shared/lib/audio/spectrum-builder.ts'
import { CANVAS_FONT } from '@/shared/lib/canvas/canvas-text.ts'
import { FRAME_WIDTH } from '@/shared/lib/canvas/draw-playhead-and-frame.ts'
import { mergeSpectrogram } from './merge-spectrogram.ts'
import { frequencyToY } from './spectrogram-axis.ts'
import { hexToRgb, loudestBandValue } from './spectrogram-shade.ts'
import { paintSpectrogram } from './paint-spectrogram.ts'

// The strip's labels, at the left edge on a `surface` plate, as the threshold's label is.
const LABELS = [
  { hz: 100, text: '100 Hz' },
  { hz: 1000, text: '1 kHz' },
  { hz: 10_000, text: '10 kHz' },
]
const LABEL_PLATE_HEIGHT = 17
const LABEL_PADDING = 4

export type StripView = {
  // Null until the load is ready, when only the line above the strip is drawn.
  spectrogram: Spectrogram | null
  // How long one column lasts: the loudness window's length.
  columnSeconds: number | null
  // The time at the canvas's left and right edges.
  startSeconds: number
  endSeconds: number
  // The strip's place on the canvas, in CSS pixels.
  top: number
  width: number
  height: number
  style: CSSStyleDeclaration
}

// The 100 Hz, 1 kHz and 10 kHz labels, those under the top of the axis.
function drawLabels(context: CanvasRenderingContext2D, spectrogram: Spectrogram, view: StripView) {
  const { top, height, style } = view
  context.font = CANVAS_FONT
  context.textBaseline = 'middle'
  const left = FRAME_WIDTH + 2
  for (const { hz, text } of LABELS) {
    if (hz >= spectrogram.topHz) continue
    // Held inside the strip, so a label near an edge is not cut off.
    const half = LABEL_PLATE_HEIGHT / 2
    const y = Math.min(
      top + height - half,
      Math.max(top + half, top + frequencyToY(hz, spectrogram.topHz, height)),
    )
    const plateWidth = context.measureText(text).width + LABEL_PADDING * 2
    context.fillStyle = style.getPropertyValue('--color-surface')
    context.fillRect(left, y - half, plateWidth, LABEL_PLATE_HEIGHT)
    context.fillStyle = style.getPropertyValue('--color-muted')
    context.fillText(text, left + LABEL_PADDING, y)
  }
}

/*
A drawer for one view's spectrogram strip, under its waveform and on its time axis. The strip is
painted into an offscreen image one pixel per CSS pixel across and one row per band, each pixel
keeping each band's loudest value over the time it covers (`mergeSpectrogram`), then scaled into
its place unsmoothed, so a band stays a sharp row. The image is painted again only when the
stretch, the width, the spectrogram or the theme's colours change: a redraw for the playhead alone
reuses it. A view calls it before its split lines, which cross the strip.
*/
export function createSpectrogramStrip() {
  let image: HTMLCanvasElement | undefined
  let paintedFor: { bands: Uint8Array; key: string } | undefined

  function paint(
    spectrogram: Spectrogram,
    columnSeconds: number,
    view: StripView,
  ): HTMLCanvasElement | undefined {
    const { startSeconds, endSeconds, style } = view
    const width = Math.max(1, Math.round(view.width))
    const background = style.getPropertyValue('--color-surface')
    const text = style.getPropertyValue('--color-ink')
    const key = [startSeconds, endSeconds, width, columnSeconds, background, text].join(' ')
    if (image && paintedFor?.bands === spectrogram.bands && paintedFor.key === key) return image

    image ??= document.createElement('canvas')
    image.width = width
    image.height = spectrogram.bandCount
    const context = image.getContext('2d')
    if (!context) return undefined
    const pixels = context.createImageData(width, spectrogram.bandCount)
    const merged = mergeSpectrogram(spectrogram, { startSeconds, endSeconds, width, columnSeconds })
    paintSpectrogram(
      pixels.data,
      merged,
      spectrogram.bandCount,
      loudestBandValue(spectrogram.bands),
      hexToRgb(background),
      hexToRgb(text),
    )
    context.putImageData(pixels, 0, 0)
    paintedFor = { bands: spectrogram.bands, key }
    return image
  }

  return function drawSpectrogramStrip(context: CanvasRenderingContext2D, view: StripView) {
    const { spectrogram, columnSeconds, top, width, height, style } = view
    if (spectrogram && columnSeconds !== null) {
      const painted = paint(spectrogram, columnSeconds, view)
      if (painted) {
        context.imageSmoothingEnabled = false
        context.drawImage(painted, 0, top, width, height)
      }
      drawLabels(context, spectrogram, view)
    }
    // The line between the waveform and the strip, as wide as the frame.
    context.fillStyle = style.getPropertyValue('--color-ink')
    context.fillRect(0, top - FRAME_WIDTH / 2, width, FRAME_WIDTH)
  }
}
