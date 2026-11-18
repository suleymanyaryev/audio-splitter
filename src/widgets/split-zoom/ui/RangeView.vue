<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { rangeWindow } from '../lib/range-window.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow } from '../lib/zoom-spans.ts'

/*
The Range view (GLOSSARY.md): the range the user dragged out, stretched across a 160 px canvas
whatever its length, in the zoom view's place and at its height, so the page does not jump when the
panel switches. The bars are the peaks the whole-file view already holds, merged over the range's
buckets, so nothing is decoded; the lands and the split lines that fall inside the range are drawn
on the same axis. The panel's `Split | Range` control only offers this view while there is a range.
*/

// DESIGN.md: the whole canvas is framed in 1.5 px ink, as in the zoom view.
const FRAME_WIDTH = 1.5

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const canvas = useTemplateRef('canvas')

function draw() {
  const peaks = sourceFile.peaks
  const range = split.range
  const prepared = peaks && range && canvas.value ? prepareCanvas(canvas.value) : null
  if (!peaks || !range || !prepared) return
  const { context, width, height } = prepared

  const style = getComputedStyle(document.documentElement)
  const { centreSeconds, windowSeconds } = rangeWindow(range)
  const middle = height / 2
  // A sample of ±1 reaches the frame.
  const halfHeight = middle - FRAME_WIDTH

  const bars = zoomBars(peaks, centreSeconds, windowSeconds, width, BAR_PITCH)
  drawPeakBars(context, bars, style.getPropertyValue('--color-wave'), middle, halfHeight)

  // Lands cover the bars, at their true width: only a whole-file view widens a land.
  drawLands(
    context,
    landSpansInWindow(split.gaps, centreSeconds, windowSeconds, width),
    style.getPropertyValue('--color-land'),
    0,
    height,
  )

  // A split on the range's edge is drawn on it; one outside is off the canvas.
  drawSplitLines(
    context,
    split.splits.map((point) => zoomTimeToX(point.seconds, centreSeconds, windowSeconds, width)),
    style.getPropertyValue('--color-split'),
    0,
    height,
    split.selectedSplitIndex,
  )

  context.strokeStyle = style.getPropertyValue('--color-ink')
  context.lineWidth = FRAME_WIDTH
  context.strokeRect(FRAME_WIDTH / 2, FRAME_WIDTH / 2, width - FRAME_WIDTH, height - FRAME_WIDTH)
}

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    split.range,
    split.gaps,
    split.splits.map((point) => point.seconds),
    split.selectedSplitId,
  ],
  draw,
)
</script>

<template>
  <div class="relative h-40 select-none">
    <canvas ref="canvas" class="block size-full" aria-label="Waveform of the range" />
  </div>
</template>
