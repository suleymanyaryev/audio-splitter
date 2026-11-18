<script setup lang="ts" generic="Value extends string">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

defineProps<{
  // Names the whole control for a screen reader ("Panel view").
  label: string
  options: { value: Value; label: string; disabled?: boolean }[]
}>()

// One option is always chosen: the control switches between views, it never clears.
const model = defineModel<Value>({ required: true })
</script>

<template>
  <RadioGroupRoot
    v-model="model"
    :aria-label="label"
    class="inline-flex h-8 items-center gap-0.5 rounded-control border border-edge bg-surface p-0.5"
  >
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
      class="h-full cursor-pointer rounded-control border border-transparent px-3 text-sm font-semibold whitespace-nowrap text-ink transition-colors duration-100 focus-visible:focus-ring enabled:hover:bg-land/40 disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:border-ink data-[state=checked]:bg-land/50"
    >
      {{ option.label }}
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
