<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { ZOOM_WINDOW_SECONDS } from '@/entities/split/config/zoom-window.ts'
import { useSplitStore, type Split } from '@/entities/split/model/split.ts'
import { drawConfidenceMarks } from '@/shared/lib/canvas/draw-confidence-marks.ts'
import { drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import {
  drawFrame,
  drawPlayhead,
  FRAME_WIDTH,
} from '@/shared/lib/canvas/draw-playhead-and-frame.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { zoomTimeToX, zoomXToTime } from '@/shared/lib/canvas/zoom-axis.ts'
import { usePageKeys } from '@/shared/lib/keyboard/use-page-keys.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import { roundToMillisecond } from '@/shared/lib/time/round-to-millisecond.ts'
import { auditionEdgeRects } from '../lib/audition-edges.ts'
import { createSpectrogramStrip } from '../lib/draw-spectrogram-strip.ts'
import { draggedTime } from '../lib/dragged-time.ts'
import { stepOfKey } from '../lib/step-of-key.ts'
import { usePlayheadSlider } from '../lib/use-playhead-slider.ts'
import { useSpectrogramReadout } from '../lib/use-spectrogram-readout.ts'
import { useSplitDrag } from '../lib/use-split-drag.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow, outsideFileSpans } from '../lib/zoom-spans.ts'
import { zoomLayout } from '../lib/zoom-layout.ts'
import { usePlayerStore } from '../model/player.ts'
import PlayerFailure from './PlayerFailure.vue'
import SpectrogramReadout from './SpectrogramReadout.vue'

/*
The Split view: the 20 s around the zoom centre, where the selected split is moved. It is
the only place a split moves (ticket 13). The wave is the same peaks as the whole-file view, in the
same bars; each gap is a land at its true width with a flat run-out line through it; the selected
split is a wider line with a drag handle at its top. The handle is a real element over the canvas so
it can be reached with Tab and read by a screen reader. The view takes the page's keys, wherever the
focus is: Left and Right move the split 10 ms, with Shift 100 ms, Delete (Backspace too, the delete
key of a Mac keyboard) deletes it, and `[` and `]` select the previous and next split, as a click
on it does. `K` marks a split that has a confidence as checked: it keeps its place and leaves the
walk of `{` and `}`, which are the review page's keys. Space plays the clip across the split and
pauses it, as the "Play across split" button does (ticket 14); a 1 px ink line always shows the
audition's playhead, where the sound is while it plays and where it resumes otherwise, and a failure
to play is said in a line at the bottom of the view. A held Space, `[` or `]` is ignored, so it does
not start and stop the sound or step over and over.

The playhead is moved by the keys `,` and `.` (back and forward 100 ms, with Shift 1 s, and again
while held) and Home (back to the audition's start). `,` and `.` are matched by the physical key
(`event.code`), so Shift and a Russian or Turkmen layout do not change them. The canvas is a slider
on the playhead, focusable but no Tab stop, as in the Track view; it sits beside the split's handle,
not around it, since a slider's children are skipped by a screen reader.

A press within reach of the split's line takes the split and never the playhead. Any other press
with the main button moves the playhead to the pointer (rounded to 10 ms, held to the 8 s) and
drags it along until the release; a playing audition pauses while it is held and plays on from the
drop (`lib/use-split-drag.ts`). A double-click does nothing here.

Under the waveform, in the same frame and on the same time map, is the spectrogram strip, as tall
as the waveform (`lib/draw-spectrogram-strip.ts`, docs/concepts/14-the-spectrum.md). The split
lines, the playhead and the audition's edges cross it; the lands and the confidence marks stay on
the waveform. The frame takes the pointer, so a press on the strip does what it does on the
waveform, and hovering the strip shows the frequency and level under the pointer
(`lib/use-spectrogram-readout.ts`).
*/

// DESIGN.md: the run-out line is 1 px.
const RUN_OUT_WIDTH = 1
// Arrow keys move 10 ms, one bucket; with Shift, 100 ms.
const KEY_STEP_SECONDS = 0.01
const SHIFT_KEY_STEP_SECONDS = 0.1
// `,` and `.` step the playhead 100 ms, with Shift 1 s.
const PLAYHEAD_STEP_SECONDS = 0.1
const SHIFT_PLAYHEAD_STEP_SECONDS = 1
// The physical keys where `,` and `.` sit on a US layout, to step back and forward.
const PLAYHEAD_KEY_DIRECTIONS: Record<string, -1 | 1> = { Comma: -1, Period: 1 }

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const player = usePlayerStore()
const canvas = useTemplateRef('canvas')
const drawSpectrogramStrip = createSpectrogramStrip()
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
    if (split.selectedSplit !== null) split.moveSplit(split.selectedSplit.id, seconds)
  },
  // Rounded to 10 ms, as a dragged split is; the store holds it to the 8 s.
  playheadSeconds: (x) =>
    draggedTime(x, 0, split.zoomCentreSeconds, ZOOM_WINDOW_SECONDS, frameWidth()),
  grabPlayhead: player.grabPlayhead,
  movePlayhead: player.seek,
  dropPlayhead: player.dropPlayhead,
})

