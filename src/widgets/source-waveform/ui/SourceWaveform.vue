<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { ZOOM_WINDOW_SECONDS } from '@/entities/split/config/zoom-window.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { mergePeaks } from '@/shared/lib/audio/merge-peaks.ts'
import { CANVAS_FONT } from '@/shared/lib/canvas/canvas-text.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import { hitTestSplit } from '@/shared/lib/canvas/hit-test-split.ts'
import { landSpans } from '@/shared/lib/canvas/land-spans.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { timeToX, xToTime } from '@/shared/lib/canvas/time-axis.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { CHIP_DIAMETER, placeSplitNumbers } from '../lib/place-split-numbers.ts'
import { zoomOutline } from '../lib/zoom-outline.ts'

// DESIGN.md: a 22 px band above the waveform carries the split numbers.
const NUMBER_BAND_HEIGHT = 22
// DESIGN.md: the zoom window's outline is 1.5 px, in ink.
const OUTLINE_WIDTH = 1.5

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const canvas = useTemplateRef('canvas')

// Five times spread edge to edge under the canvas.
const axisTimes = computed(() => {
  const duration = sourceFile.durationSeconds ?? 0
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => formatDuration(duration * fraction))
})

function draw() {
  const peaks = sourceFile.peaks
  const prepared = peaks && canvas.value ? prepareCanvas(canvas.value) : null
  if (!peaks || !prepared) return
  const { context, width, height } = prepared

  const style = getComputedStyle(document.documentElement)
  const waveTop = NUMBER_BAND_HEIGHT
  const waveHeight = height - NUMBER_BAND_HEIGHT
  const duration = sourceFile.durationSeconds ?? 0

  // Thousands of 10 ms buckets fall into each bar; merging keeps each bar's extremes.
  const bars = mergePeaks(peaks, Math.floor(width / BAR_PITCH))
  // A sample of ±1 reaches the top or bottom edge of the wave area.
  const middle = waveTop + waveHeight / 2
  const halfHeight = waveHeight / 2
  drawPeakBars(context, bars, style.getPropertyValue('--color-wave'), middle, halfHeight)

  // Lands go over the bars: a gap has no waveform, and a widened one hides the bars it covers.
  drawLands(
    context,
    landSpans(split.gaps, duration, width),
    style.getPropertyValue('--color-land'),
    waveTop,
    waveHeight,
  )

  const splitColor = style.getPropertyValue('--color-split')
  const lineXs = split.splits.map((point) => timeToX(point.seconds, duration, width))
  const selectedIndex = split.selectedSplitIndex
  drawSplitLines(context, lineXs, splitColor, waveTop, waveHeight, selectedIndex)

  // The stretch the zoom view shows, outlined inside the wave area so the stroke is not cut off.
  const { left, right } = zoomOutline(split.zoomCentreSeconds, ZOOM_WINDOW_SECONDS, duration, width)
  context.strokeStyle = style.getPropertyValue('--color-ink')
  context.lineWidth = OUTLINE_WIDTH
  context.strokeRect(
    left + OUTLINE_WIDTH / 2,
    waveTop + OUTLINE_WIDTH / 2,
    Math.max(0, right - left - OUTLINE_WIDTH),
    waveHeight - OUTLINE_WIDTH,
  )

  // Split k is the split where track k + 1 starts; as many numbers as fit the band without touching.
  context.font = CANVAS_FONT
  context.textBaseline = 'middle'
  const labels = lineXs.map((x, index) => ({
    x,
    textWidth: context.measureText(String(index + 1)).width,
  }))
  for (const { index, left: numberLeft } of placeSplitNumbers(labels, width, selectedIndex)) {
    const number = String(index + 1)
    context.fillStyle = splitColor
    if (index === selectedIndex) {
      // The selected split's number: on-split digits in a filled circle.
      context.beginPath()
      context.arc(
        numberLeft + CHIP_DIAMETER / 2,
        NUMBER_BAND_HEIGHT / 2,
        CHIP_DIAMETER / 2,
        0,
        2 * Math.PI,
      )
      context.fill()
      context.fillStyle = style.getPropertyValue('--color-on-split')
      context.textAlign = 'center'
      context.fillText(number, numberLeft + CHIP_DIAMETER / 2, NUMBER_BAND_HEIGHT / 2)
      context.textAlign = 'left'
    } else {
      context.fillText(number, numberLeft, NUMBER_BAND_HEIGHT / 2)
    }
  }
}

/*
A click within reach of a split's line selects it, which centres the zoom window on it. A click
anywhere else moves the window there with nothing selected, which is how a gap that was missed is
found.
*/
function onClick(event: MouseEvent) {
  const element = canvas.value
  const duration = sourceFile.durationSeconds
  if (!element || duration === null) return
  const { left, width } = element.getBoundingClientRect()
  const x = event.clientX - left
  const lineXs = split.splits.map((point) => timeToX(point.seconds, duration, width))
  const hit = hitTestSplit(x, lineXs)
  const hitSplit = hit === null ? undefined : split.splits[hit]
  if (hitSplit === undefined) split.moveZoomTo(xToTime(x, duration, width))
  else split.selectSplit(hitSplit.id)
}

// The split numbers are canvas text, so the first draw is repeated once Manrope has loaded.
useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    split.gaps,
    split.splits.map((point) => point.seconds),
    split.selectedSplitId,
    split.zoomCentreSeconds,
  ],
  draw,
)
</script>

<template>
  <div>
    <canvas
      ref="canvas"
      class="block h-30 w-full cursor-pointer"
      aria-label="Waveform of the whole file"
      @click="onClick"
    />
    <div class="mt-1 flex justify-between text-xs text-muted">
      <span v-for="(time, index) in axisTimes" :key="index">{{ time }}</span>
    </div>
  </div>
</template>
