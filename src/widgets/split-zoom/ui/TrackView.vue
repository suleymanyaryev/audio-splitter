<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { hitTestSplit } from '@/shared/lib/canvas/hit-test-split.ts'
import { drawConfidenceMarks } from '@/shared/lib/canvas/draw-confidence-marks.ts'
import { drawLands, drawSplitLines } from '@/shared/lib/canvas/draw-lands-and-splits.ts'
import { drawMark } from '@/shared/lib/canvas/draw-mark.ts'
import { drawPendingSplits } from '@/shared/lib/canvas/draw-pending-splits.ts'
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
import { roundToMillisecond } from '@/shared/lib/time/round-to-millisecond.ts'
import { pointerX } from '../lib/pointer-x.ts'
import { stepOfKey } from '../lib/step-of-key.ts'
import { stretchAxis } from '../lib/stretch-axis.ts'
import { usePlayheadDrag } from '../lib/use-playhead-drag.ts'
import { usePlayheadSlider } from '../lib/use-playhead-slider.ts'
import { zoomBars } from '../lib/zoom-bars.ts'
import { landSpansInWindow } from '../lib/zoom-spans.ts'
import { usePlayerStore } from '../model/player.ts'
import PlayerFailure from './PlayerFailure.vue'

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
Split view (`onPointerDown` and `onDoubleClick` have the order, and `lib/use-playhead-drag.ts` the drag).

The pending splits (GLOSSARY.md) of the track are drawn over the split lines in a look nothing else
has (`shared/lib/canvas/draw-pending-splits.ts`), the selected one heavier. The view is a slider on
the playhead and takes the page's keys, wherever the focus is: Left and Right move it 1 s, with
Shift 10 s, Space plays or pauses the track, as the panel's button does, and Home takes the playhead
back to the track's start. Enter adds a pending split at the mark and selects it; Shift+Enter adds
one where the playhead is, without selecting it, so a tap along a playing track is always taken.
Delete and Backspace delete the selected pending split and Escape deselects it; with none selected
those keys are left alone, since removing a track deletes splits and has its own button. `[` and `]`
select the previous and next track, as a click on its row does; a track that is playing or being
decoded plays the new one from its start, and a paused or stopped one leaves it resting there. `X`
leaves the selected track out of the export, or brings it back. `C` swaps to the same moment in the
track the selected one matches (`split.swapTrack`), playing on if it was playing, and back again
from there. A held Space, Enter, Shift+Enter, `[`, `]`, `X` or `C` is ignored, so it does not start
and stop the sound, add pending splits or step over and over. A failure to play is said in a line at
the bottom of the view.

The player plays the whole track, however long: a track over 10 min is heard through a window that
moves along it (`model/player.ts`), which this view does not see.
*/

// Left and Right move the playhead 1 s, with Shift 10 s.
const STEP_SECONDS = 1
const SHIFT_STEP_SECONDS = 10

const sourceFile = useSourceFileStore()
const split = useSplitStore()
const player = usePlayerStore()
const canvas = useTemplateRef('canvas')
const frame = useTemplateRef('frame')

// The track's start for a new track, then where it is heard or resumes; 0 with no track selected.
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
  const lineXs = split.splits.map((point) => axis.toX(point.seconds))
  drawSplitLines(context, lineXs, style.getPropertyValue('--color-split'), 0, height)
  drawConfidenceMarks(context, style, split.splits, lineXs, 0, height)

  // Pending splits go over the split lines and under the mark, which can sit on one.
  drawPendingSplits(
    context,
    split.pendingSplits.map((seconds) => axis.toX(seconds)),
    style.getPropertyValue('--color-ink'),
    height,
    split.selectedPendingSplit === null
      ? null
      : split.pendingSplits.indexOf(split.selectedPendingSplit),
  )

  // The mark is a dashed line under the playhead, which must stay readable against it.
  if (split.trackMarkSeconds !== null) {
    const markX = axis.toX(split.trackMarkSeconds)
    drawMark(context, markX, style.getPropertyValue('--color-ink'), height)
  }

  // The playhead goes over the split lines and the mark, and under the frame, the outermost line.
  drawPlayhead(context, axis.toX(playheadSeconds()), style.getPropertyValue('--color-ink'), height)
  drawFrame(context, width, height, style.getPropertyValue('--color-ink'))
}

function frameWidth() {
  return frame.value?.getBoundingClientRect().width ?? 0
}

const { overPlayhead, dragging, tryGrab, onPointerMove, onPointerEnd } = usePlayheadDrag(() =>
  stretchAxis(player.extent, frameWidth()),
)

