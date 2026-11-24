<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import { MAX_TRACK_NAME_LENGTH } from '@/entities/split/config/track-name.ts'
import UiTextField from '@/shared/ui/UiTextField.vue'

/*
One track's name, edited in place. The field shows `name` (the prefixed number while the track has
no name of its own, in muted text until the edit begins, `isOwn` says which; `dimmed` mutes it
too, for a left-out track) and keeps what is typed
as a draft until the edit ends: Enter or leaving the field saves it, Escape puts `name` back. Saving
something that, trimmed, is what the field showed when the edit began is not a save at all, so
passing through a field never counts as a rename. After an edit the field shows `name` again, which
is the saved name as the store keeps it (trimmed, or the prefixed number for an empty one).
*/
const {
  name,
  label,
  isOwn,
  dimmed = false,
} = defineProps<{
  name: string
  label: string
  isOwn: boolean
  dimmed?: boolean
}>()
const emit = defineEmits<{ start: []; save: [name: string] }>()

const draft = ref(name)
const isEditing = ref(false)
const shownAtStart = ref('')

// The name changes behind the field's back: a setting change, a deleted split, a renumbering.
watch(
  () => name,
  (shown) => {
    if (!isEditing.value) draft.value = shown
  },
)

function start() {
  isEditing.value = true
  shownAtStart.value = name
  emit('start')
}

async function finish(shouldSave: boolean) {
  if (!isEditing.value) return
  isEditing.value = false
  if (shouldSave && draft.value.trim() !== shownAtStart.value.trim()) emit('save', draft.value)
  await nextTick()
  draft.value = name
}

function onKeydown(event: KeyboardEvent) {
  const field = event.target as HTMLInputElement
  if (event.key === 'Enter') {
    void finish(true)
    field.blur()
  } else if (event.key === 'Escape') {
    void finish(false)
    field.blur()
  }
}
</script>

<template>
  <UiTextField
    v-model="draft"
    variant="inline"
    :aria-label="label"
    :maxlength="MAX_TRACK_NAME_LENGTH"
    :muted="(!isOwn || dimmed) && !isEditing"
    @focus="start"
    @blur="finish(true)"
    @keydown="onKeydown"
  />
</template>
