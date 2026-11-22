<script setup lang="ts" generic="Value extends string">
import type { Component } from 'vue'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

import { releaseFocus } from '@/shared/lib/keyboard/release-focus.ts'
import UiTooltip from './UiTooltip.vue'

const { variant = 'default' } = defineProps<{
  // Names the whole control for a screen reader ("Panel view").
  label: string
  // An option with an `icon` shows the icon alone: its label is the tooltip and the accessible name.
  options: { value: Value; label: string; disabled?: boolean; icon?: Component }[]
  // `inverse` is only for the header band.
  variant?: 'default' | 'inverse'
}>()

// One option is always chosen: the control switches between views, it never clears.
const model = defineModel<Value>({ required: true })

/*
The chosen look keys on `aria-checked`, not on Reka's `data-state`: the tooltip around an option
sets its own `data-state` (closed, open) on the same button.
*/
const ROOT_CLASSES = {
  default: 'border-edge bg-surface',
  inverse: 'border-band-edge',
}

/*
The inverse ring is spelled out, as UiButton's inverse spells it: `focus-ring` plus a second
outline colour has no stable winner.
*/
const OPTION_CLASSES = {
  default:
    'text-ink focus-visible:focus-ring enabled:hover:bg-land/40 enabled:active:bg-land aria-checked:border-ink aria-checked:bg-land/50',
  inverse:
    'text-on-band focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-band enabled:hover:bg-on-band/15 enabled:active:bg-on-band/30 aria-checked:border-on-band aria-checked:bg-on-band/20',
}
</script>

<template>
  <RadioGroupRoot
    v-model="model"
    :aria-label="label"
    class="inline-flex h-8 items-center gap-0.5 rounded-control border p-0.5"
    :class="ROOT_CLASSES[variant]"
  >
    <UiTooltip
      v-for="option in options"
      :key="option.value"
      :label="option.label"
      :disabled="!option.icon"
    >
      <RadioGroupItem
        :value="option.value"
        :disabled="option.disabled"
        :aria-label="option.icon ? option.label : undefined"
        class="inline-flex h-full cursor-pointer items-center justify-center rounded-control border border-transparent text-sm font-semibold whitespace-nowrap tint-transition disabled:cursor-not-allowed disabled:opacity-40"
        :class="[OPTION_CLASSES[variant], option.icon ? 'px-2' : 'px-3']"
        @mousedown="releaseFocus"
      >
        <component :is="option.icon" v-if="option.icon" class="size-4 shrink-0" />
        <template v-else>{{ option.label }}</template>
      </RadioGroupItem>
    </UiTooltip>
  </RadioGroupRoot>
</template>
