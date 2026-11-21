import { onBeforeUnmount, onMounted } from 'vue'

// Returns whether the key was acted on.
export type KeyHandler = (event: KeyboardEvent) => boolean

export interface PageKeysOptions {
  // The caller's own element: nothing inside it counts as a control that keeps a key for itself.
  root?: () => HTMLElement | null
  // Called after the handler acted, so the caller can react (the review page clears a status line).
  onActed?: () => void
}

const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const SLIDER_KEYS = new Set([...ARROWS, 'Home', 'End'])

// A text field takes the key as text, so a key typed into one is not the page's.
function isTyping(element: Element | null) {
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
  )
}

// A dialog has the page: no key reaches what is behind it.
function isDialogOpen() {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

// What a control reached with Tab does with a key itself: a button presses, a slider and a radio move.
function controlKeeps(element: Element | null, key: string) {
  if (element === null) return false
  const isButton = element.closest('button, [role="button"]') !== null
  const isSlider = element.closest('[role="slider"]') !== null
  const isRadio = element.closest('[role="radio"], [role="radiogroup"]') !== null
  return (
    (isButton && (key === ' ' || key === 'Enter')) ||
    (isSlider && SLIDER_KEYS.has(key)) ||
    (isRadio && ARROWS.has(key))
  )
}

// The element the key is for: where it was pressed, or the focus when it was pressed on the page.
function keyTarget(event: KeyboardEvent) {
  return event.target instanceof Element ? event.target : document.activeElement
}

/*
Calls `isKeyTaken` (the caller's handler) with every key pressed anywhere on the page, for as long as the caller is mounted,
except those that are not the page's: a key with Ctrl, Cmd or Alt (the browser's), a key typed into a
text field, any key while a dialog is open, and a key that the control the user reached with Tab
uses itself. The handler says whether it acted; if so the browser's own action (a scroll) is kept
off and `onActed` is called.
*/
export function usePageKeys(isKeyTaken: KeyHandler, options: PageKeysOptions = {}) {
  function onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const target = keyTarget(event)
    if (isTyping(target) || isDialogOpen()) return
    const isOwn = target !== null && (options.root?.()?.contains(target) ?? false)
    if (!isOwn && controlKeeps(target, event.key)) return
    const hasActed = isKeyTaken(event)
    if (!hasActed) return
    event.preventDefault()
    options.onActed?.()
  }

  /*
  Capturing, so the dialog check runs before a dialog's own Escape handler closes it: otherwise the
  dialog could be gone from the page by the time the key reaches this listener, and the same
  Escape would also act on the view behind it.
  */
  onMounted(() => {
    document.addEventListener('keydown', onKeydown, { capture: true })
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown, { capture: true })
  })
}
