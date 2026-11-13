<script setup lang="ts">
import { computed } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'

const {
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
} = defineProps<{
  // The setting's name: shown on the left and read out for the thumb.
  label: string
  // The value as the user reads it ("1.0 s", "−35 dB"); the caller formats it.
  readout: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}>()

const model = defineModel<number>({ required: true })

// Reka keeps one value per thumb in an array; this slider has a single thumb.
const thumbValues = computed({
  get: () => [model.value],
  set: ([value]) => {
    if (value !== undefined) model.value = value
  },
})
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="whitespace-nowrap text-muted">{{ label }}</span>
    <SliderRoot
      v-model="thumbValues"
      :min
      :max
      :step
      :disabled
      class="relative flex h-5 min-w-32 flex-1 items-center data-disabled:opacity-40"
    >
      <SliderTrack class="relative h-1 w-full rounded-full bg-hairline">
        <SliderRange class="absolute h-1 rounded-full bg-ink" />
      </SliderTrack>
      <SliderThumb
        :aria-label="label"
        class="block size-4 cursor-grab rounded-full border-2 border-surface bg-ink not-data-disabled:hover:size-5 focus-visible:focus-ring data-disabled:cursor-not-allowed"
      />
    </SliderRoot>
    <span class="w-14 text-right font-semibold whitespace-nowrap text-ink">{{ readout }}</span>
  </div>
</template>
