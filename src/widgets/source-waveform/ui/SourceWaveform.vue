<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { mergePeaks } from '../lib/merge-peaks.ts'

// DESIGN.md: bars 2 px wide on a 3 px pitch.
const BAR_WIDTH = 2
const BAR_PITCH = 3

const sourceFile = useSourceFileStore()
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

  // Thousands of 10 ms buckets fall into each bar; merging keeps each bar's extremes.
  const bars = mergePeaks(peaks, Math.floor(width / BAR_PITCH))
  // A sample of ±1 reaches the top or bottom edge.
  const middle = height / 2
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-wave')
  for (let bar = 0; bar < bars.length / 2; bar++) {
    const min = bars[bar * 2] ?? 0
    const max = bars[bar * 2 + 1] ?? 0
    const top = middle - max * middle
    const bottom = middle - min * middle
    context.fillRect(bar * BAR_PITCH, top, BAR_WIDTH, bottom - top)
  }
}

const resizeObserver = new ResizeObserver(draw)
const darkScheme = globalThis.matchMedia('(prefers-color-scheme: dark)')

onMounted(() => {
  if (canvas.value) resizeObserver.observe(canvas.value)
  // The wave colour token changes with the colour scheme, and a canvas does not repaint itself.
  darkScheme.addEventListener('change', draw)
  draw()
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
  darkScheme.removeEventListener('change', draw)
})

watch(() => sourceFile.peaks, draw)
</script>

<template>
  <div>
    <canvas ref="canvas" class="block h-24 w-full" aria-label="Waveform of the whole file" />
    <div class="mt-1 flex justify-between text-xs text-muted">
      <span v-for="(time, index) in axisTimes" :key="index">{{ time }}</span>
    </div>
  </div>
</template>
