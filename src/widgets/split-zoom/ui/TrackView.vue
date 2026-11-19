<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import { roundToMillisecond } from '@/shared/lib/time/round-to-millisecond.ts'
import { draggedTime } from '../lib/dragged-time.ts'
import { rangeWindow } from '../lib/range-window.ts'
import { trackExtent } from '../lib/track-extent.ts'
import { usePlayheadFrames } from '../lib/use-playhead-frames.ts'
import { useRangePress } from '../lib/use-range-press.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow } from '../lib/zoom-spans.ts'
import { useAuditionStore } from '../model/audition.ts'

/*
The Track view (GLOSSARY.md): the selected track stretched across a 160 px canvas whatever its
length, in the zoom view's place and at its height, so the page does not jump when the panel
switches. Like the Range view it draws the peaks the whole-file view already holds, merged over the
track's buckets, with the lands and the split lines that fall inside the track on the same axis: its
two end splits sit on the edges, and a track has no split inside it. No split is selected, moved or
added here, so nothing on the canvas is a split's to take.

A 1 px ink playhead is drawn at all times: at the track's start for a new track, then where the
track is heard or where it resumes, on every animation frame while it plays. A press within 6 px of
it takes hold of it and drags it along the track; any other press, a press near an end split
included, moves it there. The view is a slider on the playhead and takes the keyboard: Left and
Right move it 1 s, with Shift 10 s, Space plays or pauses the track, as the panel's button does (a
held key is ignored, so it does not start and stop the sound over and over), and Home takes the
playhead back to the track's start. Delete and Backspace do nothing: removing a track deletes
splits and has its own button. A failure to play is said in a line at the bottom of the view.

The player plays the whole track, however long: a track over 10 min is heard through a window that
moves along it (`model/audition.ts`), which this view does not see.
*/

// DESIGN.md: the whole canvas is framed in 1.5 px ink, as in the zoom view.
const FRAME_WIDTH = 1.5
// The playhead is one CSS pixel of ink.
const PLAYHEAD_WIDTH = 1
// Left and Right move the playhead 1 s, with Shift 10 s.
const STEP_SECONDS = 1
const SHIFT_STEP_SECONDS = 10

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const audition = useAuditionStore()
const canvas = useTemplateRef('canvas')
const frame = useTemplateRef('frame')

// What the view draws, and what the player plays: the whole selected track.
const extent = computed(() =>
  split.selectedTrack === null ? null : trackExtent(split.selectedTrack),
)

// The track's start for a new track, then where it is heard or resumes; 0 with no track selected.
function playheadSeconds() {
  return extent.value === null ? 0 : audition.stretchPlayheadSeconds(extent.value)
}

/*
The slider's value. While the track plays the playhead follows the audio, which Vue does not see,
so each frame copies it here to the whole second: a screen reader hears a new value once a second,
not on every frame. Otherwise it is the resting place, which Vue does see, to the hundredth.
*/
const heardSeconds = ref(0)
const sliderSeconds = computed(() =>
  audition.stretchStatus === 'playing' ? heardSeconds.value : playheadSeconds(),
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
  const x = zoomTimeToX(playheadSeconds(), centreSeconds, windowSeconds, width)
  context.fillStyle = style.getPropertyValue('--color-ink')
  // Snapped to a whole CSS pixel so the line is not smeared over two.
  context.fillRect(Math.round(x - PLAYHEAD_WIDTH / 2), 0, PLAYHEAD_WIDTH, height)

  context.strokeStyle = style.getPropertyValue('--color-ink')
  context.lineWidth = FRAME_WIDTH
  context.strokeRect(FRAME_WIDTH / 2, FRAME_WIDTH / 2, width - FRAME_WIDTH, height - FRAME_WIDTH)
}

function frameWidth() {
  return frame.value?.getBoundingClientRect().width ?? 0
}

