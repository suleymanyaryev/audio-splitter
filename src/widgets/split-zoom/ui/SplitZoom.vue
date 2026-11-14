<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { ZOOM_WINDOW_SECONDS } from '@/entities/split/config/zoom-window.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { redrawWhenFontsLoad } from '@/shared/lib/canvas/canvas-text.ts'
import { drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import { draggedTime } from '../lib/dragged-time.ts'
import { useSplitDrag } from '../lib/use-split-drag.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow, outsideFileSpans } from '../lib/zoom-spans.ts'
import { useAuditionStore } from '../model/audition.ts'

/*
The zoom view: the 20 s around the zoom centre at 160 px, where the selected split is moved. It is
the only place a split moves (ticket 13). The wave is the same peaks as the whole-file view, in the
same bars; each gap is a land at its true width with a flat run-out line through it; the selected
split is a wider line with a drag handle at its top. The handle is a real element over the canvas so
it can take keyboard focus: Left and Right move the split 10 ms, with Shift 100 ms, and Delete
(Backspace too, the delete key of a Mac keyboard) deletes it. Space plays the clip across the split
or stops it, as the "Play across split" button does (ticket 14); while it plays a 1 px ink line
shows where the sound is, and a failure to play is said in a line at the bottom of the view.
*/

// DESIGN.md: bars 2 px wide on a 3 px pitch.
const BAR_WIDTH = 2
const BAR_PITCH = 3
// DESIGN.md: the whole canvas is framed in 1.5 px ink; the run-out line is 1 px.
const FRAME_WIDTH = 1.5
const RUN_OUT_WIDTH = 1
// The playhead is one CSS pixel of ink.
const PLAYHEAD_WIDTH = 1
// Arrow keys move 10 ms, one bucket; with Shift, 100 ms.
const KEY_STEP_SECONDS = 0.01
const SHIFT_KEY_STEP_SECONDS = 0.1

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const audition = useAuditionStore()
const canvas = useTemplateRef('canvas')
const frame = useTemplateRef('frame')
const handle = useTemplateRef('handle')

const windowStart = computed(() => split.zoomCentreSeconds - ZOOM_WINDOW_SECONDS / 2)
const windowEnd = computed(() => split.zoomCentreSeconds + ZOOM_WINDOW_SECONDS / 2)

// The handle's place as a share of the width, which needs no measuring. Never outside the window.
const handleLeft = computed(() => {
  const selected = split.selectedSplit
  if (selected === null) return null
  const fraction = (selected.seconds - windowStart.value) / ZOOM_WINDOW_SECONDS
  return fraction < 0 || fraction > 1 ? null : `${Math.round(fraction * 10_000) / 100}%`
})

function frameWidth() {
  return frame.value?.getBoundingClientRect().width ?? 0
}

const { overLine, dragging, onPointerDown, onPointerMove, onPointerEnd } = useSplitDrag({
  lineX: () => {
    const selected = split.selectedSplit
    return selected === null
      ? null
      : zoomTimeToX(selected.seconds, split.zoomCentreSeconds, ZOOM_WINDOW_SECONDS, frameWidth())
  },
  seconds: (x, grabOffset) =>
    draggedTime(x, grabOffset, split.zoomCentreSeconds, ZOOM_WINDOW_SECONDS, frameWidth()),
  move: (seconds) => {
    if (split.selectedSplitId !== null) split.moveSplit(split.selectedSplitId, seconds)
  },
})

/*
Puts the keyboard on the handle once the DOM has it, so a split just added or still selected after
a delete can be nudged at once. With no split left there is no handle, and the zoom view itself
takes the focus, so it does not fall back to the page.
*/
async function focusHandle() {
  await nextTick()
  const target = handle.value ?? frame.value
  target?.focus()
}

defineExpose({ focusHandle })

function onKeydown(event: KeyboardEvent) {
  if (event.key === ' ') {
    // Never a page scroll, and a held key must not start and stop the sound over and over.
    event.preventDefault()
    if (!event.repeat) audition.toggle()
    return
  }
  const selected = split.selectedSplit
  if (selected !== null && (event.key === 'Delete' || event.key === 'Backspace')) {
    event.preventDefault()
    split.deleteSplit(selected.id)
    void focusHandle()
    return
  }
  const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
  if (selected === null || direction === undefined) return
  event.preventDefault()
  const step = event.shiftKey ? SHIFT_KEY_STEP_SECONDS : KEY_STEP_SECONDS
  split.moveSplit(selected.id, selected.seconds + direction * step)
}

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
  const centre = split.zoomCentreSeconds
  const middle = height / 2
  // A sample of ±1 reaches the frame.
  const halfHeight = middle - FRAME_WIDTH

  const bars = zoomBars(peaks, centre, ZOOM_WINDOW_SECONDS, width, BAR_PITCH)
  context.fillStyle = style.getPropertyValue('--color-wave')
  for (let bar = 0; bar < bars.length / 2; bar++) {
    const min = bars[bar * 2] ?? 0
    const max = bars[bar * 2 + 1] ?? 0
    const top = middle - max * halfHeight
    const bottom = middle - min * halfHeight
    context.fillRect(bar * BAR_PITCH, top, BAR_WIDTH, bottom - top)
  }

  // Lands cover the bars; a gap is near-silence, not nothing, so a flat line runs through it.
  const landColor = style.getPropertyValue('--color-land')
  const lands = landSpansInWindow(split.gaps, centre, ZOOM_WINDOW_SECONDS, width)
  for (const { left, right } of lands) {
    context.fillStyle = landColor
    context.fillRect(left, 0, right - left, height)
    context.fillStyle = style.getPropertyValue('--color-wave')
    context.fillRect(left, middle - RUN_OUT_WIDTH / 2, right - left, RUN_OUT_WIDTH)
  }

  // The window is not held inside the file: what lies before 0 s or past the end is empty ground.
  context.fillStyle = style.getPropertyValue('--color-ground')
  const outside = outsideFileSpans(
    centre,
    ZOOM_WINDOW_SECONDS,
    sourceFile.durationSeconds ?? 0,
    width,
  )
  for (const { left, right } of outside) {
    context.fillRect(left, 0, right - left, height)
  }

  drawSplitLines(
    context,
    split.splits.map((point) => zoomTimeToX(point.seconds, centre, ZOOM_WINDOW_SECONDS, width)),
    style.getPropertyValue('--color-split'),
    0,
    height,
    split.selectedSplitIndex,
  )

  /*
  The playhead goes over the split lines, which it must stay readable against, and under the
  frame, so the frame stays the outermost line of the canvas.
  */
  const playhead = audition.playheadSeconds()
  if (playhead !== null) {
    const x = zoomTimeToX(playhead, centre, ZOOM_WINDOW_SECONDS, width)
    if (x >= 0 && x <= width) {
      context.fillStyle = style.getPropertyValue('--color-ink')
      // Snapped to a whole CSS pixel so the line is not smeared over two.
      context.fillRect(Math.round(x - PLAYHEAD_WIDTH / 2), 0, PLAYHEAD_WIDTH, height)
    }
  }

  context.strokeStyle = style.getPropertyValue('--color-ink')
  context.lineWidth = FRAME_WIDTH
  context.strokeRect(FRAME_WIDTH / 2, FRAME_WIDTH / 2, width - FRAME_WIDTH, height - FRAME_WIDTH)
}

