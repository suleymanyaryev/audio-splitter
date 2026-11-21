import { onBeforeUnmount, onMounted } from 'vue'

// A text field takes the key as text, so a `?` typed into one is a question mark.
function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

// Another dialog (the replace-edits confirm, the export) has the page: help does not open over it.
function isDialogOpen() {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

/*
Calls `onPress` when `?` is pressed anywhere on the page, for as long as the caller is mounted.
Ctrl, Cmd and Alt with a key belong to the browser, so they are left alone.
*/
export function useQuestionMarkKey(onPress: () => void) {
  function onKeydown(event: KeyboardEvent) {
    const isOtherKey = event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey
    if (isOtherKey || isTyping(event.target) || isDialogOpen()) return
    event.preventDefault()
    onPress()
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
  })
}
