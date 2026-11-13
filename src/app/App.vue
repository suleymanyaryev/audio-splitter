<script setup lang="ts">
import { shallowRef } from 'vue'

import LoadPage from '@/pages/load/ui/LoadPage.vue'
import ReviewPage from '@/pages/review/ui/ReviewPage.vue'
import UiButton from '@/shared/ui/UiButton.vue'

// No router: the page follows whether a file is loaded (docs/adr/0001-fsd-subset.md).
// Milestone 1 moves the file into the source-file store.
const sourceFile = shallowRef<File | null>(null)
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
      v-if="sourceFile"
      class="min-w-0 truncate rounded-control border border-vinyl-edge px-2.5 py-1 text-xs font-semibold"
    >
      {{ sourceFile.name }}
    </span>
    <span class="ml-auto shrink-0 text-xs text-on-vinyl-muted"
      >Local only · nothing is uploaded</span
    >
    <UiButton v-if="sourceFile" variant="inverse" @click="sourceFile = null">New file</UiButton>
  </header>

  <ReviewPage v-if="sourceFile" />
  <LoadPage v-else @choose="sourceFile = $event" />
</template>
