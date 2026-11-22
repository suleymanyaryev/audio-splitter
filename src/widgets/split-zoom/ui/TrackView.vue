<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { drawMark } from '@/shared/lib/canvas/draw-mark.ts'
import { drawPendingSplits } from '@/shared/lib/canvas/draw-pending-splits.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { zoomTimeToX } from '@/shared/lib/canvas/zoom-axis.ts'
import { usePageKeys } from '@/shared/lib/keyboard/use-page-keys.ts'
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
two end splits sit on the edges, and a track has no split inside it. No split is moved or added
here, and one is selected only by a double-click on an end split's line.

A 1 px ink playhead is drawn at all times: at the track's start for a new track, then where the
track is heard or where it resumes, on every animation frame while it plays. The track's own mark, a
1 px dashed line, is drawn under it (the split store keeps it while the track stays selected). A press
within 6 px of the playhead takes hold of it and drags it along the track; a press within 6 px of a
pending split selects it; any other press places the mark and lets go of the selected pending split,
even next to an end split, so pointing never moves the playhead. A double-click moves the playhead
there, or, within 6 px of one of the track's two end split lines, selects that split and opens the
Split view (`lib/use-range-press.ts` has the order).

The pending splits (GLOSSARY.md) of the track are drawn over the split lines in a look nothing else
has (`shared/lib/canvas/draw-pending-splits.ts`), the selected one heavier. The view is a slider on the
playhead and takes the page's keys, wherever the focus is: Left and Right move it 1 s, with Shift 10 s, Space plays or pauses
the track, as the panel's button does, and Home takes the playhead back to the track's start. Enter
adds a pending split at the mark and selects it; Shift+Enter adds one where the playhead is, without
selecting it, so a tap along a playing track is always taken. Delete and Backspace delete the
selected pending split and Escape deselects it; with none selected those keys are left alone, since
removing a track deletes splits and has its own button. `[` and `]` select the previous and next
track, as a click on its row does. A held Space, Enter, Shift+Enter, `[` or `]` is ignored, so it
does not start and stop the sound, add pending splits or step over and over. A failure to
play is said in a line at the bottom of the view.

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

  // Pending splits go over the split lines and under the mark, which can sit on one.
  drawPendingSplits(
    context,
    split.pendingSplits.map((seconds) => zoomTimeToX(seconds, centreSeconds, windowSeconds, width)),
    style.getPropertyValue('--color-ink'),
    height,
    split.selectedPendingSplit === null
      ? null
      : split.pendingSplits.indexOf(split.selectedPendingSplit),
  )

  // The mark is a dashed line under the playhead, which must stay readable against it.
  if (split.trackMarkSeconds !== null) {
    const markX = zoomTimeToX(split.trackMarkSeconds, centreSeconds, windowSeconds, width)
    drawMark(context, markX, style.getPropertyValue('--color-ink'), height)
  }

  // The playhead goes over the split lines and the mark, and under the frame, the outermost line.
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
The Range view's press: a press within 6 px of the playhead drags it, any other places the track's
mark; a double-click moves the playhead, or selects the end split whose line is within 6 px.
*/
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
        : split.selectedTrackEndSplits.map((point) =>
            zoomTimeToX(point.seconds, map.centreSeconds, map.windowSeconds, map.width),
          )
    },
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
    selectSplit: (index) => {
      const selected = split.selectedTrackEndSplits[index]
      if (selected !== undefined) split.selectSplit(selected.id)
    },
    pendingXs: () => {
      const map = axis()
      return map === null
        ? []
        : split.pendingSplits.map((seconds) =>
            zoomTimeToX(seconds, map.centreSeconds, map.windowSeconds, map.width),
          )
    },
    selectPending: (index) => {
      const selected = split.pendingSplits[index]
      if (selected !== undefined) split.selectPendingSplit(selected)
    },
    placeMark: (seconds) => {
      // Any press that is not on a pending split lets go of the selected one.
      split.deselectPendingSplit()
      split.placeTrackMark(seconds)
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

/*
A held key adds one only (the caller sees to it). Shift: where the playhead is, so a tap along a
playing track is taken whatever is selected; otherwise at the mark.
*/
function addPendingSplitFromKey(isShifted: boolean) {
  if (isShifted) split.addPendingSplit(playheadSeconds(), false)
  else split.addPendingSplitAtMark()
}

// Escape lets go of the selected pending split; Delete and Backspace delete it.
function actOnSelectedPendingSplit(key: string) {
  if (key === 'Escape') split.deselectPendingSplit()
  else split.deleteSelectedPendingSplit()
}

/*
`[` and `]` step to the previous and next track. They are matched by the physical key, to the right
of P, not by the character it types: on a German or similar layout `[` and `]` need AltGr or Option,
and the page keys leave a key with Alt to the browser, so a match on `event.key` would never arrive.
Shift is left free, and a held key steps once.
*/
const STEP_BY_CODE: Record<string, -1 | 1> = { BracketLeft: -1, BracketRight: 1 }

// Whether the key stepped: at the first or last track, or over the discard question, it did not.
function isStepKeyActedOn(event: KeyboardEvent, step: -1 | 1) {
  return !event.shiftKey && !event.repeat && split.selectAdjacentTrack(step)
}

// Whether the key was the view's: a key it leaves alone is the browser's, and is not reported.
function isKeyActedOn(event: KeyboardEvent) {
  const step = STEP_BY_CODE[event.code]
  if (step !== undefined) return isStepKeyActedOn(event, step)
  switch (event.key) {
    case ' ': {
      // A held key must not start and stop the sound over and over.
      if (!event.repeat && extent.value !== null) audition.toggleStretch(extent.value)
      return true
    }
    case 'Enter': {
      // With no mark, Enter has nothing to add a pending split at; Shift+Enter always has the playhead.
      if (!event.shiftKey && split.trackMarkSeconds === null) return false
      if (!event.repeat) addPendingSplitFromKey(event.shiftKey)
      return true
    }
    case 'Delete':
    case 'Backspace':
    case 'Escape': {
      // Only the selected pending split is theirs; with none, the key is left alone.
      if (split.selectedPendingSplit === null) return false
      actOnSelectedPendingSplit(event.key)
      return true
    }
    case 'Home': {
      if (extent.value !== null) audition.backToStretchStart(extent.value)
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
    extent.value?.startSeconds,
    extent.value?.endSeconds,
    split.gaps,
    split.splits.map((point) => point.seconds),
    split.trackMarkSeconds,
    split.pendingSplits,
    split.selectedPendingSplit,
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
      aria-label="Playhead in the track"
      :aria-valuemin="extent?.startSeconds"
      :aria-valuemax="extent?.endSeconds"
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
