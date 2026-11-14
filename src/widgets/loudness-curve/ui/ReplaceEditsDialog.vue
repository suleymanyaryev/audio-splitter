<script setup lang="ts">
import { formatEdits } from '@/entities/split/lib/format-edits.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'

/*
The question before a setting change replaces the user's edits with freshly detected splits.
"Keep edits" comes first, so it takes the focus; it and Escape just close the dialog, and the
caller (`useReplaceGuard`) drops the change that was held back.
*/
defineProps<{ editCount: number }>()
const emit = defineEmits<{ replace: [] }>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Replace your edits?"
    :description="`This replaces your ${formatEdits(editCount)} with freshly detected splits.`"
  >
    <template #actions>
      <UiButton @click="open = false">Keep edits</UiButton>
      <UiButton variant="danger" @click="emit('replace')">Replace</UiButton>
    </template>
  </UiDialog>
</template>
