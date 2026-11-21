import { afterEach, describe, it, expect } from 'vitest'

import { releaseFocus } from '../release-focus.ts'

afterEach(() => {
  document.body.replaceChildren()
})

function press() {
  return new MouseEvent('mousedown', { bubbles: true, cancelable: true })
}

describe('releaseFocus', () => {
  it('keeps the browser from moving the focus to the control', () => {
    const event = press()

    releaseFocus(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('lets go of what has the focus, such as a name being edited', () => {
    const field = document.createElement('input')
    document.body.append(field)
    field.focus()
    expect(document.activeElement).toBe(field)

    releaseFocus(press())

    expect(document.activeElement).toBe(document.body)
  })

  it('leaves a press inside a dialog alone, so the focus stays in the dialog', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'alertdialog')
    const field = document.createElement('input')
    const button = document.createElement('button')
    dialog.append(field, button)
    document.body.append(dialog)
    field.focus()
    button.addEventListener('mousedown', releaseFocus)
    const event = press()

    button.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(field)
  })

  it('does nothing when nothing has the focus', () => {
    releaseFocus(press())

    expect(document.activeElement).toBe(document.body)
  })
})
