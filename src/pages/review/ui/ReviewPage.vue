<script setup lang="ts">
import { Download, Play, Plus } from 'lucide-vue-next'

import UiButton from '@/shared/ui/UiButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'
import UiSlider from '@/shared/ui/UiSlider.vue'

/*
The empty review screen: each panel at its fixed canvas height, with the controls it will hold.
Nothing is analysed yet, so every control is disabled; later milestones swap each panel for its
widget.
*/
</script>

<template>
  <main class="grid grid-cols-12 gap-4 p-4">
    <UiPanel title="Whole file" class="col-span-12">
      <div class="h-24" />
    </UiPanel>

    <UiPanel title="Loudness" class="col-span-12">
      <template #actions>
        <div class="flex gap-6">
          <UiSlider :model-value="0" label="Silence threshold" readout="–" disabled class="w-72" />
          <UiSlider :model-value="0" label="Minimum gap length" readout="–" disabled class="w-72" />
        </div>
      </template>
      <div class="h-30" />
    </UiPanel>

    <UiPanel title="Split" class="col-span-8">
      <template #actions>
        <UiButton size="sm" disabled>
          <Plus class="size-4 shrink-0" />
          Add split
        </UiButton>
        <UiButton variant="primary" size="sm" disabled>
          <Play class="size-4 shrink-0" fill="currentColor" :stroke-width="0" />
          Play across split
        </UiButton>
      </template>
      <div class="h-40" />
    </UiPanel>

    <UiPanel title="Track list" class="col-span-4">
      <div class="h-40" />
    </UiPanel>

    <UiPanel title="Tracks" class="col-span-12">
      <template #actions>
        <UiButton variant="primary" size="lg" disabled>
          <Download class="size-4 shrink-0" />
          Export to folder…
        </UiButton>
      </template>
      <div class="h-14 rounded-control bg-land" />
    </UiPanel>
  </main>
</template>
