<script setup lang="ts">
import { computed } from 'vue'

import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiProgressBar from '@/shared/ui/UiProgressBar.vue'
import { exportSummary } from '../lib/export-summary.ts'
import { useExportTracksStore } from '../model/export-tracks.ts'

/*
The overlay that locks the review screen while an export runs (ticket 08): "Track 3 of 8" on a
bar, and Cancel. Escape and a click outside cannot close it while it runs; when the export is over
it holds the summary and "Close". It shows itself from the export store's status.
*/
const exporter = useExportTracksStore()

const open = computed({
  get: () => exporter.status !== 'idle',
  // Escape closes a summary like "Close" does, and means nothing while the export runs.
  set(wanted) {
    if (!wanted) exporter.dismiss()
  },
})

const title = computed(() => {
  switch (exporter.status) {
    case 'done': {
      return 'Export finished'
    }
    case 'cancelled': {
      return 'Export cancelled'
    }
    case 'failed': {
      return 'Export failed'
    }
    default: {
      return 'Exporting tracks'
    }
  }
})

const description = computed(() => {
  const { status } = exporter
  if (status === 'idle' || status === 'running') {
    // The dialog opens with the run, a moment before the subfolder has its name.
    return exporter.folderName === null ? '' : `Saving to ${exporter.folderName}/`
  }
  return exportSummary({
    status,
    savedCount: exporter.savedCount,
    trackCount: exporter.trackCount,
    folderName: exporter.folderName,
    failure: exporter.failure,
  })
})
</script>

<template>
  <UiDialog v-model:open="open" :title :description>
    <template v-if="exporter.isRunning" #default>
      <UiProgressBar
        :value="exporter.savedCount"
        :max="exporter.trackCount"
        :label="`Track ${exporter.trackNumber} of ${exporter.trackCount}`"
        running
      />
    </template>
    <template #actions>
      <UiButton v-if="exporter.isRunning" @click="exporter.cancel()">Cancel</UiButton>
      <UiButton v-else variant="primary" @click="exporter.dismiss()">Close</UiButton>
    </template>
  </UiDialog>
</template>
