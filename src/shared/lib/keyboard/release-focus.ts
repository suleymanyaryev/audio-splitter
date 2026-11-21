import { DIALOG_SELECTOR } from './use-page-keys.ts'

/*
The handler of a control's `mousedown`: the press neither focuses the control nor leaves the focus
where it was, so the next key goes to the view on show. Stopping the press's default action keeps the
browser from moving the focus to the control, and letting go of what had it (a track name being
edited) is what a click anywhere else does. A control reached with Tab is not affected: this runs
on a mouse press only. Inside a dialog the press is left alone: no key reaches the view while a
dialog is open, and the focus must stay in the dialog.
*/
export function releaseFocus(event: MouseEvent) {
  const isInDialog =
    event.currentTarget instanceof Element && event.currentTarget.closest(DIALOG_SELECTOR) !== null
  if (isInDialog) return
  event.preventDefault()
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
}
