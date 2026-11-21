<script setup lang="ts">
import { computed } from 'vue'

import { useSplitStore } from '@/entities/split/model/split.ts'
import UiButton from '@/shared/ui/UiButton.vue'
import UiPlainDialog from '@/shared/ui/UiPlainDialog.vue'
import { SHORTCUT_SECTIONS } from '../config/shortcut-sections.ts'
import { orderSections } from '../lib/order-sections.ts'
import { useShortcutsDialogStore } from '../model/shortcuts-dialog.ts'

/*
Every key and pointer gesture of the review screen, one section per area, the view on show first
so what the user needs now is at the top. The list is `config/shortcut-sections.ts`. Escape or a
press outside closes it (`UiPlainDialog`).
*/
const split = useSplitStore()
const shortcuts = useShortcutsDialogStore()

const open = computed({
  get: () => shortcuts.isOpen,
  set: (next) => {
    if (next) shortcuts.show()
    else shortcuts.hide()
  },
})

const sections = computed(() => orderSections(SHORTCUT_SECTIONS, split.view))
</script>

<template>
  <UiPlainDialog
    v-model:open="open"
    size="lg"
    title="Keyboard shortcuts"
    description="Every key and pointer gesture of the review screen. The view on show comes first."
  >
    <section v-for="section in sections" :key="section.id" class="mt-4 first:mt-0">
      <h3 class="border-b border-hairline pb-1 text-sm font-semibold">{{ section.title }}</h3>
      <dl class="mt-1.5 grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
        <template v-for="row in section.rows" :key="row.input">
          <dt class="font-semibold">{{ row.input }}</dt>
          <dd class="text-muted">{{ row.does }}</dd>
        </template>
      </dl>
    </section>
    <template #actions>
      <UiButton @click="shortcuts.hide()">Close</UiButton>
    </template>
  </UiPlainDialog>
</template>
