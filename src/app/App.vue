<script setup lang="ts">
import { computed } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import LoadPage from '@/pages/load/ui/LoadPage.vue'
import ReviewPage from '@/pages/review/ui/ReviewPage.vue'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import UiButton from '@/shared/ui/UiButton.vue'

// No router: the page follows whether a file is loaded (docs/adr/0001-fsd-subset.md).
const sourceFile = useSourceFileStore()

// The file chip: the name while loading, then its duration once the probe has read it.
const chip = computed(() => {
  if (sourceFile.status !== 'loading' && sourceFile.status !== 'ready') return null
  const name = sourceFile.file?.name ?? ''
  const duration = sourceFile.durationSeconds
  return duration === null ? name : `${name} · ${formatDuration(duration)}`
})
</script>

<template>
  <!-- The band's tokens have no dark values, so it stays vinyl black in both themes. -->
  <header
    class="flex h-12 items-center gap-4 border-b border-vinyl-edge bg-vinyl px-4 text-on-vinyl"
  >
    <!-- The centre-label mark: a vermilion disc with a spindle hole. -->
    <span aria-hidden="true" class="grid size-5 shrink-0 place-items-center rounded-full bg-split">
      <span class="size-1.5 rounded-full bg-vinyl" />
    </span>
    <span class="text-lg font-bold">Audio Splitter</span>
    <span
      v-if="chip"
      class="min-w-0 truncate rounded-control border border-vinyl-edge px-2.5 py-1 text-xs font-semibold"
    >
      {{ chip }}
    </span>
    <span class="ml-auto shrink-0 text-xs text-on-vinyl-muted"
      >Local only · nothing is uploaded</span
    >
    <UiButton v-if="sourceFile.status === 'ready'" variant="inverse" @click="sourceFile.reset()">
      New file
    </UiButton>
  </header>

  <ReviewPage v-if="sourceFile.status === 'ready'" />
  <LoadPage v-else />
</template>
