<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleQuestionMark } from 'lucide-vue-next'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { formatLoss } from '@/entities/split/lib/format-edits.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import LoadPage from '@/pages/load/ui/LoadPage.vue'
import ReviewPage from '@/pages/review/ui/ReviewPage.vue'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiIconButton from '@/shared/ui/UiIconButton.vue'
import { useShortcutsDialogStore } from '@/widgets/shortcuts-dialog/model/shortcuts-dialog.ts'

// No router: the page follows whether a file is loaded (docs/adr/0001-fsd-subset.md).
const sourceFile = useSourceFileStore()
const split = useSplitStore()
const shortcuts = useShortcutsDialogStore()

// The file chip: the name while loading, then its duration once the probe has read it.
const chip = computed(() => {
  if (sourceFile.status !== 'loading' && sourceFile.status !== 'ready') return null
  const name = sourceFile.file?.name ?? ''
  const duration = sourceFile.durationSeconds
  return duration === null ? name : `${name} · ${formatDuration(duration)}`
})

// "New file" throws the edits and the pending splits away, so it asks first when there are any.
const asking = ref(false)

function newFile() {
  if (split.hasEdits || split.pendingSplits.length > 0) asking.value = true
  else sourceFile.reset()
}

function discardAndReset() {
  asking.value = false
  sourceFile.reset()
}
</script>

<template>
  <!-- The band's tokens have no dark values, so it stays vinyl black in both themes. -->
  <header
    class="flex h-12 items-center gap-4 border-b border-vinyl-edge bg-vinyl px-4 text-on-vinyl"
  >
    <!-- The centre-label mark: a vermilion disc with a spindle hole. -->
    <span aria-hidden="true" class="grid size-5 shrink-0 place-items-center rounded-full bg-split">
      <span class="size-1.5 rounded-full bg-vinyl" />
    </span>
    <span class="text-lg font-bold">Audio Splitter</span>
    <span
      v-if="chip"
      class="min-w-0 truncate rounded-control border border-vinyl-edge px-2.5 py-1 text-xs font-semibold"
    >
      {{ chip }}
    </span>
    <span class="ml-auto shrink-0 text-xs text-on-vinyl-muted"
      >Local only · nothing is uploaded</span
    >
    <UiIconButton
      v-if="sourceFile.status === 'ready'"
      variant="inverse"
      label="Keyboard shortcuts"
      hint="?"
      @click="shortcuts.show()"
    >
      <CircleQuestionMark class="size-4 shrink-0" />
    </UiIconButton>
    <UiButton v-if="sourceFile.status === 'ready'" variant="inverse" @click="newFile">
      New file
    </UiButton>
  </header>

  <UiDialog
    v-model:open="asking"
    title="Discard your edits?"
    :description="`Loading a new file discards your ${formatLoss(split.editCount, split.pendingSplits.length)}.`"
  >
    <template #actions>
      <UiButton @click="asking = false">Keep edits</UiButton>
      <UiButton variant="danger" @click="discardAndReset">New file</UiButton>
    </template>
  </UiDialog>

  <ReviewPage v-if="sourceFile.status === 'ready'" />
  <LoadPage v-else />
</template>
