<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { CANVAS_FONT } from '@/shared/lib/canvas/canvas-text.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { landSpans } from '@/shared/lib/canvas/land-spans.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { timeToX } from '@/shared/lib/canvas/time-axis.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { CONTRAST_TOP_DB, contrastY } from '../lib/contrast-lane.ts'
import { mergeLoudness } from '../lib/merge-loudness.ts'
import { CURVE_LINE_WIDTH } from '../lib/threshold-line.ts'

// As the loudness curve: the area under the line is filled at 14 % alpha.
const FILL_ALPHA = 0.14
const LABEL_PLATE_HEIGHT = 17
const LABEL_PADDING = 4
const LABEL = `Contrast, 0 to ${CONTRAST_TOP_DB} dB`

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const canvas = useTemplateRef('canvas')

// One point per column, at the column's centre.
function traceCurve(context: CanvasRenderingContext2D, columns: Float32Array, height: number) {
  context.beginPath()
  for (const [column, contrast] of columns.entries()) {
    const y = contrastY(contrast, height)
    if (column === 0) context.moveTo(0.5, y)
    else context.lineTo(column + 0.5, y)
  }
}

/*
DESIGN.md: the lane is drawn as the loudness curve is, on the same time axis and under it, but in
`ink`, which is for what is derived from the audio; `wave` is the audio itself. The label sits on a
`surface` plate at the top left.
*/
function draw() {
  const contrast = split.contrastCurve
  const prepared = contrast && canvas.value ? prepareCanvas(canvas.value) : null
  if (!contrast || !prepared) return
  const { context, width, height } = prepared

  const style = getComputedStyle(document.documentElement)
  const duration = sourceFile.durationSeconds ?? 0

  drawLands(
    context,
    landSpans(split.gaps, duration, width),
    style.getPropertyValue('--color-land'),
    0,
    height,
  )

  // Each pixel column keeps the highest contrast of the stretch it covers, so a peak is never lost.
  const columns = mergeLoudness(contrast, Math.floor(width))
  if (columns.length > 0) {
    const color = style.getPropertyValue('--color-ink')

    traceCurve(context, columns, height)
    context.lineTo(columns.length - 0.5, height)
    context.lineTo(0.5, height)
    context.closePath()
    context.fillStyle = color
    context.globalAlpha = FILL_ALPHA
    context.fill()
    context.globalAlpha = 1

    traceCurve(context, columns, height)
    context.strokeStyle = color
    context.lineWidth = CURVE_LINE_WIDTH
    context.lineJoin = 'round'
    context.stroke()
  }

  drawSplitLines(
    context,
    split.splits.map((point) => timeToX(point.seconds, duration, width)),
    style.getPropertyValue('--color-split'),
    0,
    height,
    split.selectedSplitIndex,
  )

  context.font = CANVAS_FONT
  context.textBaseline = 'middle'
  context.fillStyle = style.getPropertyValue('--color-surface')
  context.fillRect(0, 0, context.measureText(LABEL).width + 2 * LABEL_PADDING, LABEL_PLATE_HEIGHT)
  context.fillStyle = style.getPropertyValue('--color-muted')
  context.fillText(LABEL, LABEL_PADDING, LABEL_PLATE_HEIGHT / 2)
}

// The label is canvas text, so the first draw is repeated once Albert Sans has loaded.
useCanvasRedraw(canvas, draw)

watch(
  () => [
    split.contrastCurve,
    split.gaps,
    split.splits.map((point) => point.seconds),
    split.selectedSplit?.id,
  ],
  draw,
)
</script>

<template>
  <canvas
    v-if="split.contrastCurve !== null"
    ref="canvas"
    class="mt-2 block h-20 w-full"
    aria-label="Contrast curve of the whole file"
  />
</template>
