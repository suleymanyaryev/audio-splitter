import { afterEach, describe, it, expect, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { usePageKeys, type KeyHandler } from '../use-page-keys.ts'

enableAutoUnmount(afterEach)

type Options = Parameters<typeof usePageKeys>[1]

function mountListener(isKeyTaken: KeyHandler, options?: Options) {
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null)
      usePageKeys(isKeyTaken, { root: () => root.value, ...options })
      return () =>
        h('div', [
          h('input', { type: 'text' }),
          h('textarea'),
          h('select'),
          h('button', { id: 'outside' }),
          h('div', { id: 'slider', role: 'slider', tabindex: 0 }),
          h('div', { id: 'radio', role: 'radio', tabindex: 0 }),
          h('div', { ref: root, id: 'root' }, [
            h('div', { id: 'own-slider', role: 'slider', tabindex: 0 }),
            h('button', { id: 'own-button' }),
          ]),
        ])
    },
  })
  return mount(Host, { attachTo: document.body })
}

function press(target: Element | Document, key: string, init?: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('usePageKeys', () => {
  it('calls the handler for a key pressed anywhere on the page', () => {
    const handler = vi.fn(() => true)
    const wrapper = mountListener(handler)

    press(wrapper.get('#outside').element, 'a')
    press(document, 'b')

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('keeps the browser from acting, and tells the caller, only when the handler acted', () => {
    const onActed = vi.fn()
    const acts = ref(true)
    mountListener(() => acts.value, { onActed })

    const acted = press(document, 'a')
    acts.value = false
    const ignored = press(document, 'a')

    expect(acted.defaultPrevented).toBe(true)
    expect(ignored.defaultPrevented).toBe(false)
    expect(onActed).toHaveBeenCalledTimes(1)
  })

  it('passes Shift through to the handler', () => {
    const handler = vi.fn(() => true)
    mountListener(handler)

    press(document, 'Enter', { shiftKey: true })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it.each(['ctrlKey', 'metaKey', 'altKey'])('leaves a key with %s to the browser', (modifier) => {
    const handler = vi.fn(() => true)
    mountListener(handler)

    const event = press(document, 'ArrowLeft', { [modifier]: true })

    expect(handler).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it.each(['input', 'textarea', 'select'])(
    'leaves keys to a %s, which takes them as input',
    (tag) => {
      const handler = vi.fn(() => true)
      const wrapper = mountListener(handler)

      press(wrapper.get(tag).element, 'Backspace')

      expect(handler).not.toHaveBeenCalled()
    },
  )

  it('leaves keys to an editable element', () => {
    const handler = vi.fn(() => true)
    mountListener(handler)
    const editable = document.createElement('div')
    // jsdom has no isContentEditable, so the attribute is what the page sets and the check reads.
    editable.contentEditable = 'true'
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    document.body.append(editable)

    press(editable, 'Backspace')
    editable.remove()

    expect(handler).not.toHaveBeenCalled()
  })

  it.each(['dialog', 'alertdialog'])('does nothing while a %s is on the page', (role) => {
    const handler = vi.fn(() => true)
    mountListener(handler)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', role)
    document.body.append(dialog)

    press(document, 'Escape')
    dialog.remove()

    expect(handler).not.toHaveBeenCalled()
  })

  describe('a control the user reached with Tab', () => {
    it.each([' ', 'Enter'])('keeps %s on a focused button, and passes the arrows', (key) => {
      const handler = vi.fn(() => true)
      const wrapper = mountListener(handler)
      const button = wrapper.get<HTMLElement>('#outside').element
      button.focus()

      press(document, key)
      expect(handler).not.toHaveBeenCalled()

      press(document, 'ArrowLeft')
      press(document, 'Home')
      press(document, 'Delete')
      expect(handler).toHaveBeenCalledTimes(3)
    })

    it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])(
      'keeps %s on a focused slider',
      (key) => {
        const handler = vi.fn(() => true)
        const wrapper = mountListener(handler)
        wrapper.get<HTMLElement>('#slider').element.focus()

        press(document, key)

        expect(handler).not.toHaveBeenCalled()
      },
    )

    it('passes Space, Enter and Delete past a focused slider', () => {
      const handler = vi.fn(() => true)
      const wrapper = mountListener(handler)
      wrapper.get<HTMLElement>('#slider').element.focus()

      press(document, ' ')
      press(document, 'Enter')
      press(document, 'Delete')

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('keeps the arrows on a focused radio, and passes Home and Space', () => {
      const handler = vi.fn(() => true)
      const wrapper = mountListener(handler)
      wrapper.get<HTMLElement>('#radio').element.focus()

      press(document, 'ArrowLeft')
      press(document, 'ArrowRight')
      expect(handler).not.toHaveBeenCalled()

      press(document, 'Home')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('reads the control from the target when the key is pressed on it', () => {
      const handler = vi.fn(() => true)
      const wrapper = mountListener(handler)

      press(wrapper.get('#outside').element, ' ')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  it('never treats an element inside the caller’s own root as such a control', () => {
    const handler = vi.fn(() => true)
    const wrapper = mountListener(handler)

    wrapper.get<HTMLElement>('#own-slider').element.focus()
    press(document, 'ArrowLeft')
    wrapper.get<HTMLElement>('#own-button').element.focus()
    press(document, ' ')

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('stops listening when the caller goes away', () => {
    const handler = vi.fn(() => true)
    const wrapper = mountListener(handler)

    wrapper.unmount()
    press(document, 'a')

    expect(handler).not.toHaveBeenCalled()
  })
})