/*
The playhead moves with the audio, which Vue does not see, so while the clip plays the view
redraws on every animation frame: about 300 bars and a few lines, cheap. When playback ends the
loop stops and one more draw takes the line away.
*/
const playheadLoop: { frameId: number | undefined } = { frameId: undefined }

function onFrame() {
  if (audition.status !== 'playing') return
  playheadLoop.frameId = requestAnimationFrame(onFrame)
  draw()
}

function stopFrames() {
  if (playheadLoop.frameId === undefined) return
  cancelAnimationFrame(playheadLoop.frameId)
  playheadLoop.frameId = undefined
}

watch(
  () => audition.status,
  (status) => {
    stopFrames()
    if (status === 'playing') {
      playheadLoop.frameId = requestAnimationFrame(onFrame)
    } else {
      draw()
    }
  },
)

const resizeObserver = new ResizeObserver(draw)
const darkScheme = globalThis.matchMedia('(prefers-color-scheme: dark)')

onMounted(() => {
  if (canvas.value) resizeObserver.observe(canvas.value)
  // The colour tokens change with the colour scheme, and a canvas does not repaint itself.
  darkScheme.addEventListener('change', draw)
  draw()
  redrawWhenFontsLoad(draw)
})

onBeforeUnmount(() => {
  resizeObserver.disconnect()
  darkScheme.removeEventListener('change', draw)
  stopFrames()
})

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
  <div
    ref="frame"
    tabindex="-1"
    class="relative h-40 select-none focus-visible:focus-ring"
    :class="{ 'cursor-ew-resize': overLine || dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
  >
    <canvas ref="canvas" class="block size-full" aria-label="Zoomed waveform of the split" />
    <div
      v-if="split.selectedSplit !== null && handleLeft !== null"
      ref="handle"
      role="slider"
      tabindex="0"
      :aria-label="`Split ${(split.selectedSplitIndex ?? 0) + 1}`"
      :aria-valuemin="Math.max(0, windowStart)"
      :aria-valuemax="Math.min(sourceFile.durationSeconds ?? windowEnd, windowEnd)"
      :aria-valuenow="split.selectedSplit.seconds"
      :aria-valuetext="formatHundredths(split.selectedSplit.seconds)"
      class="absolute top-0.5 h-2.5 w-3.5 -translate-x-1/2 cursor-ew-resize bg-split focus-visible:focus-ring"
      :style="{ left: handleLeft }"
      @keydown="onKeydown"
    />
    <p
      v-if="audition.failure !== null"
      role="status"
      class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
    >
      <span class="bg-surface px-3 py-1.5 text-sm text-muted">{{ audition.failure }}</span>
    </p>
    <p
      v-if="split.splits.length === 0"
      role="status"
      class="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <span class="bg-surface px-3 py-1.5 text-sm text-muted">
        No splits were found in this file.
      </span>
    </p>
  </div>
</template>