// The track's map onto the view's current width, for the pointer; null without a track.
function axis() {
  const track = extent.value
  return track === null ? null : { ...rangeWindow(track), width: frameWidth() }
}

/*
The Range view's press, with no split line to take and the playhead where the mark would go: a press
within 6 px of the playhead drags it, and any other press moves it there.
*/
const { overPlayhead, dragging, onPointerDown, onPointerMove, onPointerEnd } = useRangePress({
  playheadX: () => {
    const map = axis()
    return map === null
      ? null
      : zoomTimeToX(playheadSeconds(), map.centreSeconds, map.windowSeconds, map.width)
  },
  splitXs: () => [],
  seconds: (x) => {
    const map = axis()
    // Without a track there is nothing to point at, so this is not asked. Rounded to 10 ms, as the
    // Range view's times are, so a click and a drag land on the same grid.
    return map === null ? 0 : draggedTime(x, 0, map.centreSeconds, map.windowSeconds, map.width)
  },
  grab: () => {
    audition.grabPlayhead()
  },
  move: (seconds) => {
    if (extent.value !== null) audition.seekStretch(extent.value, seconds)
  },
  drop: () => {
    if (extent.value !== null) audition.dropPlayhead(extent.value)
  },
  selectSplit: () => {},
  placeMark: (seconds) => {
    if (extent.value !== null) audition.seekStretch(extent.value, seconds)
    // A click focuses the view, so the keys work on the playhead at once.
    frame.value?.focus()
  },
})

function moveBy(direction: -1 | 1, isShifted: boolean) {
  if (extent.value === null) return
  const step = isShifted ? SHIFT_STEP_SECONDS : STEP_SECONDS
  audition.seekStretch(
    extent.value,
    roundToMillisecond(audition.stretchPlayheadSeconds(extent.value) + direction * step),
  )
}

function onKeydown(event: KeyboardEvent) {
  // Ctrl, Cmd and Alt with a key belong to the browser (word and page navigation).
  if (event.ctrlKey || event.metaKey || event.altKey) return
  switch (event.key) {
    case ' ': {
      // A held key must not start and stop the sound over and over.
      if (!event.repeat && extent.value !== null) audition.toggleStretch(extent.value)
      break
    }
    case 'Home': {
      if (extent.value !== null) audition.backToStretchStart(extent.value)
      break
    }
    case 'ArrowLeft':
    case 'ArrowRight': {
      moveBy(event.key === 'ArrowLeft' ? -1 : 1, event.shiftKey)
      break
    }
    default: {
      // Delete and Backspace do nothing here, as does every other key.
      return
    }
  }
  // Never a page scroll.
  event.preventDefault()
}

usePlayheadFrames(
  () => audition.stretchStatus === 'playing',
  () => {
    heardSeconds.value = Math.floor(playheadSeconds())
    draw()
  },
)

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    extent.value?.startSeconds,
    extent.value?.endSeconds,
    split.gaps,
    split.splits.map((point) => point.seconds),
    playheadSeconds(),
  ],
  draw,
)
</script>

<template>
  <div class="relative h-40">
    <div
      ref="frame"
      tabindex="0"
      role="slider"
      aria-label="Playhead in the track"
      :aria-valuemin="extent?.startSeconds"
      :aria-valuemax="extent?.endSeconds"
      :aria-valuenow="sliderSeconds"
      :aria-valuetext="formatHundredths(sliderSeconds)"
      class="size-full select-none focus-visible:focus-ring"
      :class="{ 'cursor-ew-resize': overPlayhead || dragging }"
      @keydown="onKeydown"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @lostpointercapture="onPointerEnd"
    >
      <canvas ref="canvas" class="block size-full" aria-label="Waveform of the track" />
    </div>
    <p
      v-if="audition.failure !== null"
      role="status"
      class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
    >
      <span class="bg-surface px-3 py-1.5 text-sm text-muted">{{ audition.failure }}</span>
    </p>
  </div>
</template>
