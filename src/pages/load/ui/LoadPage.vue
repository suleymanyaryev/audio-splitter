<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiPanel from '@/shared/ui/UiPanel.vue'
import UiProgressBar from '@/shared/ui/UiProgressBar.vue'

const sourceFile = useSourceFileStore()
const fileInput = useTemplateRef('fileInput')

// Shown while the ffmpeg core downloads; null when it isn't (before, after, or never).
const downloadPercent = computed(() =>
  sourceFile.downloadFraction === null ? null : Math.round(sourceFile.downloadFraction * 100),
)

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
  <main class="mx-auto max-w-xl p-8 pt-16">
    <UiPanel title="Load a source file">
      <p>
        One long audio file of tracks played one after another, as .m4a, .mp3 or .opus. Choose it or
        drop it anywhere on this page. It is read in this browser and never uploaded.
      </p>

      <template v-if="sourceFile.status === 'loading'">
        <!-- The download comes first; loading ffmpeg and probing come before the slice count is known. -->
        <div v-if="downloadPercent !== null" class="mt-4" role="status">
          <UiProgressBar
            :value="downloadPercent"
            :max="100"
            :label="`Downloading ffmpeg… ${downloadPercent}%`"
            running
          />
        </div>
        <UiProgressBar
          v-else-if="sourceFile.sliceTotal > 0"
          class="mt-4"
          :value="sourceFile.slicesDone"
          :max="sourceFile.sliceTotal"
          :label="`${sourceFile.slicesDone} / ${sourceFile.sliceTotal} slices`"
          running
        />
        <p v-else class="mt-4 text-muted" role="status">Reading {{ sourceFile.file?.name }}…</p>
      </template>

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
          <p class="break-words">{{ sourceFile.file?.name }} could not be loaded.</p>
          <p>Failed at: {{ sourceFile.failure.step }}.</p>
          <p class="break-words">Reason: {{ sourceFile.failure.reason }}</p>
        </template>
      </div>

      <!-- The native input stays hidden; the kit button opens its file dialog. -->
      <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="onFileChange" />
      <!-- Cancel takes the button's place while loading. -->
      <UiButton v-if="sourceFile.status === 'loading'" class="mt-4" @click="sourceFile.cancel()">
        Cancel
      </UiButton>
      <UiButton v-else variant="primary" class="mt-4" @click="fileInput?.click()">
        {{ sourceFile.status === 'failed' ? 'Choose another file' : 'Choose file…' }}
      </UiButton>
    </UiPanel>
  </main>
</template>
