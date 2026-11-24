<script setup lang="ts">
import { formatLoss } from '@/entities/split/lib/format-edits.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'

/*
The question before "Clear splits" throws the user's edits and pending splits away, and is asked
for either one alone. "Keep splits" comes first, so it takes the focus; it and Escape just close
the dialog.
*/
defineProps<{ editCount: number; pendingCount: number }>()
const emit = defineEmits<{ clear: [] }>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Clear splits?"
    :description="`This deletes every split and name, and discards your ${formatLoss(editCount, pendingCount)}.`"
  >
    <template #actions>
      <UiButton @click="open = false">Keep splits</UiButton>
      <UiButton variant="danger" @click="emit('clear')">Clear splits</UiButton>
    </template>
  </UiDialog>
</template>
