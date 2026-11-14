<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'

const sourceFile = useSourceFileStore()
const fileInput = useTemplateRef('fileInput')

// The extensions are only a convenience for the file dialog: the probe decides by contents.
const ACCEPT = '.m4a,.mp3,.opus'

function choose(file: File) {
  if (sourceFile.status === 'loading') return
  void sourceFile.load(file)
}

function onFileChange() {
  const file = fileInput.value?.files?.[0]
  if (!file) return
  choose(file)
  // Clearing the input lets the same file be chosen again after "New file".
  fileInput.value.value = ''
}

// A file dropped anywhere on the page loads, instead of the browser opening it in the tab.
function onDragOver(event: DragEvent) {
  event.preventDefault()
}
function onDrop(event: DragEvent) {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file) choose(file)
}

onMounted(() => {
  document.addEventListener('dragover', onDragOver)
  document.addEventListener('drop', onDrop)
})
onBeforeUnmount(() => {
  document.removeEventListener('dragover', onDragOver)
  document.removeEventListener('drop', onDrop)
})
</script>

<template>
  <main class="mx-auto max-w-xl p-4 pt-16">
    <UiPanel title="Load a source file">
      <p>
        One long audio file of tracks played one after another, as .m4a, .mp3 or .opus. Choose it or
        drop it anywhere on this page. It is read in this browser and never uploaded.
      </p>

      <p v-if="sourceFile.status === 'loading'" class="mt-4 text-muted" role="status">
        Reading {{ sourceFile.file?.name }}…
      </p>

      <div
        v-if="sourceFile.status === 'failed' && sourceFile.failure"
        class="mt-4 text-xs font-semibold text-split"
        role="alert"
      >
        <template v-if="sourceFile.failure.kind === 'unsupported'">
          <p class="break-words">{{ sourceFile.file?.name }} is not a supported format.</p>
          <p>{{ sourceFile.failure.message }}</p>
        </template>
        <template v-else>
          <p class="break-words">
            {{ sourceFile.file?.name }} could not be loaded at the {{ sourceFile.failure.step }}
            step.
          </p>
          <p class="break-words">ffmpeg said: {{ sourceFile.failure.reason }}</p>
        </template>
      </div>

      <!-- The native input stays hidden; the kit button opens its file dialog. -->
      <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="onFileChange" />
      <UiButton
        variant="primary"
        class="mt-4"
        :disabled="sourceFile.status === 'loading'"
        @click="fileInput?.click()"
      >
        {{ sourceFile.status === 'failed' ? 'Choose another file' : 'Choose file…' }}
      </UiButton>
    </UiPanel>
  </main>
</template>
