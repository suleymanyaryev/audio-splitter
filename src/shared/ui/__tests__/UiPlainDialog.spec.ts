import { afterEach, describe, it, expect } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import UiPlainDialog from '../UiPlainDialog.vue'

// The dialog renders into document.body, outside the wrapper.
function dialogElement() {
  return document.querySelector('[role="dialog"]')
}

function textOf(id: string | null | undefined) {
  return id ? document.querySelector(`[id="${CSS.escape(id)}"]`)?.textContent : undefined
}

function mountDialog(isOpen: boolean) {
  return mount(UiPlainDialog, {
    props: { open: isOpen, title: 'Keyboard shortcuts', description: 'Every key and gesture.' },
    slots: { default: '<p>body</p>', actions: '<button>Close</button>' },
    attachTo: document.body,
  })
}

describe('UiPlainDialog', () => {
  let wrapper: ReturnType<typeof mountDialog> | undefined

  afterEach(() => {
    wrapper?.unmount()
  })

  it('renders nothing while closed', async () => {
    wrapper = mountDialog(false)
    await flushPromises()

    expect(dialogElement()).toBeNull()
  })

  it('opens as an ordinary dialog, not an alert dialog, named by its title and described by its description', async () => {
    wrapper = mountDialog(true)
    await flushPromises()

    const dialog = dialogElement()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(textOf(dialog?.getAttribute('aria-labelledby'))).toBe('Keyboard shortcuts')
    expect(textOf(dialog?.getAttribute('aria-describedby'))).toBe('Every key and gesture.')
    expect(dialog?.textContent).toContain('body')
    expect(dialog?.querySelector('button')?.textContent).toBe('Close')
  })

  it('asks to close on Escape', async () => {
    wrapper = mountDialog(true)
    await flushPromises()

    dialogElement()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('asks to close on a press outside it, on the ground', async () => {
    wrapper = mountDialog(true)
    await flushPromises()

    // The ground is the open element that is not the dialog.
    const ground = document.querySelector('[data-state="open"]:not([role="dialog"])')
    expect(ground).not.toBeNull()
    ground?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
