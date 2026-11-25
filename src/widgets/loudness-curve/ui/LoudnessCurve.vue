<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { CANVAS_FONT } from '@/shared/lib/canvas/canvas-text.ts'
import { DASH_PATTERN } from '@/shared/lib/canvas/dash-pattern.ts'
import { drawConfidenceMarks } from '@/shared/lib/canvas/draw-confidence-marks.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { landSpans } from '@/shared/lib/canvas/land-spans.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { timeToX } from '@/shared/lib/canvas/time-axis.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { DIP_MARK_OUTLINE_WIDTH, DIP_MARK_SIZE, dipMarks } from '../lib/dip-marks.ts'
import { formatDecibels } from '../lib/format-readout.ts'
import { mergeLoudness } from '../lib/merge-loudness.ts'
import { isOnPanel, movingLineColumns } from '../lib/moving-line.ts'
import {
  CURVE_LINE_WIDTH,
  HANDLE_HEIGHT,
  HANDLE_WIDTH,
  LABEL_PLATE_HEIGHT,
  curveY,
  handleTop,
  labelPlateTop,
} from '../lib/threshold-line.ts'
import { useDepthDrag } from '../lib/use-depth-drag.ts'
import { useThresholdDrag } from '../lib/use-threshold-drag.ts'

// DESIGN.md: the area under the curve is filled at 14 % alpha.
const FILL_ALPHA = 0.14
/*
DESIGN.md: the threshold is a 1.5 px line dashed (`DASH_PATTERN`), with its label on a plate
(text width + 8 px) at the left and an 18 × 10 px handle at the right edge.
*/
const THRESHOLD_LINE_WIDTH = 1.5
const PLATE_PADDING = 4

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const canvas = useTemplateRef('canvas')

// Dragging the line is the slider's move: it changes the gaps shown and nothing else.
const thresholdDrag = useThresholdDrag({
  threshold: () => split.silenceThreshold,
  set: split.setSilenceThreshold,
})
// Dragging the moving line is the depth slider's move: it changes what Find splits would add.
const depthDrag = useDepthDrag({
  around: () => split.loudnessAround,
  depth: () => split.depthSetting,
  set: split.setDepthSetting,
})

// Where both lines are under the pointer, the threshold line takes hold.
function onPointerDown(event: PointerEvent) {
  thresholdDrag.onPointerDown(event)
  if (!thresholdDrag.isDragging.value) depthDrag.onPointerDown(event)
}

function onPointerMove(event: PointerEvent) {
  thresholdDrag.onPointerMove(event)
  depthDrag.onPointerMove(event)
}

function onPointerEnd() {
  thresholdDrag.onPointerEnd()
  depthDrag.onPointerEnd()
}

// The cursor says a line moves up and down over either one, or while it is held.
const overLine = computed(
  () =>
    thresholdDrag.isDragging.value ||
    depthDrag.isDragging.value ||
    thresholdDrag.overLine.value ||
    depthDrag.overLine.value,
)

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

/*
DESIGN.md: the moving line is the loudness around less the depth, a 1.5 px `ink` line dashed like
the threshold, one point per pixel column. A column under the −60 dB floor is left out, so a line
wholly under it is not drawn.
*/
function drawMovingLine(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  columnCount: number,
  height: number,
) {
  const around = split.loudnessAround
  if (around === null) return
  const line = movingLineColumns(around, split.depthSetting, columnCount)

  context.strokeStyle = style.getPropertyValue('--color-ink')
  context.lineWidth = THRESHOLD_LINE_WIDTH
  context.setLineDash(DASH_PATTERN)
  context.beginPath()
  let isDrawing = false
  for (const [column, decibels] of line.entries()) {
    if (!isOnPanel(decibels)) {
      isDrawing = false
      continue
    }
    const y = curveY(decibels, height)
    if (isDrawing) context.lineTo(column + 0.5, y)
    else context.moveTo(column + 0.5, y)
    isDrawing = true
  }
  context.stroke()
  context.setLineDash([])
}

/*
DESIGN.md: each dip that Find splits would add, with no gap beside it, is an 8 px `ink` diamond on
the curve, ringed in the surface colour so it reads over the line and the fill. It is no split,
so it is never rust.
*/
function drawDipMarks(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  columns: Float32Array,
  width: number,
  height: number,
) {
  const dips = split.proposedSplits.filter((proposal) => proposal.kind === 'dip')
  const marks = dipMarks(
    dips.map((dip) => dip.seconds),
    sourceFile.durationSeconds ?? 0,
    columns,
    width,
    height,
  )
  const half = DIP_MARK_SIZE / 2
  context.fillStyle = style.getPropertyValue('--color-ink')
  context.strokeStyle = style.getPropertyValue('--color-surface')
  context.lineWidth = DIP_MARK_OUTLINE_WIDTH
  // One diamond around the origin, moved to each mark.
  const diamond = new Path2D()
  diamond.moveTo(0, -half)
  diamond.lineTo(half, 0)
  diamond.lineTo(0, half)
  diamond.lineTo(-half, 0)
  diamond.closePath()
  for (const { x, y } of marks) {
    context.save()
    context.translate(x, y)
    context.stroke(diamond)
    context.fill(diamond)
    context.restore()
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
  context.setLineDash(DASH_PATTERN)
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
  const loudness = sourceFile.loudness
  const prepared = loudness && canvas.value ? prepareCanvas(canvas.value) : null
  if (!loudness || !prepared) return
  const { context, width, height } = prepared

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

  const lineXs = split.splits.map((point) => timeToX(point.seconds, duration, width))
  drawSplitLines(
    context,
    lineXs,
    style.getPropertyValue('--color-split'),
    0,
    height,
    split.selectedSplitIndex,
  )
  drawConfidenceMarks(context, style, split.splits, lineXs, 0, height)
  drawMovingLine(context, style, columns.length, height)
  drawDipMarks(context, style, columns, width, height)

  drawThreshold(context, style, width, height)
}

// The threshold label is canvas text, so the first draw is repeated once Albert Sans has loaded.
useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.loudness,
    split.gaps,
    split.splits.map((point) => point.seconds),
    // Checking a split takes its mark away and changes nothing else.
    split.splits.map((point) => point.confidence?.band),
    split.selectedSplit?.id,
    split.silenceThreshold,
    split.proposedSplits,
    split.depthSetting,
  ],
  draw,
)
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