const {
  readout,
  show: showReadout,
  hide: hideReadout,
  follow: followReadout,
} = useSpectrogramReadout({
  frame: () => frame.value,
  secondsAt: (x, width) => zoomXToTime(x, split.zoomCentreSeconds, ZOOM_WINDOW_SECONDS, width),
})
// A key that selects another split moves the window under a still pointer.
watch(() => split.zoomCentreSeconds, followReadout)

// The drag and the readout both follow the pointer.
function onFramePointerMove(event: PointerEvent) {
  onPointerMove(event)
  showReadout(event)
}

function stepPlayhead(direction: -1 | 1, isShifted: boolean) {
  const playhead = player.playheadSeconds()
  if (playhead === null) return
  const step = isShifted ? SHIFT_PLAYHEAD_STEP_SECONDS : PLAYHEAD_STEP_SECONDS
  player.seek(roundToMillisecond(playhead + direction * step))
}

/*
Whether the key stepped: at the first or last split, or over the discard question, it did not, and
an audition that is on goes on untouched. The player carries a sound that was on over to the new
split.
*/
function isStepKeyActedOn(step: -1 | 1) {
  return player.carryOver(() => split.selectAdjacentSplit(step))
}

/*
K marks the selected split checked, kept where it is. A held key marks once, and a split with no
confidence has no use for it, so the key is left to the browser.
*/
function isCheckKeyActedOn(event: KeyboardEvent, selected: Split) {
  if (selected.confidence === null) return false
  if (!event.repeat) split.markChecked()
  return true
}

/*
Space is taken exactly while the play button is enabled, so with nothing to play it is the
browser's. A held Space must not start and stop the sound over and over.
*/
function isSpaceKeyActedOn(event: KeyboardEvent) {
  if (!player.hasSubject) return false
  if (!event.repeat) player.toggle()
  return true
}

// Whether the key was the view's: a key it leaves alone is the browser's, and is not reported.
function isKeyActedOn(event: KeyboardEvent) {
  const step = stepOfKey(event)
  if (step !== null) return isStepKeyActedOn(step)
  if (event.key === ' ') return isSpaceKeyActedOn(event)
  const selected = split.selectedSplit
  if (selected === null) return false
  if (event.code === 'KeyK' && !event.shiftKey) return isCheckKeyActedOn(event, selected)
  if (event.key === 'Home') {
    player.backToStart()
    return true
  }
  // A held key steps again, so the playhead can be swept by keyboard.
  const playheadDirection = PLAYHEAD_KEY_DIRECTIONS[event.code]
  if (playheadDirection !== undefined) {
    stepPlayhead(playheadDirection, event.shiftKey)
    return true
  }
  // A held key deletes one split: the next one is selected at once and would go too, then the rest.
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!event.repeat) split.deleteSplit(selected.id)
    return true
  }
  const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
  if (direction === undefined) return false
  const moveSeconds = event.shiftKey ? SHIFT_KEY_STEP_SECONDS : KEY_STEP_SECONDS
  split.moveSplit(selected.id, selected.seconds + direction * moveSeconds)
  return true
}

/*
The keys are the page's, not the handle's: this view is the one on show, so they work wherever the
focus is (src/shared/lib/keyboard/use-page-keys.ts). The frame is the view's own root, so the
handle, a slider, never counts as a control that keeps the arrows for itself.
*/
usePageKeys(isKeyActedOn, { root: () => frame.value })

