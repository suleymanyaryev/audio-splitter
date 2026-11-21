<script setup lang="ts">
import { useId } from 'vue'

// Attributes such as aria-label and maxlength belong on the input, not on the wrapper.
defineOptions({ inheritAttrs: false })

const { variant = 'default', error = '' } = defineProps<{
  // `inline` reads as plain text in a table row until it is hovered or focused; `wide` is the
  // default's look across the whole width, for a name in a dialog.
  variant?: 'default' | 'inline' | 'wide'
  // A plain sentence shown under the field; its presence makes the field invalid.
  error?: string
}>()

const BOXED =
  'h-9 w-full border-edge bg-surface px-2.5 enabled:hover:border-ink disabled:opacity-40 aria-invalid:border-split aria-invalid:outline-split'
const VARIANT_CLASSES = {
  inline:
    '-mx-1.5 h-6 w-[calc(100%+12px)] border-transparent bg-transparent px-1.5 enabled:hover:border-edge',
  default: `${BOXED} max-w-56`,
  wide: BOXED,
}

const model = defineModel<string>({ required: true })

const errorId = useId()
</script>

<template>
  <div>
    <input
      v-model="model"
      v-bind="$attrs"
      type="text"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      class="rounded-control border text-sm text-ink focus-visible:focus-ring"
      :class="VARIANT_CLASSES[variant]"
    />
    <p v-if="error" :id="errorId" class="mt-1 text-xs font-semibold text-split">{{ error }}</p>
  </div>
</template>
