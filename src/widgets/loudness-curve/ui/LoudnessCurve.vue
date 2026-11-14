<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import { decibelsToY } from '../lib/decibels-to-y.ts'
import { mergeLoudness } from '../lib/merge-loudness.ts'

// DESIGN.md: a 1.5 px line with the area under it filled at 14 % alpha.
const LINE_WIDTH = 1.5
const FILL_ALPHA = 0.14

const sourceFile = useSourceFileStore()
const canvas = useTemplateRef('canvas')

// The same five times as the whole-file view, so the two panels read on one time axis.
const axisTimes = computed(() => {
  const duration = sourceFile.durationSeconds ?? 0
  return [0, 0.25, 0.5, 0.75, 1].map((fraction) => formatDuration(duration * fraction))
})

// One point per column, at the column's centre. The line is inset by half its width, so a gap at
// the floor or a window at 0 dB is not half cut off by the canvas edge.
function traceCurve(context: CanvasRenderingContext2D, columns: Float32Array, height: number) {
  context.beginPath()
  for (const [column, decibels] of columns.entries()) {
    const y = LINE_WIDTH / 2 + decibelsToY(decibels, height - LINE_WIDTH)
    if (column === 0) context.moveTo(0.5, y)
    else context.lineTo(column + 0.5, y)
  }
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

  // Dozens of 50 ms windows fall into each pixel column; the loudest one stays visible.
  const columns = mergeLoudness(loudness, Math.floor(width))
  if (columns.length === 0) return

  const color = getComputedStyle(document.documentElement).getPropertyValue('--color-wave')

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
  context.lineWidth = LINE_WIDTH
  context.lineJoin = 'round'
  context.stroke()
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

watch(() => sourceFile.loudness, draw)
</script>

<template>
  <div>
    <canvas ref="canvas" class="block h-30 w-full" aria-label="Loudness curve of the whole file" />
    <div class="mt-1 flex justify-between text-xs text-muted">
      <span v-for="(time, index) in axisTimes" :key="index">{{ time }}</span>
    </div>
  </div>
</template>