/*
A press on the playhead drags it; one within 6 px of a pending split selects it; any other lets go
of the selected pending split and places the track's mark, even next to an end split's line.
*/
function onPointerDown(event: PointerEvent) {
  // Only the primary button: a right-click opens the browser's menu, not a mark.
  if (event.button !== 0) return
  if (tryGrab(event)) return
  const axis = stretchAxis(player.extent, frameWidth())
  if (axis === null) return
  const x = pointerX(event)
  const pending = hitTestSplit(
    x,
    split.pendingSplits.map((seconds) => axis.toX(seconds)),
  )
  const selected = pending === null ? undefined : split.pendingSplits[pending]
  if (selected === undefined) {
    split.deselectPendingSplit()
    split.placeTrackMark(axis.toSeconds(x))
  } else {
    split.selectPendingSplit(selected)
  }
}

// A double-click on an end split's line selects that split, and anywhere else moves the playhead there.
function onDoubleClick(event: MouseEvent) {
  if (event.button !== 0) return
  const axis = stretchAxis(player.extent, frameWidth())
  if (axis === null) return
  const x = pointerX(event)
  const ends = split.selectedTrackEndSplits
  const line = hitTestSplit(
    x,
    ends.map((point) => axis.toX(point.seconds)),
  )
  if (line === null) {
    player.seek(axis.toSeconds(x))
    return
  }
  const selected = ends[line]
  if (selected !== undefined) split.selectSplit(selected.id)
}

function moveBy(direction: -1 | 1, isShifted: boolean) {
  const step = isShifted ? SHIFT_STEP_SECONDS : STEP_SECONDS
  player.seek(roundToMillisecond(playheadSeconds() + direction * step))
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
Whether the key stepped: at the first or last track, or over the discard question, it did not, and
then nothing starts; the question's answer steps later, from the dialog. The player carries a sound
that was on over to the new track.
*/
function isStepKeyActedOn(step: -1 | 1) {
  return player.carryOver(() => split.selectAdjacentTrack(step))
}

// Whether the key was the view's: a key it leaves alone is the browser's, and is not reported.
function isKeyActedOn(event: KeyboardEvent) {
  const step = stepOfKey(event)
  return step === null ? isOtherKeyActedOn(event) : isStepKeyActedOn(step)
}

/*
`X` leaves the selected track out of the export, or brings it back. Shift is a modifier like Ctrl, so
Shift+X is left alone, and a held key toggles once.
*/
function isLeftOutKeyActedOn(event: KeyboardEvent) {
  if (event.shiftKey) return false
  const track = split.selectedTrack
  if (track !== null && !event.repeat) split.toggleLeftOut(track.startSplit?.id ?? null)
  return true
}

/*
`C` swaps to the other track of a match: the store selects it, the playhead goes to the same moment
in it, and a track that was playing (or decoding) plays on from there. With no target the key is
left alone, as it is for a held key when there is no target. Shift is a modifier like Ctrl, so
Shift+C is left alone, and a held key swaps once.
*/
function isSwapKeyActedOn(event: KeyboardEvent) {
  if (player.extent === null || event.shiftKey) return false
  const playhead = playheadSeconds()
  // A held key is taken, so the page does not act on it, only when there is somewhere to swap to.
  if (event.repeat) return split.swapTarget(playhead) !== null
  return player.carryOver(() => {
    const target = split.swapTrack(playhead)
    // The player let go of the old track when the selection moved; the new one rests at the moment.
    if (target !== null) player.seek(target.seconds)
    return target !== null
  })
}

// The view's other keys: Space, Enter, Delete, Escape, Home, X, C and the arrows.
function isOtherKeyActedOn(event: KeyboardEvent) {
  switch (event.key) {
    case ' ': {
      // A held key must not start and stop the sound over and over.
      if (!event.repeat) player.toggle()
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
      player.backToStart()
      return true
    }
    case 'x':
    case 'X': {
      return isLeftOutKeyActedOn(event)
    }
    case 'c':
    case 'C': {
      return isSwapKeyActedOn(event)
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

// The slider's value, and the redraws that keep the playhead moving while the track plays.
const sliderSeconds = usePlayheadSlider(draw)

useCanvasRedraw(canvas, draw)

watch(
  () => [
    sourceFile.peaks,
    player.extent?.startSeconds,
    player.extent?.endSeconds,
    split.gaps,
    split.splits.map((point) => point.seconds),
    // Checking a split takes its mark away and changes nothing else.
    split.splits.map((point) => point.confidence?.band),
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
      <canvas ref="canvas" class="block size-full" aria-label="Waveform of the track" />
    </div>
    <PlayerFailure />
  </div>
</template>
