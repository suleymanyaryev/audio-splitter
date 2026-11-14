<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { CANVAS_FONT, redrawWhenFontsLoad } from '@/shared/lib/canvas/canvas-text.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { landSpans } from '@/shared/lib/canvas/land-spans.ts'
import { timeToX } from '@/shared/lib/canvas/time-axis.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { mergePeaks } from '../lib/merge-peaks.ts'
import { placeSplitNumbers } from '../lib/place-split-numbers.ts'

// DESIGN.md: bars 2 px wide on a 3 px pitch.
const BAR_WIDTH = 2
const BAR_PITCH = 3
// DESIGN.md: a 22 px band above the waveform carries the split numbers.
const NUMBER_BAND_HEIGHT = 22

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const canvas = useTemplateRef('canvas')

// Five times spread edge to edge under the canvas.
const axisTimes = computed(() => {
  const duration = sourceFile.durationSeconds ?? 0
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => formatDuration(duration * fraction))
})

function draw() {
  const element = canvas.value
  const peaks = sourceFile.peaks
  const context = element?.getContext('2d')
  if (!element || !peaks || !context) return

  // Draw at the screen's real pixel density so bars stay sharp on a Retina display.
  const { width, height } = element.getBoundingClientRect()
  const scale = globalThis.devicePixelRatio || 1
  element.width = Math.round(width * scale)
  element.height = Math.round(height * scale)
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.clearRect(0, 0, width, height)

  const style = getComputedStyle(document.documentElement)
  const waveTop = NUMBER_BAND_HEIGHT
  const waveHeight = height - NUMBER_BAND_HEIGHT
  const duration = sourceFile.durationSeconds ?? 0

  // Thousands of 10 ms buckets fall into each bar; merging keeps each bar's extremes.
  const bars = mergePeaks(peaks, Math.floor(width / BAR_PITCH))
  // A sample of ±1 reaches the top or bottom edge of the wave area.
  const middle = waveTop + waveHeight / 2
  const halfHeight = waveHeight / 2
  context.fillStyle = style.getPropertyValue('--color-wave')
  for (let bar = 0; bar < bars.length / 2; bar++) {
    const min = bars[bar * 2] ?? 0
    const max = bars[bar * 2 + 1] ?? 0
    const top = middle - max * halfHeight
    const bottom = middle - min * halfHeight
    context.fillRect(bar * BAR_PITCH, top, BAR_WIDTH, bottom - top)
  }

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
  drawSplitLines(context, lineXs, splitColor, waveTop, waveHeight)

  // Split k is the split where track k + 1 starts; as many numbers as fit the band without touching.
  context.fillStyle = splitColor
  context.font = CANVAS_FONT
  context.textBaseline = 'middle'
  const labels = lineXs.map((x, index) => ({
    x,
    textWidth: context.measureText(String(index + 1)).width,
  }))
  for (const { index, left } of placeSplitNumbers(labels, width)) {
    context.fillText(String(index + 1), left, NUMBER_BAND_HEIGHT / 2)
  }
}

const resizeObserver = new ResizeObserver(draw)
const darkScheme = globalThis.matchMedia('(prefers-color-scheme: dark)')

onMounted(() => {
  if (canvas.value) resizeObserver.observe(canvas.value)
  // The wave colour token changes with the colour scheme, and a canvas does not repaint itself.
  darkScheme.addEventListener('change', draw)
  draw()
  // The split numbers are canvas text, which Manrope has to be loaded for.
  redrawWhenFontsLoad(draw)
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
  darkScheme.removeEventListener('change', draw)
})

watch(() => [sourceFile.peaks, split.gaps, split.splits], draw)
</script>

<template>
  <div>
    <canvas ref="canvas" class="block h-30 w-full" aria-label="Waveform of the whole file" />
    <div class="mt-1 flex justify-between text-xs text-muted">
      <span v-for="(time, index) in axisTimes" :key="index">{{ time }}</span>
    </div>
  </div>
</template>
