<script setup lang="ts">
const { size = 'md' } = defineProps<{
  // Required: the icon alone gives a screen reader nothing to read.
  label: string
  // `md` is 36 px; `sm` (32 px) is for table rows.
  size?: 'sm' | 'md'
}>()
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    class="inline-flex cursor-pointer items-center justify-center rounded-control border border-edge bg-surface text-ink transition-colors duration-100 focus-visible:focus-ring enabled:hover:border-ink enabled:hover:bg-land/40 disabled:cursor-not-allowed disabled:opacity-40"
    :class="size === 'sm' ? 'size-8' : 'size-9'"
  >
    <slot />
  </button>
</template>
