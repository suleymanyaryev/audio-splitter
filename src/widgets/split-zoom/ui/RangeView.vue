<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { hitTestSplit } from '@/shared/lib/canvas/hit-test-split.ts'
import { drawConfidenceMarks } from '@/shared/lib/canvas/draw-confidence-marks.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { drawMark } from '@/shared/lib/canvas/draw-mark.ts'
import { BAR_PITCH, drawPeakBars } from '@/shared/lib/canvas/draw-peak-bars.ts'
import {
  drawFrame,
  drawPlayhead,
  FRAME_WIDTH,
} from '@/shared/lib/canvas/draw-playhead-and-frame.ts'
import { prepareCanvas } from '@/shared/lib/canvas/prepare-canvas.ts'
import { useCanvasRedraw } from '@/shared/lib/canvas/use-canvas-redraw.ts'
import { usePageKeys } from '@/shared/lib/keyboard/use-page-keys.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'
import { createSpectrogramStrip } from '../lib/draw-spectrogram-strip.ts'
import { pointerX } from '../lib/pointer-x.ts'
import { stretchAxis } from '../lib/stretch-axis.ts'
import { usePlayheadDrag } from '../lib/use-playhead-drag.ts'
import { usePlayheadSlider } from '../lib/use-playhead-slider.ts'
import { useStretchKeys } from '../lib/use-stretch-keys.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow } from '../lib/zoom-spans.ts'
import { usePlayerStore } from '../model/player.ts'
import PlayerFailure from './PlayerFailure.vue'

/*
The Range view (GLOSSARY.md): the range the user dragged out, stretched across the canvas
whatever its length, in the zoom view's place and at its height, so the page does not jump when the
panel switches. The bars are the peaks the whole-file view already holds, merged over the range's
buckets, so nothing is decoded; the lands and the split lines that fall inside the range are drawn
on the same axis. Under the waveform, as tall as it, is the spectrogram strip, each pixel keeping
each band's loudest value over its time (`lib/draw-spectrogram-strip.ts`); the split lines, the
mark and the playhead cross it, and the lands stay on the waveform. The panel's `Split | Range` control only offers this view while there is a range.

A 1 px ink playhead is drawn at all times: at the range's start for a new range, then where the
range is heard or where it resumes. While the range plays it is drawn on every animation frame. The
playhead can be dragged along the range, and any other single press places the mark, a 1 px dashed
line, even next to a split's line: a double-click moves the playhead there, or, within 6 px of a
split's line, selects that split and opens the Split view (`onPointerDown` and `onDoubleClick` have
the order, and `lib/use-playhead-drag.ts` the drag, with the playhead's pause and resume). The view
is a slider on the playhead and takes the page's keys, wherever the focus is: Left and Right move
the playhead 1 s, with Shift 10 s, as in the Track view (`lib/use-stretch-keys.ts` has them, with
Space and Home), and the mark has no keys. Enter adds a split at the mark and Shift+Enter one where
the playhead is, so a split can be put where it is heard while the range plays, and neither stops
the sound or leaves the view. Space plays or pauses the range, as the panel's button does, and Home
takes the playhead back to the range's start. A held Space, Enter or Shift+Enter is ignored, so it
does not start and stop the sound or add splits over and over. A failure to play is said in a line at the bottom of the view.
*/

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const player = usePlayerStore()
const { isStretchKeyActedOn } = useStretchKeys()
const canvas = useTemplateRef('canvas')
const drawSpectrogramStrip = createSpectrogramStrip()
const frame = useTemplateRef('frame')

// The range's start for a new range, then where it is heard or resumes; 0 with no range.
function playheadSeconds() {
  return player.playheadSeconds() ?? 0
}

