<script setup lang="ts">
import { computed, onUnmounted, useTemplateRef, watch } from 'vue'
import { Download, Pause, Play, Plus, SkipBack, Square } from 'lucide-vue-next'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore, type PanelView } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiIconButton from '@/shared/ui/UiIconButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'
import UiSegmentedControl from '@/shared/ui/UiSegmentedControl.vue'
import LoudnessCurve from '@/widgets/loudness-curve/ui/LoudnessCurve.vue'
import LoudnessSettings from '@/widgets/loudness-curve/ui/LoudnessSettings.vue'
import SourceWaveform from '@/widgets/source-waveform/ui/SourceWaveform.vue'
import { rangeTitle } from '@/widgets/split-zoom/lib/range-title.ts'
import { trackTitle } from '@/widgets/split-zoom/lib/track-title.ts'
import { zoomTitle } from '@/widgets/split-zoom/lib/zoom-title.ts'
import { useAuditionStore } from '@/widgets/split-zoom/model/audition.ts'
import RangeView from '@/widgets/split-zoom/ui/RangeView.vue'
import SplitZoom from '@/widgets/split-zoom/ui/SplitZoom.vue'
import TrackView from '@/widgets/split-zoom/ui/TrackView.vue'
import TrackList from '@/widgets/track-list/ui/TrackList.vue'
import { useExportTracksStore } from '@/widgets/track-strip/model/export-tracks.ts'
import ExportDialog from '@/widgets/track-strip/ui/ExportDialog.vue'
import TrackStrip from '@/widgets/track-strip/ui/TrackStrip.vue'

/*
The review screen: each panel at its fixed canvas height, with the controls it holds. Every panel
is filled; "Export to folder…" starts the export, whose overlay (`ExportDialog`) locks the page while
it runs. The zoom panel shows the zoom view, the Track view of the selected track or, once the user
has dragged out a range, the Range view, as the split store's `view` says, and its
`Split | Track | Range` control is that view, each segment disabled while it has nothing to show.
"Add split" is in the zoom view and the Range view and follows the view: at the window's centre in
the zoom view, at the mark in the Range view. The Track view has the control alone: no split is
added there. The zoom view has "Play across split", which plays the selected split's clip (and reads
"Stop" while it loads or plays). The Range view has "Play", which plays the range (and reads "Stop"
while it is decoded and "Pause" while it plays), and "Back to range start" beside it, which moves
the playhead to the range's start.

The page mounts only once the source file is ready (src/app/App.vue), which is when the split store
looks for the gaps in its loudness curve, once; the split store cannot import the source-file store.
*/
const sourceFile = useSourceFileStore()
const split = useSplitStore()
const audition = useAuditionStore()
const exporter = useExportTracksStore()

const { loudness, loudnessWindowSeconds, durationSeconds } = sourceFile
if (loudness && loudnessWindowSeconds !== null && durationSeconds !== null) {
  split.detect(loudness, { windowSeconds: loudnessWindowSeconds, durationSeconds })
}
onUnmounted(() => {
  // First, so that no clip is left playing over a page that has no split to show.
  audition.stop()
  split.reset()
})

// A clip must not play over the export, which locks the page.
function exportTracks() {
  audition.stop()
  void exporter.start()
}

/*
In the zoom view a new split is selected and its handle takes the keyboard, ready for the arrow
keys. In the Range view it goes at the mark and nothing else changes: the user stays where they are.
*/
const zoom = useTemplateRef('zoom')
function addSplit() {
  if (split.view === 'range') {
    split.addSplitAtMark()
    return
  }
  split.addSplit()
  void zoom.value?.focusHandle()
}

const canAddSplit = computed(() =>
  split.view === 'range' ? split.canAddSplitAtMark : split.canAddSplit,
)

// The panel's title is its largest type: the selected split's time, the selected track's name, start
// and end, or the range's start, end and length.
const title = computed(() => {
  if (split.view === 'track' && split.selectedTrack !== null) return trackTitle(split.selectedTrack)
  const range = split.view === 'range' ? split.range : null
  return range === null
    ? zoomTitle(split.selectedSplit?.seconds ?? null, split.splits.length)
    : rangeTitle(range)
})

