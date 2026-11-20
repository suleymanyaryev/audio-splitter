import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/*
Which export is writing, so the full export and a single export never run at once (both cut with
the one ffmpeg session and write into a folder). It is a store of its own because the two export
stores cannot import each other. An export takes the lock before it asks for a folder and gives
it back when it ends, however it ends.
*/
export const useExportLockStore = defineStore('export-lock', () => {
  const holder = ref<'full' | 'single' | null>(null)
  const isHeld = computed(() => holder.value !== null)

  // The caller checks `isHeld` first: one export starts at a time, and a start is synchronous.
  function take(who: 'full' | 'single') {
    holder.value = who
  }

  function release(who: 'full' | 'single') {
    if (holder.value === who) holder.value = null
  }

  return { holder, isHeld, take, release }
})
