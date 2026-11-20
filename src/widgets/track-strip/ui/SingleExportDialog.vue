<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import { MAX_TRACK_NAME_LENGTH } from '@/entities/split/config/track-name.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiPlainDialog from '@/shared/ui/UiPlainDialog.vue'
import UiTextField from '@/shared/ui/UiTextField.vue'
import { useExportSingleStore } from '../model/export-single.ts'

/*
The name dialog of a single export: the name to give the file, filled in with the store's default,
the folder it goes to with "Change folder", and OK. Enter in the name confirms as OK does, and OK
is off while the name is empty. While the file is cut and written it shows that, with Cancel;
Escape and a press outside close it only when it is not running. A failure stays in the dialog
with its reason, over the name, to confirm again. A success closes it: the view says where the
file went. The dialog tells the page which name was confirmed instead of running the export itself,
because the page stops the sound first (the store cannot import the player).
*/
const emit = defineEmits<{ confirm: [name: string] }>()

const exporter = useExportSingleStore()
const fieldId = useId()

const open = computed({
  get: () => ['naming', 'running', 'failed'].includes(exporter.status),
  // Escape and a press outside: the store keeps a running export open.
  set(wanted) {
    if (!wanted) exporter.close()
  },
})

// What the field holds: the default, until the user types.
const name = ref(exporter.defaultName)
watch(
  () => exporter.status,
  (now, before) => {
    if (now === 'naming' && before !== 'naming') name.value = exporter.defaultName
  },
)

const canConfirm = computed(() => name.value.trim() !== '' && !exporter.isRunning)

function confirm() {
  if (canConfirm.value) emit('confirm', name.value)
}

// The field opens selected, so typing replaces the default and Enter keeps it.
function selectAll(event: FocusEvent) {
  if (event.target instanceof HTMLInputElement) event.target.select()
}

// Not an Enter that picks a character in an input method.
function onEnter(event: KeyboardEvent) {
  if (!event.isComposing) confirm()
}

const title = computed(() => (exporter.subject === 'range' ? 'Export range' : 'Export track'))
const description = computed(() =>
  exporter.subject === 'range'
    ? 'Writes the range as one file, with no track number.'
    : 'Writes the track as one file and gives it this name.',
)
</script>

<template>
  <UiPlainDialog v-model:open="open" :title :description>
    <div v-if="exporter.isRunning" role="status" class="text-sm font-semibold">
      Cutting and saving “{{ name.trim() }}”…
    </div>
    <template v-else>
      <label :for="fieldId" class="block text-sm font-semibold">Name</label>
      <UiTextField
        :id="fieldId"
        v-model="name"
        variant="wide"
        class="mt-1"
        :maxlength="MAX_TRACK_NAME_LENGTH"
        :error="exporter.failure === null ? '' : `Export failed: ${exporter.failure}`"
        @focus="selectAll"
        @keydown.enter="onEnter"
      />
      <p class="mt-3 text-sm text-muted">
        <template v-if="exporter.folderName === null">
          You choose a folder when you confirm.
        </template>
        <template v-else>
          Saves into <span class="font-semibold text-ink">{{ exporter.folderName }}</span
          >.
          <button
            type="button"
            class="cursor-pointer underline focus-visible:focus-ring"
            @click="exporter.changeFolder()"
          >
            Change folder
          </button>
        </template>
      </p>
    </template>
    <template #actions>
      <UiButton v-if="exporter.isRunning" @click="exporter.cancel()">Cancel</UiButton>
      <template v-else>
        <UiButton @click="exporter.close()">Cancel</UiButton>
        <UiButton variant="primary" :disabled="!canConfirm" @click="confirm">OK</UiButton>
      </template>
    </template>
  </UiPlainDialog>
</template>
