<script setup lang="ts">
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'

defineProps<{ title: string; description: string }>()

const open = defineModel<boolean>('open', { required: true })

const slots = defineSlots<{ default?: () => unknown; actions: () => unknown }>()
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <!-- An opaque ground, not a dimmed page: the system has no translucency over content,
      so the dialog becomes the one panel lying on the ground. -->
      <AlertDialogOverlay class="fixed inset-0 z-40 bg-ground" />
      <AlertDialogContent
        class="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-1/2 rounded-panel border border-hairline bg-surface p-4 focus:outline-none"
      >
        <AlertDialogTitle class="text-base font-semibold">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="mt-1">{{ description }}</AlertDialogDescription>
        <div v-if="slots.default" class="mt-4">
          <slot />
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <slot name="actions" />
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
