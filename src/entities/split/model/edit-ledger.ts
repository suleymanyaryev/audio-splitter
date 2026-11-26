import { computed, ref } from 'vue'

/*
The edit ledger: the Edit rules (GLOSSARY.md: Edit) for the splits, which the split store calls once
and keeps private. The store's actions report what the user did, by split id, and the ledger
applies the rules and keeps the count. It reads nothing else: it never sees a split, so the store
decides whether anything changed at all, and whether an inserted split is the user's.

A split is one edit from the first change to it, however often it changes: moved ten times, or
moved back, it is one. An added split moved is still the one "added" edit, and a checked split that
moves is one edit, not two. Deleting an added split takes its edit back; deleting a detected split
(one Find splits added) counts one deletion in place of its move or check.
*/
export function useEditLedger() {
  const movedIds = ref(new Set<number>())
  const addedIds = ref(new Set<number>())
  const checkedIds = ref(new Set<number>())
  // Detected splits only: deleting an added split takes its "added" edit back, so it never counts.
  const deletedCount = ref(0)

  const count = computed(
    () => movedIds.value.size + addedIds.value.size + checkedIds.value.size + deletedCount.value,
  )

  function splitAdded(id: number) {
    addedIds.value.add(id)
  }

  function splitMoved(id: number) {
    if (!addedIds.value.has(id)) movedIds.value.add(id)
    checkedIds.value.delete(id)
  }

  function splitChecked(id: number) {
    checkedIds.value.add(id)
  }

  function splitDeleted(id: number) {
    if (!addedIds.value.delete(id)) deletedCount.value++
    movedIds.value.delete(id)
    checkedIds.value.delete(id)
  }

  function clear() {
    movedIds.value.clear()
    addedIds.value.clear()
    checkedIds.value.clear()
    deletedCount.value = 0
  }

  return { count, splitAdded, splitMoved, splitChecked, splitDeleted, clear }
}
