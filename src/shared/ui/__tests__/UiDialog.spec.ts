import { describe, it, expect, afterEach } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import UiDialog from '../UiDialog.vue'

// The dialog renders into document.body, outside the wrapper.
function dialogElement() {
  return document.querySelector('[role="alertdialog"]')
}

function textOf(id: string | null | undefined) {
  return id ? document.querySelector(`[id="${CSS.escape(id)}"]`)?.textContent : undefined
}

function mountDialog(isOpen: boolean) {
  return mount(UiDialog, {
    props: {
      open: isOpen,
      title: 'Replace your edits?',
      description: 'This replaces your 4 edits with freshly detected splits.',
    },
    slots: {
      default: '<p>body</p>',
      actions: '<button>Cancel</button><button>Replace edits</button>',
    },
    attachTo: document.body,
  })
}

describe('UiDialog', () => {
  let wrapper: ReturnType<typeof mountDialog> | undefined

  afterEach(() => {
    wrapper?.unmount()
  })

  it('renders nothing while closed', async () => {
    wrapper = mountDialog(false)
    await flushPromises()

    expect(dialogElement()).toBeNull()
  })

  it('opens as an alert dialog named by its title and described by its description', async () => {
    wrapper = mountDialog(true)
    await flushPromises()

    const dialog = dialogElement()
    expect(textOf(dialog?.getAttribute('aria-labelledby'))).toBe('Replace your edits?')
    expect(textOf(dialog?.getAttribute('aria-describedby'))).toBe(
      'This replaces your 4 edits with freshly detected splits.',
    )
    expect(dialog?.textContent).toContain('body')
    expect([...(dialog?.querySelectorAll('button') ?? [])].map((b) => b.textContent)).toEqual([
      'Cancel',
      'Replace edits',
    ])
  })

  it('asks to close on Escape', async () => {
    wrapper = mountDialog(true)
    await flushPromises()

    dialogElement()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
