<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

const { size = 'md' } = defineProps<{
  title: string
  description: string
  // `md` is 448 px wide, as the alert dialog; `lg` is 672 px, for a dialog that holds a list.
  size?: 'md' | 'lg'
}>()

const open = defineModel<boolean>('open', { required: true })

const slots = defineSlots<{ default?: () => unknown; actions?: () => unknown }>()

const SIZE_CLASSES = { md: 'max-w-md', lg: 'max-w-2xl' }
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <!-- The alert dialog's ground (UiDialog): the page gives way, there is no dimmed layer. A press
      on it is a press outside the dialog, which closes it. -->
      <DialogOverlay class="fixed inset-0 z-40 bg-ground" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] -translate-1/2 flex-col rounded-panel border border-hairline bg-surface p-4 focus:outline-none"
        :class="SIZE_CLASSES[size]"
      >
        <DialogTitle class="shrink-0 text-base font-semibold">{{ title }}</DialogTitle>
        <DialogDescription class="mt-1 shrink-0">{{ description }}</DialogDescription>
        <!-- Only the body scrolls, so the title and the actions stay in view on a short window. -->
        <div v-if="slots.default" class="mt-4 min-h-0 overflow-y-auto">
          <slot />
        </div>
        <div v-if="slots.actions" class="mt-4 flex shrink-0 justify-end gap-2">
          <slot name="actions" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
