<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { DASH_PATTERN } from '@/shared/lib/canvas/dash-pattern.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
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
playhead can be dragged along the range, a press on a split line selects the split, and any other
press places the mark, a 1 px dashed line (`lib/use-range-press.ts` has the order, and the
playhead's pause and resume for a drag). The view is a slider on the mark and takes the keyboard:
Left and Right move the mark 100 ms, with Shift 1 s (from the playhead when there is no mark yet),
Enter adds a split at it without leaving the view, Space plays or pauses the range, as the panel's
button does (a held key is ignored, so it does not start and stop the sound over and over), and Home
takes the playhead back to the range's start. A failure to play is said in a line at the bottom of
the view.
*/

// DESIGN.md: the whole canvas is framed in 1.5 px ink, as in the zoom view.
const FRAME_WIDTH = 1.5
// The playhead is one CSS pixel of ink, and so is the mark.
const PLAYHEAD_WIDTH = 1
const MARK_WIDTH = 1
// Left and Right move the mark 100 ms, with Shift 1 s.
const MARK_STEP_SECONDS = 0.1
const SHIFT_MARK_STEP_SECONDS = 1

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const audition = useAuditionStore()
const canvas = useTemplateRef('canvas')
const frame = useTemplateRef('frame')

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

  // The mark is a dashed line, never mistaken for a split line or the playhead, under the latter.
  if (split.markSeconds !== null) {
    const x = zoomTimeToX(split.markSeconds, centreSeconds, windowSeconds, width)
    // Snapped to the middle of a whole CSS pixel, so the line is not smeared over two.
    const snapped = Math.round(x - MARK_WIDTH / 2) + MARK_WIDTH / 2
    context.strokeStyle = style.getPropertyValue('--color-ink')
    context.lineWidth = MARK_WIDTH
    context.setLineDash(DASH_PATTERN)
    context.beginPath()
    context.moveTo(snapped, 0)
    context.lineTo(snapped, height)
    context.stroke()
    context.setLineDash([])
  }

  /*
  The playhead goes over the split lines and the mark, which it must stay readable against, and
  under the frame, so the frame stays the outermost line of the canvas.
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

function frameWidth() {
  return frame.value?.getBoundingClientRect().width ?? 0
}

// The range's map onto the view's current width, for the pointer; null without a range.
function axis() {
  const range = split.range
  return range === null ? null : { ...rangeWindow(range), width: frameWidth() }
}

const { overPlayhead, dragging, onPointerDown, onPointerMove, onPointerEnd } = useRangePress({
  playheadX: () => {
    const map = axis()
    const playhead = audition.rangePlayheadSeconds()
    return map === null || playhead === null
      ? null
      : zoomTimeToX(playhead, map.centreSeconds, map.windowSeconds, map.width)
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
    audition.seekRange(seconds)
  },
  drop: () => {
    audition.dropPlayhead()
  },
  selectSplit: (index) => {
    const selected = split.splits[index]
    if (selected !== undefined) split.selectSplit(selected.id)
  },
  placeMark: (seconds) => {
    split.placeMark(seconds)
    // A click focuses the view, so the keys work on the mark at once.
    frame.value?.focus()
  },
})

// With no mark yet, the arrow keys start from the playhead, so the keyboard can place one.
function moveMark(direction: -1 | 1, isShifted: boolean) {
  const from = split.markSeconds ?? audition.rangePlayheadSeconds()
  if (from === null) return
  const step = isShifted ? SHIFT_MARK_STEP_SECONDS : MARK_STEP_SECONDS
  split.placeMark(roundToMillisecond(from + direction * step))
}

function onKeydown(event: KeyboardEvent) {
  // Ctrl, Cmd and Alt with a key belong to the browser (word and page navigation).
  if (event.ctrlKey || event.metaKey || event.altKey) return
  switch (event.key) {
    case ' ': {
      // A held key must not start and stop the sound, or add splits, over and over.
      if (!event.repeat) audition.toggleRange()
      break
    }
    case 'Enter': {
      if (!event.repeat) split.addSplitAtMark()
      break
    }
    case 'Home': {
      audition.backToRangeStart()
      break
    }
    case 'ArrowLeft':
    case 'ArrowRight': {
      moveMark(event.key === 'ArrowLeft' ? -1 : 1, event.shiftKey)
      break
    }
    default: {
      return
    }
  }
  // Never a page scroll.
  event.preventDefault()
}

usePlayheadFrames(() => audition.rangeStatus === 'playing', draw)

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    split.range,
    split.gaps,
    split.splits.map((point) => point.seconds),
    split.selectedSplit?.id,
    split.markSeconds,
    audition.rangePlayheadSeconds(),
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
      aria-label="Mark in the range"
      :aria-valuemin="split.range?.startSeconds"
      :aria-valuemax="split.range?.endSeconds"
      :aria-valuenow="split.markSeconds ?? undefined"
      :aria-valuetext="split.markSeconds === null ? 'No mark' : formatHundredths(split.markSeconds)"
      class="size-full select-none focus-visible:focus-ring"
      :class="{ 'cursor-ew-resize': overPlayhead || dragging }"
      @keydown="onKeydown"
      @pointerdown="onPointerDown"
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
