<script setup lang="ts">
import { computed, onUnmounted, useTemplateRef, watch } from 'vue'
import { Download, Play, Plus, Square } from 'lucide-vue-next'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore, type PanelView } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'
import UiSegmentedControl from '@/shared/ui/UiSegmentedControl.vue'
import LoudnessCurve from '@/widgets/loudness-curve/ui/LoudnessCurve.vue'
import LoudnessSettings from '@/widgets/loudness-curve/ui/LoudnessSettings.vue'
import SourceWaveform from '@/widgets/source-waveform/ui/SourceWaveform.vue'
import { rangeTitle } from '@/widgets/split-zoom/lib/range-title.ts'
import { zoomTitle } from '@/widgets/split-zoom/lib/zoom-title.ts'
import { useAuditionStore } from '@/widgets/split-zoom/model/audition.ts'
import RangeView from '@/widgets/split-zoom/ui/RangeView.vue'
import SplitZoom from '@/widgets/split-zoom/ui/SplitZoom.vue'
import TrackList from '@/widgets/track-list/ui/TrackList.vue'
import { useExportTracksStore } from '@/widgets/track-strip/model/export-tracks.ts'
import ExportDialog from '@/widgets/track-strip/ui/ExportDialog.vue'
import TrackStrip from '@/widgets/track-strip/ui/TrackStrip.vue'

/*
The review screen: each panel at its fixed canvas height, with the controls it holds. Every panel
is filled; "Play across split" plays the selected split's clip (and reads "Stop" while it loads or
plays), and "Export to folder…" starts the export, whose overlay (`ExportDialog`) locks the page
while it runs. The zoom panel shows the zoom view or, once the user has dragged out a range, the
Range view, as the split store's `view` says; its `Split | Range` control is that view, and the
buttons for the zoom view are only there while the zoom view is.

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

// A new split is selected and its handle takes the keyboard, ready for the arrow keys.
const zoom = useTemplateRef('zoom')
function addSplit() {
  split.addSplit()
  void zoom.value?.focusHandle()
}

// The panel's title is its largest type: the selected split's time, or the range's start, end
// and length.
const title = computed(() =>
  split.view === 'range' && split.range !== null
    ? rangeTitle(split.range)
    : zoomTitle(split.selectedSplit?.seconds ?? null, split.splits.length),
)

const view = computed<PanelView>({
  get: () => split.view,
  set: (next) => {
    split.showView(next)
  },
})
const viewOptions = computed(() => [
  { value: 'split' as const, label: 'Split' },
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
          v-if="split.view === 'split'"
          size="sm"
          :disabled="!split.canAddSplit"
          @click="addSplit"
        >
          <Plus class="size-4 shrink-0" />
          Add split
        </UiButton>
        <UiButton
          v-if="split.view === 'split'"
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
