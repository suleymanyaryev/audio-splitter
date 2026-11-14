<script setup lang="ts">
import { useId } from 'vue'

// `headline` sets the title in Headline style: the panel's one big reading (the zoom view's time).
defineProps<{ title: string; headline?: boolean }>()

const slots = defineSlots<{ default?: () => unknown; actions?: () => unknown }>()

const titleId = useId()
</script>

<template>
  <section :aria-labelledby="titleId" class="rounded-panel border border-hairline bg-surface p-4">
    <!-- Baseline alignment lines up a title with metadata text; a control has no useful
    baseline, so a row holding one is centred instead. -->
    <div
      class="mb-3 flex justify-between gap-6"
      :class="slots.actions ? 'items-center' : 'items-baseline'"
    >
      <h2 :id="titleId" :class="headline ? 'text-lg font-bold' : 'text-base font-semibold'">
        {{ title }}
      </h2>
      <div v-if="slots.actions" class="flex items-center gap-2 text-muted">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
