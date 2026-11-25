<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { drawConfidenceMarks } from '@/shared/lib/canvas/draw-confidence-marks.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { drawMark } from '@/shared/lib/canvas/draw-mark.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { usePageKeys } from '@/shared/lib/keyboard/use-page-keys.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import { roundToMillisecond } from '@/shared/lib/time/round-to-millisecond.ts'
import { draggedTime } from '../lib/dragged-time.ts'
import { rangeWindow } from '../lib/range-window.ts'
import { usePlayheadFrames } from '../lib/use-playhead-frames.ts'
import { useRangePress } from '../lib/use-range-press.ts'
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
playhead can be dragged along the range, and any other single press places the mark, a 1 px dashed
line, even next to a split's line: a double-click moves the playhead there, or, within 6 px of a
split's line, selects that split and opens the Split view (`lib/use-range-press.ts` has the order,
and the playhead's pause and resume for a drag). The view is a slider on the playhead and takes the
page's keys, wherever the focus is: Left and Right move the playhead 1 s, with Shift 10 s, as in the Track view, and the mark
has no keys. Enter adds a split at the mark and Shift+Enter one where the playhead is, so a split
can be put where it is heard while the range plays, and neither stops the sound or leaves the view.
Space plays or pauses the range, as the panel's button does, and Home takes the playhead back to the
range's start. A held Space, Enter or Shift+Enter is ignored, so it does not start and stop the sound
or add splits over and over. A failure to play is said in a line at the bottom of the view.
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

// The range's start for a new range, then where it is heard or resumes; 0 with no range.
function playheadSeconds() {
  return split.range === null ? 0 : audition.stretchPlayheadSeconds(split.range)
}

/*
The slider's value. While the range plays the playhead follows the audio, which Vue does not see,
so each frame copies it here to the whole second: a screen reader hears a new value once a second,
not on every frame. Otherwise it is the resting place, which Vue does see, to the hundredth.
*/
const heardSeconds = ref(0)
const sliderSeconds = computed(() =>
  audition.stretchStatus === 'playing' ? heardSeconds.value : playheadSeconds(),
)

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
  const lineXs = split.splits.map((point) =>
    zoomTimeToX(point.seconds, centreSeconds, windowSeconds, width),
  )
  drawSplitLines(
    context,
    lineXs,
    style.getPropertyValue('--color-split'),
    0,
    height,
    split.selectedSplitIndex,
  )
  drawConfidenceMarks(context, style, split.splits, lineXs, 0, height)

  // The mark is a dashed line, never mistaken for a split line or the playhead, under the latter.
  if (split.markSeconds !== null) {
    const x = zoomTimeToX(split.markSeconds, centreSeconds, windowSeconds, width)
    drawMark(context, x, style.getPropertyValue('--color-ink'), height)
  }

  /*
  The playhead goes over the split lines and the mark, which it must stay readable against, and
  under the frame, so the frame stays the outermost line of the canvas.
  */
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

// The range's map onto the view's current width, for the pointer; null without a range.
function axis() {
  const range = split.range
  return range === null ? null : { ...rangeWindow(range), width: frameWidth() }
}

const { overPlayhead, dragging, onPointerDown, onPointerMove, onPointerEnd, onDoubleClick } =
  useRangePress({
    playheadX: () => {
      const map = axis()
      return map === null
        ? null
        : zoomTimeToX(playheadSeconds(), map.centreSeconds, map.windowSeconds, map.width)
    },
    splitXs: () => {
      const map = axis()
      return map === null
        ? []
        : split.splits.map((point) =>
            zoomTimeToX(point.seconds, map.centreSeconds, map.windowSeconds, map.width),
          )
    },
    seconds: (x) => {
      const map = axis()
      // Without a range there is nothing to point at, so this is not asked. Rounded to 10 ms, as a
      // dragged split is, so a mark or a split made from a click lands on the same grid.
      return map === null ? 0 : draggedTime(x, 0, map.centreSeconds, map.windowSeconds, map.width)
    },
    grab: () => {
      audition.grabPlayhead()
    },
    move: (seconds) => {
      if (split.range !== null) audition.seekStretch(split.range, seconds)
    },
    drop: () => {
      if (split.range !== null) audition.dropPlayhead(split.range)
    },
    selectSplit: (index) => {
      const selected = split.splits[index]
      if (selected !== undefined) split.selectSplit(selected.id)
    },
    placeMark: (seconds) => {
      split.placeMark(seconds)
    },
  })

function moveBy(direction: -1 | 1, isShifted: boolean) {
  if (split.range === null) return
  const step = isShifted ? SHIFT_STEP_SECONDS : STEP_SECONDS
  audition.seekStretch(split.range, roundToMillisecond(playheadSeconds() + direction * step))
}

/*
Enter adds a split at the mark, and Shift+Enter one where the playhead is, so a split goes where the
sound is heard. With no mark, Enter has nothing to add a split at and is left alone; Shift+Enter
always has the playhead. A held key adds one split, not one per repeat.
*/
function addSplitFromKey(event: KeyboardEvent) {
  if (!event.shiftKey && split.markSeconds === null) return false
  if (event.repeat) return true
  if (event.shiftKey) split.addSplitAt(playheadSeconds())
  else split.addSplitAtMark()
  return true
}

// Whether the key was the view's: a key it leaves alone is the browser's, and is not reported.
function isKeyActedOn(event: KeyboardEvent) {
  switch (event.key) {
    case ' ': {
      // A held key must not start and stop the sound over and over.
      if (!event.repeat && split.range !== null) audition.toggleStretch(split.range)
      return true
    }
    case 'Enter': {
      return addSplitFromKey(event)
    }
    case 'Home': {
      if (split.range !== null) audition.backToStretchStart(split.range)
      return true
    }
    case 'ArrowLeft':
    case 'ArrowRight': {
      moveBy(event.key === 'ArrowLeft' ? -1 : 1, event.shiftKey)
      return true
    }
    default: {
      return false
    }
  }
}

/*
The keys are the page's, not the frame's: this view is the one on show, so they work wherever the
focus is, and `acted` tells the page which key was used (src/shared/lib/keyboard/use-page-keys.ts).
*/
const emit = defineEmits<{ acted: [] }>()
usePageKeys(isKeyActedOn, {
  root: () => frame.value,
  onActed: () => {
    emit('acted')
  },
})

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
    split.range,
    split.gaps,
    split.splits.map((point) => point.seconds),
    // Checking a split takes its mark away and changes nothing else.
    split.splits.map((point) => point.confidence?.band),
    split.selectedSplit?.id,
    split.markSeconds,
    playheadSeconds(),
  ],
  draw,
)
</script>

<template>
  <div class="relative h-40">
    <!-- A slider must take the focus for a screen reader, but it is no tab stop: the keys reach the view
    wherever the focus is. -->
    <div
      ref="frame"
      role="slider"
      tabindex="-1"
      aria-label="Playhead in the range"
      :aria-valuemin="split.range?.startSeconds"
      :aria-valuemax="split.range?.endSeconds"
      :aria-valuenow="sliderSeconds"
      :aria-valuetext="formatHundredths(sliderSeconds)"
      class="size-full select-none"
      :class="{ 'cursor-ew-resize': overPlayhead || dragging }"
      @pointerdown="onPointerDown"
      @dblclick="onDoubleClick"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @lostpointercapture="onPointerEnd"
    >
      <canvas ref="canvas" class="block size-full" aria-label="Waveform of the range" />
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
