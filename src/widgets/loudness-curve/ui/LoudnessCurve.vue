<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { CANVAS_FONT, redrawWhenFontsLoad } from '@/shared/lib/canvas/canvas-text.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { landSpans } from '@/shared/lib/canvas/land-spans.ts'
import { timeToX } from '@/shared/lib/canvas/time-axis.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { formatDecibels } from '../lib/format-readout.ts'
import { mergeLoudness } from '../lib/merge-loudness.ts'
import {
  CURVE_LINE_WIDTH,
  HANDLE_HEIGHT,
  HANDLE_WIDTH,
  LABEL_PLATE_HEIGHT,
  curveY,
  handleTop,
  labelPlateTop,
} from '../lib/threshold-line.ts'
import { useThresholdDrag } from '../lib/use-threshold-drag.ts'

// DESIGN.md: the area under the curve is filled at 14 % alpha.
const FILL_ALPHA = 0.14
/*
DESIGN.md: the threshold is a 1.5 px line dashed 5 px on, 4 px off, with its label on a plate
(text width + 8 px) at the left and an 18 × 10 px handle at the right edge.
*/
const THRESHOLD_LINE_WIDTH = 1.5
const THRESHOLD_DASH = [5, 4]
const PLATE_PADDING = 4

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const canvas = useTemplateRef('canvas')

const { overLine, onPointerDown, onPointerMove, onPointerEnd } = useThresholdDrag({
  threshold: () => split.silenceThreshold,
  set: split.setSilenceThreshold,
})

// The same five times as the whole-file view, so the two panels read on one time axis.
const axisTimes = computed(() => {
  const duration = sourceFile.durationSeconds ?? 0
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => formatDuration(duration * fraction))
})

// One point per column, at the column's centre.
function traceCurve(context: CanvasRenderingContext2D, columns: Float32Array, height: number) {
  context.beginPath()
  for (const [column, decibels] of columns.entries()) {
    const y = curveY(decibels, height)
    if (column === 0) context.moveTo(0.5, y)
    else context.lineTo(column + 0.5, y)
  }
}

function drawThreshold(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  width: number,
  height: number,
) {
  if (split.silenceThreshold === null) return
  const y = curveY(split.silenceThreshold, height)
  const color = style.getPropertyValue('--color-split')

  context.strokeStyle = color
  context.lineWidth = THRESHOLD_LINE_WIDTH
  context.setLineDash(THRESHOLD_DASH)
  context.beginPath()
  context.moveTo(0, y)
  context.lineTo(width, y)
  context.stroke()
  context.setLineDash([])

  // The label sits on a plate in the panel's surface colour, so it reads over the fill and lands.
  const label = formatDecibels(split.silenceThreshold)
  context.font = CANVAS_FONT
  context.textBaseline = 'middle'
  const plateTop = labelPlateTop(y)
  context.fillStyle = style.getPropertyValue('--color-surface')
  context.fillRect(
    0,
    plateTop,
    context.measureText(label).width + 2 * PLATE_PADDING,
    LABEL_PLATE_HEIGHT,
  )
  context.fillStyle = color
  context.fillText(label, PLATE_PADDING, plateTop + LABEL_PLATE_HEIGHT / 2)

  context.fillRect(width - HANDLE_WIDTH, handleTop(y, height), HANDLE_WIDTH, HANDLE_HEIGHT)
}

function draw() {
  const element = canvas.value
  const loudness = sourceFile.loudness
  const context = element?.getContext('2d')
  if (!element || !loudness || !context) return

  // Draw at the screen's real pixel density so the line stays sharp on a Retina display.
  const { width, height } = element.getBoundingClientRect()
  const scale = globalThis.devicePixelRatio || 1
  element.width = Math.round(width * scale)
  element.height = Math.round(height * scale)
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.clearRect(0, 0, width, height)

  const style = getComputedStyle(document.documentElement)
  const duration = sourceFile.durationSeconds ?? 0

  // Lands run the full height behind the curve, where the whole-file view has them.
  drawLands(
    context,
    landSpans(split.gaps, duration, width),
    style.getPropertyValue('--color-land'),
    0,
    height,
  )

  // Dozens of 50 ms windows fall into each pixel column; the loudest one stays visible.
  const columns = mergeLoudness(loudness, Math.floor(width))
  if (columns.length > 0) {
    const color = style.getPropertyValue('--color-wave')

    // The area is its own closed path, so the line has no edge along the bottom or the sides.
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
  )

  drawThreshold(context, style, width, height)
}

const resizeObserver = new ResizeObserver(draw)
const darkScheme = globalThis.matchMedia('(prefers-color-scheme: dark)')

onMounted(() => {
  if (canvas.value) resizeObserver.observe(canvas.value)
  // The colour tokens change with the colour scheme, and a canvas does not repaint itself.
  darkScheme.addEventListener('change', draw)
  draw()
  // The threshold label is canvas text, which Manrope has to be loaded for.
  redrawWhenFontsLoad(draw)
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
  darkScheme.removeEventListener('change', draw)
})

watch(() => [sourceFile.loudness, split.gaps, split.splits, split.silenceThreshold], draw)
</script>

<template>
  <div>
    <canvas
      ref="canvas"
      class="block h-30 w-full"
      :class="{ 'cursor-ns-resize': overLine }"
      aria-label="Loudness curve of the whole file"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
    />
    <div class="mt-1 flex justify-between text-xs text-muted">
      <span v-for="(time, index) in axisTimes" :key="index">{{ time }}</span>
    </div>
  </div>
</template>
