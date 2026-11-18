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
import { usePlayheadFrames } from '../lib/use-playhead-frames.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow } from '../lib/zoom-spans.ts'
import { useAuditionStore } from '../model/audition.ts'

/*
The Range view (GLOSSARY.md): the range the user dragged out, stretched across a 160 px canvas
whatever its length, in the zoom view's place and at its height, so the page does not jump when the
panel switches. The bars are the peaks the whole-file view already holds, merged over the range's
buckets, so nothing is decoded; the lands and the split lines that fall inside the range are drawn
on the same axis. The panel's `Split | Range` control only offers this view while there is a range.

A 1 px ink playhead is drawn at all times: at the range's start for a new range, then where the
range is heard or where it resumes. While the range plays it is drawn on every animation frame. The
view takes the keyboard, and Space plays or pauses the range, as the panel's button does (a held key
is ignored, so it does not start and stop the sound over and over). A failure to play is said in a
line at the bottom of the view.
*/

// DESIGN.md: the whole canvas is framed in 1.5 px ink, as in the zoom view.
const FRAME_WIDTH = 1.5
// The playhead is one CSS pixel of ink.
const PLAYHEAD_WIDTH = 1

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const audition = useAuditionStore()
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

  /*
  The playhead goes over the split lines, which it must stay readable against, and under the
  frame, so the frame stays the outermost line of the canvas.
  */
  const playhead = audition.rangePlayheadSeconds()
  if (playhead !== null) {
    const x = zoomTimeToX(playhead, centreSeconds, windowSeconds, width)
    context.fillStyle = style.getPropertyValue('--color-ink')
    // Snapped to a whole CSS pixel so the line is not smeared over two.
    context.fillRect(Math.round(x - PLAYHEAD_WIDTH / 2), 0, PLAYHEAD_WIDTH, height)
  }

  context.strokeStyle = style.getPropertyValue('--color-ink')
  context.lineWidth = FRAME_WIDTH
  context.strokeRect(FRAME_WIDTH / 2, FRAME_WIDTH / 2, width - FRAME_WIDTH, height - FRAME_WIDTH)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== ' ') return
  // Never a page scroll, and a held key must not start and stop the sound over and over.
  event.preventDefault()
  if (!event.repeat) audition.toggleRange()
}

usePlayheadFrames(() => audition.rangeStatus === 'playing', draw)

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    split.range,
    split.gaps,
    split.splits.map((point) => point.seconds),
    split.selectedSplitId,
    audition.rangePlayheadSeconds(),
  ],
  draw,
)
</script>

<template>
  <div
    tabindex="0"
    role="group"
    aria-label="Range"
    class="relative h-40 select-none focus-visible:focus-ring"
    @keydown="onKeydown"
  >
    <canvas ref="canvas" class="block size-full" aria-label="Waveform of the range" />
    <p
      v-if="audition.failure !== null"
      role="status"
      class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
    >
      <span class="bg-surface px-3 py-1.5 text-sm text-muted">{{ audition.failure }}</span>
    </p>
  </div>
</template>
