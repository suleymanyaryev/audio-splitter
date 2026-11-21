<script setup lang="ts">
import { computed, ref } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'

const {
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  compact = false,
} = defineProps<{
  // The setting's name: shown on the left and read out for the thumb.
  label: string
  // The value as the user reads it ("1.0 s", "−35 dB"); the caller formats it.
  readout: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  // For a title row: no visible name or readout (the thumb still has both, for a screen reader), and
  // no minimum width: the caller sets one.
  compact?: boolean
}>()

const model = defineModel<number>({ required: true })

// Reka keeps one value per thumb in an array; this slider has a single thumb.
const thumbValues = computed({
  get: () => [model.value],
  set: ([value]) => {
    if (value !== undefined) model.value = value
  },
})

/*
Reka focuses the thumb when a pointer drag starts and again on every move, and a focused thumb keeps
the arrow keys, so the next key would nudge the setting instead of reaching the view on show. The
thumb lets go of each of those focuses at once. Letting go only when the drag ends is too late: a
dialog opened by the drag (the replace-your-edits question) remembers the thumb and gives it the
focus back when it closes. A thumb reached with Tab is not touched: no pointer drag is going on.
*/
const isPointerDrag = ref(false)

function startPointerDrag() {
  isPointerDrag.value = true
}

function endPointerDrag() {
  isPointerDrag.value = false
}

function letGoOfThumb(event: FocusEvent) {
  if (isPointerDrag.value && event.target instanceof HTMLElement) event.target.blur()
}
</script>

<template>
  <div class="flex items-center gap-3">
    <span v-if="!compact" class="whitespace-nowrap text-muted">{{ label }}</span>
    <SliderRoot
      v-model="thumbValues"
      :min
      :max
      :step
      :disabled
      class="relative flex h-5 flex-1 items-center data-disabled:opacity-40"
      :class="{ 'min-w-32': !compact }"
      @pointerdown.capture="startPointerDrag"
      @pointerup.capture="endPointerDrag"
      @pointercancel.capture="endPointerDrag"
    >
      <SliderTrack class="relative h-1 w-full rounded-full bg-hairline">
        <SliderRange class="absolute h-1 rounded-full bg-ink" />
      </SliderTrack>
      <SliderThumb
        :aria-label="label"
        :aria-valuetext="readout"
        class="block size-4 cursor-grab rounded-full border-2 border-surface bg-ink not-data-disabled:hover:size-5 focus-visible:focus-ring not-data-disabled:active:cursor-grabbing data-disabled:cursor-not-allowed"
        @focus="letGoOfThumb"
      />
    </SliderRoot>
    <span v-if="!compact" class="w-18 text-right font-semibold whitespace-nowrap text-ink">{{
      readout
    }}</span>
  </div>
</template>
