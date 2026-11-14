import { computed, ref } from 'vue'

import { useSplitStore } from '@/entities/split/model/split.ts'

/*
Asks before a setting change throws the user's edits away (a setting change finds every split
again, ticket 13). While there are no edits, `change` runs the change at once. With edits it holds
the change back and sets `asking`, which the confirm dialog shows (and clears through its v-model
when the user keeps the edits or presses Escape); `replace` runs the held change, which clears the
edits, so the next change runs freely. A change that arrives while the question is open is
ignored: the first one is the one asked about.
*/
export function useReplaceGuard() {
  const split = useSplitStore()
  const asking = ref(false)
  const editCount = computed(() => split.editCount)
  let held: (() => void) | null = null

  function change(apply: () => void) {
    if (asking.value) return
    if (split.hasEdits) {
      held = apply
      asking.value = true
    } else {
      apply()
    }
  }

  function replace() {
    const apply = held
    held = null
    asking.value = false
    apply?.()
  }

  return { asking, editCount, change, replace }
}
