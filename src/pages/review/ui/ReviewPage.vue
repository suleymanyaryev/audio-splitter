<script setup lang="ts">
import { computed, onUnmounted, useTemplateRef } from 'vue'
import { Download, Play, Plus } from 'lucide-vue-next'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'
import LoudnessCurve from '@/widgets/loudness-curve/ui/LoudnessCurve.vue'
import LoudnessSettings from '@/widgets/loudness-curve/ui/LoudnessSettings.vue'
import SourceWaveform from '@/widgets/source-waveform/ui/SourceWaveform.vue'
import { zoomTitle } from '@/widgets/split-zoom/lib/zoom-title.ts'
import SplitZoom from '@/widgets/split-zoom/ui/SplitZoom.vue'
import TrackList from '@/widgets/track-list/ui/TrackList.vue'
import TrackStrip from '@/widgets/track-strip/ui/TrackStrip.vue'

/*
The review screen: each panel at its fixed canvas height, with the controls it holds. Every panel
is filled; the buttons that need later milestones (playing across a split, export) stay disabled
until then.

The page mounts only once the source file is ready (src/app/App.vue), which is when the split store
looks for the gaps in its loudness curve, once; the split store cannot import the source-file store.
*/
const sourceFile = useSourceFileStore()
const split = useSplitStore()

const { loudness, loudnessWindowSeconds, durationSeconds } = sourceFile
if (loudness && loudnessWindowSeconds !== null && durationSeconds !== null) {
  split.detect(loudness, { windowSeconds: loudnessWindowSeconds, durationSeconds })
}
onUnmounted(() => {
  split.reset()
})

// A new split is selected and its handle takes the keyboard, ready for the arrow keys.
const zoom = useTemplateRef('zoom')
function addSplit() {
  split.addSplit()
  void zoom.value?.focusHandle()
}

// The zoom view's title is the selected split's time, the panel's largest type.
const title = computed(() => zoomTitle(split.selectedSplit?.seconds ?? null, split.splits.length))
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
        <UiButton size="sm" :disabled="!split.canAddSplit" @click="addSplit">
          <Plus class="size-4 shrink-0" />
          Add split
        </UiButton>
        <UiButton variant="primary" size="sm" disabled>
          <Play class="size-4 shrink-0" fill="currentColor" :stroke-width="0" />
          Play across split
        </UiButton>
      </template>
      <SplitZoom ref="zoom" />
    </UiPanel>

    <UiPanel title="Track list" class="col-span-4">
      <TrackList />
    </UiPanel>

    <UiPanel :title="`Tracks (${split.tracks.length})`" class="col-span-12">
      <template #actions>
        <UiButton variant="primary" size="lg" disabled>
          <Download class="size-4 shrink-0" />
          Export to folder…
        </UiButton>
      </template>
      <TrackStrip />
    </UiPanel>
  </main>
</template>
