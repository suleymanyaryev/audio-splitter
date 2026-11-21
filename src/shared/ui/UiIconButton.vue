<script setup lang="ts">
// A mouse press leaves the focus off the button, as UiButton's does.
import { releaseFocus } from '@/shared/lib/keyboard/release-focus.ts'
import UiTooltip from './UiTooltip.vue'

// The tooltip wraps the button, so the caller's click and class go to the button itself.
defineOptions({ inheritAttrs: false })

const {
  hint = '',
  reason = '',
  size = 'md',
  variant = 'secondary',
} = defineProps<{
  // Required: the icon alone gives a screen reader nothing to read. It is also the tooltip.
  label: string
  // The button's key ("Enter"), said in the tooltip after the label. The accessible name stays
  // the label alone.
  hint?: string
  // Why the button is off, said in the tooltip in place of the label and the key while it is set.
  reason?: string
  // `md` is 36 px; `sm` (32 px) is for table rows and title rows.
  size?: 'sm' | 'md'
  // `primary` is the panel's one main action, filled like UiButton's primary; `inverse` is only
  // for the header band.
  variant?: 'secondary' | 'primary' | 'inverse'
}>()

const VARIANT_CLASSES = {
  secondary:
    'border border-edge bg-surface text-ink focus-visible:focus-ring enabled:hover:border-ink enabled:hover:bg-land/40 enabled:active:bg-land',
  primary:
    'bg-fill text-on-fill focus-visible:focus-ring enabled:hover:bg-fill-hover enabled:active:bg-ink',
  // The ring is spelled out, as UiButton's inverse spells it: `focus-ring` plus a second outline
  // colour has no stable winner.
  inverse:
    'bg-on-band text-band focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-band enabled:hover:bg-white enabled:active:bg-on-band-muted',
}
</script>

<template>
  <UiTooltip :label="reason || label" :hint="reason ? '' : hint">
    <button
      v-bind="$attrs"
      type="button"
      :aria-label="label"
      class="inline-flex cursor-pointer items-center justify-center rounded-control tint-transition disabled:cursor-not-allowed disabled:opacity-40"
      :class="[VARIANT_CLASSES[variant], size === 'sm' ? 'size-8' : 'size-9']"
      @mousedown="releaseFocus"
    >
      <slot />
    </button>
  </UiTooltip>
</template>
