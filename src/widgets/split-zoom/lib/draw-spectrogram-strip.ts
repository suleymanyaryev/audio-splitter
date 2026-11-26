import type { Spectrogram } from '@/shared/lib/audio/spectrum-builder.ts'
import { CANVAS_FONT } from '@/shared/lib/canvas/canvas-text.ts'
import { FRAME_WIDTH } from '@/shared/lib/canvas/draw-playhead-and-frame.ts'
import { columnsUnderPixels } from './spectrogram-columns.ts'
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
  spectrogram: Spectrogram
  // How long one column lasts: the loudness window's length.
  columnSeconds: number
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
function drawLabels(context: CanvasRenderingContext2D, view: StripView) {
  const { spectrogram, top, height, style } = view
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
A drawer for one view's spectrogram strip. The strip is painted into an offscreen image one pixel
per CSS pixel across and one row per band, then scaled into its place unsmoothed, so a band stays
a sharp row. The image is painted again only when the stretch, the width, the spectrogram or the
theme's colours change: a redraw for the playhead alone reuses it.
*/
export function createSpectrogramStrip() {
  let image: HTMLCanvasElement | undefined
  let paintedFor: { bands: Uint8Array; key: string } | undefined

  function paint(view: StripView): HTMLCanvasElement | undefined {
    const { spectrogram, columnSeconds, startSeconds, endSeconds, style } = view
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
    const columns = columnsUnderPixels({
      startSeconds,
      endSeconds,
      width,
      columnSeconds,
      columnCount: spectrogram.bands.length / spectrogram.bandCount,
    })
    paintSpectrogram(
      pixels.data,
      columns,
      spectrogram,
      loudestBandValue(spectrogram.bands),
      hexToRgb(background),
      hexToRgb(text),
    )
    context.putImageData(pixels, 0, 0)
    paintedFor = { bands: spectrogram.bands, key }
    return image
  }

  return function drawSpectrogramStrip(context: CanvasRenderingContext2D, view: StripView) {
    const painted = paint(view)
    if (painted) {
      context.imageSmoothingEnabled = false
      context.drawImage(painted, 0, view.top, view.width, view.height)
    }
    drawLabels(context, view)
  }
}