// "Stop" while the range is being decoded, so a press can take it back; "Pause" while it plays.
const RANGE_BUTTON_LABELS = { idle: 'Play', loading: 'Stop', playing: 'Pause', paused: 'Play' }
const rangeButtonLabel = computed(() => RANGE_BUTTON_LABELS[audition.stretchStatus])

// The Range view's two buttons play the range as the stretch; with no range there is nothing to play.
function backToRangeStart() {
  if (split.range !== null) audition.backToStretchStart(split.range)
}

function toggleRange() {
  if (split.range !== null) audition.toggleStretch(split.range)
}

const view = computed<PanelView>({
  get: () => split.view,
  set: (next) => {
    split.showView(next)
  },
})
const viewOptions = computed(() => [
  { value: 'split' as const, label: 'Split' },
  { value: 'track' as const, label: 'Track', disabled: split.selectedTrack === null },
  { value: 'range' as const, label: 'Range', disabled: split.range === null },
])

// Sound belongs to the view it was started in: the audition must not play on under the Range view.
watch(
  () => split.view,
  () => {
    audition.stop()
  },
)
</script>

<template>
  <main class="grid grid-cols-12 gap-4 p-4">
    <UiPanel title="Whole file" class="col-span-12">
      <SourceWaveform />
    </UiPanel>

    <UiPanel title="Loudness" class="col-span-12">
      <template #actions>
        <LoudnessSettings />
      </template>
      <LoudnessCurve />
    </UiPanel>

    <UiPanel :title="title" headline class="col-span-8">
      <template #actions>
        <UiSegmentedControl v-model="view" label="Panel view" :options="viewOptions" />
        <UiButton
          v-if="split.view !== 'track'"
          size="sm"
          :disabled="!canAddSplit"
          @click="addSplit"
        >
          <Plus class="size-4 shrink-0" />
          Add split
        </UiButton>
        <UiIconButton
          v-if="split.view === 'range'"
          size="sm"
          label="Back to range start"
          @click="backToRangeStart"
        >
          <SkipBack class="size-4 shrink-0" />
        </UiIconButton>
        <UiButton v-if="split.view === 'range'" variant="primary" size="sm" @click="toggleRange">
          <Square
            v-if="audition.stretchStatus === 'loading'"
            class="size-4 shrink-0"
            fill="currentColor"
            :stroke-width="0"
          />
          <Pause
            v-else-if="audition.stretchStatus === 'playing'"
            class="size-4 shrink-0"
            fill="currentColor"
            :stroke-width="0"
          />
          <Play v-else class="size-4 shrink-0" fill="currentColor" :stroke-width="0" />
          {{ rangeButtonLabel }}
        </UiButton>
        <UiButton
          v-else-if="split.view === 'split'"
          variant="primary"
          size="sm"
          :disabled="split.selectedSplit === null && !audition.isActive"
          @click="audition.toggle()"
        >
          <Square
            v-if="audition.isActive"
            class="size-4 shrink-0"
            fill="currentColor"
            :stroke-width="0"
          />
          <Play v-else class="size-4 shrink-0" fill="currentColor" :stroke-width="0" />
          {{ audition.isActive ? 'Stop' : 'Play across split' }}
        </UiButton>
      </template>
      <RangeView v-if="split.view === 'range'" />
      <TrackView v-else-if="split.view === 'track'" />
      <SplitZoom v-else ref="zoom" />
    </UiPanel>

    <UiPanel title="Track list" class="col-span-4">
      <TrackList />
    </UiPanel>

    <UiPanel :title="`Tracks (${split.tracks.length})`" class="col-span-12">
      <template #actions>
        <UiButton
          variant="primary"
          size="lg"
          :disabled="sourceFile.status !== 'ready' || exporter.isRunning"
          @click="exportTracks"
        >
          <Download class="size-4 shrink-0" />
          Export to folder…
        </UiButton>
      </template>
      <TrackStrip />
    </UiPanel>

    <ExportDialog />
  </main>
</template>
