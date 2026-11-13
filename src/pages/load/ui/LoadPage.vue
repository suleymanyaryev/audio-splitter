<script setup lang="ts">
import { useTemplateRef } from 'vue'

import UiButton from '@/shared/ui/UiButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'

const emit = defineEmits<{ choose: [file: File] }>()

const fileInput = useTemplateRef('fileInput')

function onFileChange() {
  const file = fileInput.value?.files?.[0]
  if (!file) return
  emit('choose', file)
  // Clearing the input lets the same file be chosen again after "New file".
  fileInput.value.value = ''
}
</script>

<template>
  <main class="mx-auto max-w-xl p-4 pt-16">
    <UiPanel title="Load a source file">
      <p>
        One long audio file of tracks played one after another, as .m4a, .mp3 or .opus. It is read
        in this browser and never uploaded.
      </p>
      <!-- The native input stays hidden; the kit button opens its file dialog. -->
      <input ref="fileInput" type="file" class="hidden" @change="onFileChange" />
      <UiButton variant="primary" class="mt-4" @click="fileInput?.click()">Choose file…</UiButton>
    </UiPanel>
  </main>
</template>