/*
The audition's edges are marked over the ground and under the split lines and the playhead
(`lib/audition-edges.ts`). They are ink brackets at the frame, not a tint, so they cannot be read as
the empty ground, which is a flat fill. The extent is already held to the file, so a held edge is
drawn at the file's end.
*/
function drawAuditionEdges(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  centre: number,
  width: number,
  height: number,
) {
  // The edges are the audition's, so they wait for a selected split, whatever the player shows.
  if (split.selectedSplit === null || player.extent === null) return
  context.fillStyle = style.getPropertyValue('--color-ink')
  const edges = [
    { seconds: player.extent.startSeconds, inward: 1 },
    { seconds: player.extent.endSeconds, inward: -1 },
  ] as const
  for (const { seconds, inward } of edges) {
    const x = zoomTimeToX(seconds, centre, ZOOM_WINDOW_SECONDS, width)
    if (x < 0 || x > width) continue
    for (const rect of auditionEdgeRects(x, inward, height)) {
      context.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
  }
}

function draw() {
  const peaks = sourceFile.peaks
  const prepared = peaks && canvas.value ? prepareCanvas(canvas.value) : null
  if (!peaks || !prepared) return
  const { context, width, height } = prepared

  const style = getComputedStyle(document.documentElement)
  const centre = split.zoomCentreSeconds
  const { waveHeight, stripTop, stripHeight } = zoomLayout(height)
  const middle = waveHeight / 2
  // A sample of ±1 reaches the frame and the line between the two.
  const halfHeight = middle - FRAME_WIDTH

  const bars = zoomBars(peaks, centre, ZOOM_WINDOW_SECONDS, width, BAR_PITCH)
  drawPeakBars(context, bars, style.getPropertyValue('--color-wave'), middle, halfHeight)

  // Lands cover the bars; a gap is near-silence, not nothing, so a flat line runs through it.
  const landColor = style.getPropertyValue('--color-land')
  const lands = landSpansInWindow(split.gaps, centre, ZOOM_WINDOW_SECONDS, width)
  for (const { left, right } of lands) {
    context.fillStyle = landColor
    context.fillRect(left, 0, right - left, waveHeight)
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

  // After the ground, which shows through the strip outside the file, so its labels stay on top.
  drawSpectrogramStrip(context, {
    spectrogram: sourceFile.spectrogram,
    columnSeconds: sourceFile.loudnessWindowSeconds,
    startSeconds: windowStart.value,
    endSeconds: windowEnd.value,
    top: stripTop,
    width,
    height: stripHeight,
    style,
  })

  drawAuditionEdges(context, style, centre, width, height)

  const lineXs = split.splits.map((point) =>
    zoomTimeToX(point.seconds, centre, ZOOM_WINDOW_SECONDS, width),
  )
  drawSplitLines(
    context,
    lineXs,
    style.getPropertyValue('--color-split'),
    0,
    height,
    split.selectedSplitIndex,
  )
  drawConfidenceMarks(context, style, split.splits, lineXs, 0, waveHeight)

  /*
  The playhead goes over the split lines, which it must stay readable against, and under the
  frame, so the frame stays the outermost line of the canvas.
  */
  const playhead = player.playheadSeconds()
  if (playhead !== null) {
    const x = zoomTimeToX(playhead, centre, ZOOM_WINDOW_SECONDS, width)
    if (x >= 0 && x <= width)
      drawPlayhead(context, x, style.getPropertyValue('--color-ink'), height)
  }

  drawFrame(context, width, height, style.getPropertyValue('--color-ink'))
}

// The slider's value, and the redraws that keep the playhead moving while the audition plays.
const sliderSeconds = usePlayheadSlider(draw)

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    sourceFile.spectrogram,
    split.gaps,
    split.splits.map((point) => point.seconds),
    // Checking a split takes its mark away and changes nothing else.
    split.splits.map((point) => point.confidence?.band),
    split.selectedSplit?.id,
    split.zoomCentreSeconds,
    // The resting place moves while paused, when nothing else here changes.
    player.playheadSeconds(),
  ],
  draw,
)
</script>

<template>
  <div
    ref="frame"
    class="relative h-80 select-none"
    :class="{ 'cursor-ew-resize': overLine || dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onFramePointerMove"
    @pointerleave="hideReadout"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @lostpointercapture="onPointerEnd"
  >
    <!-- A slider must take the focus for a screen reader, but it is no tab stop: the keys reach the view
    wherever the focus is. -->
    <div
      :role="player.extent === null ? undefined : 'slider'"
      :tabindex="player.extent === null ? undefined : -1"
      aria-label="Playhead in the audition"
      :aria-valuemin="player.extent?.startSeconds"
      :aria-valuemax="player.extent?.endSeconds"
      :aria-valuenow="player.extent === null ? undefined : sliderSeconds"
      :aria-valuetext="player.extent === null ? undefined : formatHundredths(sliderSeconds)"
      class="size-full"
    >
      <canvas
        ref="canvas"
        class="block size-full"
        aria-label="Zoomed waveform and spectrogram of the split"
      />
    </div>
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
    />
    <PlayerFailure />
    <SpectrogramReadout :readout="readout" />
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
