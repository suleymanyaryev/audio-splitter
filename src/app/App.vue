<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { CircleQuestionMark, Monitor, Moon, Sun } from 'lucide-vue-next'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { formatLoss } from '@/entities/split/lib/format-edits.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import LoadPage from '@/pages/load/ui/LoadPage.vue'
import ReviewPage from '@/pages/review/ui/ReviewPage.vue'
import { useTheme, type ThemeChoice } from '@/shared/lib/theme/theme.ts'
import { formatDuration } from '@/shared/lib/time/format-duration.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiIconButton from '@/shared/ui/UiIconButton.vue'
import UiSegmentedControl from '@/shared/ui/UiSegmentedControl.vue'
import { useShortcutsDialogStore } from '@/widgets/shortcuts-dialog/model/shortcuts-dialog.ts'

// No router: the page follows whether a file is loaded (docs/adr/0001-fsd-subset.md).
const sourceFile = useSourceFileStore()
const split = useSplitStore()
const shortcuts = useShortcutsDialogStore()

// The header's theme switch: the module owns the choice, the control only shows and sets it.
const { themeChoice, setThemeChoice } = useTheme()
const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: Component }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

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
  <header class="flex h-12 items-center gap-4 border-b border-band-edge bg-band px-4 text-on-band">
    <!-- The mark: a sea-mist disc with a hole. -->
    <span aria-hidden="true" class="grid size-5 shrink-0 place-items-center rounded-full bg-mark">
      <span class="size-1.5 rounded-full bg-band" />
    </span>
    <span class="text-lg font-bold">Audio Splitter</span>
    <span
      v-if="chip"
      class="min-w-0 truncate rounded-control border border-band-edge px-2.5 py-1 text-xs font-semibold"
    >
      {{ chip }}
    </span>
    <UiSegmentedControl
      class="ml-auto"
      variant="inverse"
      label="Theme"
      :options="THEME_OPTIONS"
      :model-value="themeChoice"
      @update:model-value="setThemeChoice"
    />
    <span class="shrink-0 text-xs text-on-band-muted">Local only · nothing is uploaded</span>
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
