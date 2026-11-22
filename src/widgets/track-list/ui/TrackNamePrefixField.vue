<script setup lang="ts">
import { computed, ref } from 'vue'

import { MAX_TRACK_NAME_LENGTH } from '@/entities/split/config/track-name.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import UiTextField from '@/shared/ui/UiTextField.vue'

/*
The track name prefix (GLOSSARY.md), edited in the "Track list" panel's header, beside the names it
changes. It writes to the store on every input, so every unnamed track's name follows the typing.
Enter leaves the field and keeps the text; Escape puts back the prefix the field had when it got
the focus, then leaves it, so the keys go back to the view on show. The short visible label is
"Prefix"; the accessible name says what it is a prefix of.
*/
const split = useSplitStore()

const prefix = computed({
  get: () => split.trackNamePrefix,
  set: (typed) => {
    split.setTrackNamePrefix(typed)
  },
})

const prefixAtFocus = ref('')

function onFocus() {
  prefixAtFocus.value = split.trackNamePrefix
}

function onKeydown(event: KeyboardEvent) {
  const field = event.target as HTMLInputElement
  if (event.key === 'Enter') {
    field.blur()
  } else if (event.key === 'Escape') {
    split.setTrackNamePrefix(prefixAtFocus.value)
    field.blur()
  }
}
</script>

<template>
  <label class="flex items-center gap-2 text-xs font-medium text-muted">
    Prefix
    <UiTextField
      v-model="prefix"
      aria-label="Track name prefix"
      :maxlength="MAX_TRACK_NAME_LENGTH"
      @focus="onFocus"
      @keydown="onKeydown"
    />
  </label>
</template>
