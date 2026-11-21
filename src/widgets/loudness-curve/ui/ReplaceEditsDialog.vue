<script setup lang="ts">
import { formatLoss } from '@/entities/split/lib/format-edits.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'

/*
The question before a setting change replaces the user's edits and pending splits with freshly
detected splits, and is asked for either one alone. "Keep edits" comes first, so it takes the focus;
it and Escape just close the dialog, and the caller (`useReplaceGuard`) drops the change that was
held back.
*/
defineProps<{ editCount: number; pendingCount: number }>()
const emit = defineEmits<{ replace: [] }>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Replace your edits?"
    :description="`This replaces your ${formatLoss(editCount, pendingCount)} with freshly detected splits.`"
  >
    <template #actions>
      <UiButton @click="open = false">Keep edits</UiButton>
      <UiButton variant="danger" @click="emit('replace')">Replace</UiButton>
    </template>
  </UiDialog>
</template>
