<script setup lang="ts">
const { variant = 'secondary', size = 'md' } = defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'inverse'
  // `md` is 36 px; `sm` (32 px) is for title rows and table rows, `lg` (40 px) only for Export.
  size?: 'sm' | 'md' | 'lg'
}>()

const VARIANT_CLASSES = {
  primary: 'bg-ink text-surface focus-visible:focus-ring enabled:hover:bg-wave',
  secondary:
    'border border-edge bg-surface text-ink focus-visible:focus-ring enabled:hover:border-ink enabled:hover:bg-land/40',
  danger:
    'border border-split bg-surface text-split focus-visible:focus-ring enabled:hover:bg-split enabled:hover:text-on-split',
  /*
  Only on the vinyl header band, where the ring takes the band's own ink. It is spelled out
  because `focus-ring` plus a second outline colour has no stable winner: the dev server and the
  build order the two rules differently.
  */
  inverse:
    'bg-on-vinyl text-vinyl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-vinyl enabled:hover:bg-white',
}

const SIZE_CLASSES = {
  sm: 'h-8 px-3',
  md: 'h-9 px-3.5',
  lg: 'h-10 px-5 text-base',
}
</script>

<template>
  <button
    type="button"
    class="inline-flex cursor-pointer items-center gap-2 rounded-control text-sm font-semibold whitespace-nowrap transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40"
    :class="[VARIANT_CLASSES[variant], SIZE_CLASSES[size]]"
  >
    <slot />
  </button>
</template>