function draw() {
  const peaks = sourceFile.peaks
  const extent = player.extent
  const prepared = peaks && extent && canvas.value ? prepareCanvas(canvas.value) : null
  if (!peaks || !extent || !prepared) return
  const { context, width, height } = prepared

  const style = getComputedStyle(document.documentElement)
  const axis = stretchAxis(extent, width)
  const { centreSeconds, windowSeconds } = axis
  // The waveform takes the top half, the spectrogram strip the bottom half.
  const waveHeight = height / 2
  const middle = waveHeight / 2
  // A sample of ±1 reaches the frame and the line between the two.
  const halfHeight = middle - FRAME_WIDTH

  const bars = zoomBars(peaks, centreSeconds, windowSeconds, width, BAR_PITCH)
  drawPeakBars(context, bars, style.getPropertyValue('--color-wave'), middle, halfHeight)

  // Lands cover the bars, at their true width: only a whole-file view widens a land.
  drawLands(
    context,
    landSpansInWindow(split.gaps, centreSeconds, windowSeconds, width),
    style.getPropertyValue('--color-land'),
    0,
    waveHeight,
  )

  // Under the waveform, on the same axis; the split lines and everything after cross it.
  drawSpectrogramStrip(context, {
    spectrogram: sourceFile.spectrogram,
    columnSeconds: sourceFile.loudnessWindowSeconds,
    startSeconds: centreSeconds - windowSeconds / 2,
    endSeconds: centreSeconds + windowSeconds / 2,
    top: waveHeight,
    width,
    height: height - waveHeight,
    style,
  })

  // A split on the range's edge is drawn on it; one outside is off the canvas.
  const lineXs = split.splits.map((point) => axis.toX(point.seconds))
  drawSplitLines(
    context,
    lineXs,
    style.getPropertyValue('--color-split'),
    0,
    height,
    split.selectedSplitIndex,
  )
  drawConfidenceMarks(context, style, split.splits, lineXs, 0, waveHeight)

  // The mark is a dashed line, never mistaken for a split line or the playhead, under the latter.
  if (split.markSeconds !== null) {
    drawMark(context, axis.toX(split.markSeconds), style.getPropertyValue('--color-ink'), height)
  }

  /*
  The playhead goes over the split lines and the mark, which it must stay readable against, and
  under the frame, so the frame stays the outermost line of the canvas.
  */
  drawPlayhead(context, axis.toX(playheadSeconds()), style.getPropertyValue('--color-ink'), height)
  drawFrame(context, width, height, style.getPropertyValue('--color-ink'))
}

function frameWidth() {
  return frame.value?.getBoundingClientRect().width ?? 0
}

const { overPlayhead, dragging, tryGrab, onPointerMove, onPointerEnd } = usePlayheadDrag(() =>
  stretchAxis(player.extent, frameWidth()),
)

// A press on the playhead drags it; any other places the mark, even next to a split's line.
function onPointerDown(event: PointerEvent) {
  // Only the primary button: a right-click opens the browser's menu, not a mark.
  if (event.button !== 0) return
  if (tryGrab(event)) return
  const axis = stretchAxis(player.extent, frameWidth())
  if (axis !== null) split.placeMark(axis.toSeconds(pointerX(event)))
}

// A double-click on a split's line selects that split, and anywhere else moves the playhead there.
function onDoubleClick(event: MouseEvent) {
  if (event.button !== 0) return
  const axis = stretchAxis(player.extent, frameWidth())
  if (axis === null) return
  const x = pointerX(event)
  const line = hitTestSplit(
    x,
    split.splits.map((point) => axis.toX(point.seconds)),
  )
  if (line === null) {
    player.seek(axis.toSeconds(x))
    return
  }
  const selected = split.splits[line]
  if (selected !== undefined) split.selectSplit(selected.id)
}

/*
Enter adds a split at the mark, and Shift+Enter one where the playhead is, so a split goes where the
sound is heard. Enter is taken exactly while the "Add split" button is enabled: with no mark, or no
room at it, it is left alone. Shift+Enter always has the playhead. A held key adds one split, not
one per repeat.
*/
function addSplitFromKey(event: KeyboardEvent) {
  if (!event.shiftKey && !split.canAddSplitAtMark) return false
  if (event.repeat) return true
  if (event.shiftKey) split.addSplitAt(playheadSeconds())
  else split.addSplitAtMark()
  return true
}

// Whether the key was the view's: a key it leaves alone is the browser's, and is not reported.
function isKeyActedOn(event: KeyboardEvent) {
  return isStretchKeyActedOn(event) || (event.key === 'Enter' && addSplitFromKey(event))
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

// The slider's value, and the redraws that keep the playhead moving while the range plays.
const sliderSeconds = usePlayheadSlider(draw)

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    sourceFile.spectrogram,
    player.extent?.startSeconds,
    player.extent?.endSeconds,
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
  <div class="relative h-80">
    <!-- A slider must take the focus for a screen reader, but it is no tab stop: the keys reach the view
    wherever the focus is. -->
    <div
      ref="frame"
      role="slider"
      tabindex="-1"
      aria-label="Playhead in the range"
      :aria-valuemin="player.extent?.startSeconds"
      :aria-valuemax="player.extent?.endSeconds"
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
      <canvas
        ref="canvas"
        class="block size-full"
        aria-label="Waveform and spectrogram of the range"
      />
    </div>
    <PlayerFailure />
  </div>
</template>
