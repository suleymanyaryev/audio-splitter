import { ref } from 'vue'
import { defineStore } from 'pinia'

/*
Whether the shortcuts dialog is open. The header's `?` button (src/app/App.vue) and the `?` key
(the review page) both open it, and the dialog on the review page closes it, so the three share
this one flag.
*/
export const useShortcutsDialogStore = defineStore('shortcuts-dialog', () => {
  const isOpen = ref(false)

  function show() {
    isOpen.value = true
  }

  function hide() {
    isOpen.value = false
  }

  return { isOpen, show, hide }
})
