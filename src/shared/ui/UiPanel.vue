<script setup lang="ts">
import { computed, useId } from 'vue'

/*
`headline` sets the title in Headline style: the panel's one big reading (the zoom view's title).
`display` makes it the one 32 px figure, for the split's time; both keep the row's height so
switching between them moves nothing.
*/
const { headline = false, display = false } = defineProps<{
  title: string
  headline?: boolean
  display?: boolean
}>()

const slots = defineSlots<{ default?: () => unknown; actions?: () => unknown }>()

const titleId = useId()

const titleClasses = computed(() => {
  if (display) return 'text-display font-semibold'
  return headline ? 'text-lg font-bold' : 'text-base font-semibold'
})
</script>

<template>
  <section :aria-labelledby="titleId" class="rounded-panel border border-hairline bg-surface p-4">
    <!-- Baseline alignment lines up a title with metadata text; a control has no useful
    baseline, so a row holding one is centred instead. -->
    <div
      class="mb-3 flex justify-between gap-6"
      :class="[
        slots.actions ? 'items-center' : 'items-baseline',
        headline || display ? 'min-h-9' : '',
      ]"
    >
      <h2 :id="titleId" :class="titleClasses">
        {{ title }}
      </h2>
      <div v-if="slots.actions" class="flex items-center gap-2 text-muted">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
