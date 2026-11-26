import { computed, ref } from 'vue'

/*
The edit ledger: the Edit rules (GLOSSARY.md: Edit), which the split store calls once and keeps
private. The store's actions report what the user did, by split id or track key, and the ledger
applies the rules and keeps the count. It reads nothing else: it never sees a split, a track or a
name, so the store decides whether anything changed at all, and whether an inserted split is the
user's. A track is keyed by the id of the split where it starts, or null for the file's start.

A split is one edit from the first change to it, however often it changes: moved ten times, or
moved back, it is one. An added split moved is still the one "added" edit, and a checked split that
moves is one edit, not two. Deleting an added split takes its edit back; deleting a detected split
(one Find splits added) counts one deletion in place of its move or check.

A track's name, or its being left out, is an edit only while it differs from how the track came to
be: named back to its number, or toggled twice, it is none. Deleting a split takes the edits of the
track that starts at it.
*/
export function useEditLedger() {
  const movedIds = ref(new Set<number>())
  const addedIds = ref(new Set<number>())
  const checkedIds = ref(new Set<number>())
  // The tracks named, and the tracks left out or brought back (a second toggle takes it back).
  const namedKeys = ref(new Set<number | null>())
  const toggledKeys = ref(new Set<number | null>())
  // Detected splits only: deleting an added split takes its "added" edit back, so it never counts.
  const deletedCount = ref(0)

  const count = computed(
    () =>
      movedIds.value.size +
      addedIds.value.size +
      checkedIds.value.size +
      namedKeys.value.size +
      toggledKeys.value.size +
      deletedCount.value,
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
    namedKeys.value.delete(id)
    toggledKeys.value.delete(id)
  }

  function trackNamed(key: number | null, isNamed: boolean) {
    if (isNamed) namedKeys.value.add(key)
    else namedKeys.value.delete(key)
  }

  function leftOutToggled(key: number | null) {
    if (!toggledKeys.value.delete(key)) toggledKeys.value.add(key)
  }

  /*
  The first track was removed and the file's start took over the next track's name and left-out
  state. A file opens with its first track unnamed and included, so the start is an edit exactly
  while it is named, and exactly while it is left out by hand: a state it took from a cut has no
  edit of its own.
  */
  function startInherited(isNamed: boolean, isLeftOutByHand: boolean) {
    trackNamed(null, isNamed)
    toggledKeys.value.delete(null)
    if (isLeftOutByHand) toggledKeys.value.add(null)
  }

  function clear() {
    movedIds.value.clear()
    addedIds.value.clear()
    checkedIds.value.clear()
    namedKeys.value.clear()
    toggledKeys.value.clear()
    deletedCount.value = 0
  }

  return {
    count,
    splitAdded,
    splitMoved,
    splitChecked,
    splitDeleted,
    trackNamed,
    leftOutToggled,
    startInherited,
    clear,
  }
}
