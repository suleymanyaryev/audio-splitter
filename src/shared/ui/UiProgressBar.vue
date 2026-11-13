<script setup lang="ts">
import { useId } from 'vue'
import { ProgressIndicator, ProgressRoot } from 'reka-ui'

const { running = false } = defineProps<{
  value: number
  max: number
  // Counts ffmpeg calls in words ("38 / 62 slices", "Track 3 of 8"); there is no percentage.
  label: string
  // A running count is set in ink; an idle or finished one in muted.
  running?: boolean
}>()

const labelId = useId()
</script>

<template>
  <div class="flex items-center gap-3">
    <ProgressRoot
      :model-value="value"
      :max
      :aria-labelledby="labelId"
      class="h-1.5 flex-1 overflow-hidden rounded-full bg-land"
    >
      <ProgressIndicator
        class="h-full rounded-full bg-ink"
        :style="{ width: `${max > 0 ? (value / max) * 100 : 0}%` }"
      />
    </ProgressRoot>
    <span :id="labelId" :class="running ? 'font-semibold text-ink' : 'text-muted'">
      {{ label }}
    </span>
  </div>
</template>
