<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { rangeWindow } from '../lib/range-window.ts'
import { trackExtent } from '../lib/track-extent.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow } from '../lib/zoom-spans.ts'

/*
The Track view (GLOSSARY.md): the selected track stretched across a 160 px canvas whatever its
length, in the zoom view's place and at its height, so the page does not jump when the panel
switches. Like the Range view it draws the peaks the whole-file view already holds, merged over the
track's buckets, with the lands and the split lines that fall inside the track on the same axis: its
two end splits sit on the edges, and a track has no split inside it. No split is selected, moved or
added here, so nothing on the canvas is a split's to take. A 1 px ink playhead rests at the track's
start.
*/

// DESIGN.md: the whole canvas is framed in 1.5 px ink, as in the zoom view.
const FRAME_WIDTH = 1.5
// The playhead is one CSS pixel of ink.
const PLAYHEAD_WIDTH = 1

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const canvas = useTemplateRef('canvas')

const extent = computed(() =>
  split.selectedTrack === null ? null : trackExtent(split.selectedTrack),
)

function draw() {
  const peaks = sourceFile.peaks
  const track = extent.value
  const prepared = peaks && track && canvas.value ? prepareCanvas(canvas.value) : null
  if (!peaks || !track || !prepared) return
  const { context, width, height } = prepared

  const style = getComputedStyle(document.documentElement)
  const { centreSeconds, windowSeconds } = rangeWindow(track)
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

  // The track's end splits are drawn on its edges; every other split is off the canvas.
  drawSplitLines(
    context,
    split.splits.map((point) => zoomTimeToX(point.seconds, centreSeconds, windowSeconds, width)),
    style.getPropertyValue('--color-split'),
    0,
    height,
  )

  // The playhead goes over the split lines and under the frame, which stays the outermost line.
  const x = zoomTimeToX(track.startSeconds, centreSeconds, windowSeconds, width)
  context.fillStyle = style.getPropertyValue('--color-ink')
  // Snapped to a whole CSS pixel so the line is not smeared over two.
  context.fillRect(Math.round(x - PLAYHEAD_WIDTH / 2), 0, PLAYHEAD_WIDTH, height)

  context.strokeStyle = style.getPropertyValue('--color-ink')
  context.lineWidth = FRAME_WIDTH
  context.strokeRect(FRAME_WIDTH / 2, FRAME_WIDTH / 2, width - FRAME_WIDTH, height - FRAME_WIDTH)
}

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    extent.value?.startSeconds,
    extent.value?.endSeconds,
    split.gaps,
    split.splits.map((point) => point.seconds),
  ],
  draw,
)
</script>

<template>
  <div class="relative h-40">
    <canvas ref="canvas" class="block size-full" aria-label="Waveform of the track" />
  </div>
</template>
