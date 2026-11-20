<script setup lang="ts">
import UiTooltip from './UiTooltip.vue'

// The tooltip wraps the button, so the caller's click and class go to the button itself.
defineOptions({ inheritAttrs: false })

const {
  hint = '',
  size = 'md',
  variant = 'secondary',
} = defineProps<{
  // Required: the icon alone gives a screen reader nothing to read. It is also the tooltip.
  label: string
  // The button's key ("Enter"), said in the tooltip after the label. The accessible name stays
  // the label alone.
  hint?: string
  // `md` is 36 px; `sm` (32 px) is for table rows and title rows.
  size?: 'sm' | 'md'
  // `primary` is the panel's one main action, filled like UiButton's primary.
  variant?: 'secondary' | 'primary'
}>()

const VARIANT_CLASSES = {
  secondary:
    'border border-edge bg-surface text-ink enabled:hover:border-ink enabled:hover:bg-land/40',
  primary: 'bg-ink text-surface enabled:hover:bg-wave',
}
</script>

<template>
  <UiTooltip :label :hint>
    <button
      v-bind="$attrs"
      type="button"
      :aria-label="label"
      class="inline-flex cursor-pointer items-center justify-center rounded-control transition-colors duration-100 focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40"
      :class="[VARIANT_CLASSES[variant], size === 'sm' ? 'size-8' : 'size-9']"
    >
      <slot />
    </button>
  </UiTooltip>
</template>
