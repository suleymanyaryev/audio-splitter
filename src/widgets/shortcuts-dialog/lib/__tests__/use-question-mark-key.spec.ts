import { afterEach, describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useQuestionMarkKey } from '../use-question-mark-key.ts'

enableAutoUnmount(afterEach)

const renderFields = () => h('div', [h('input', { type: 'text' }), h('textarea'), h('button')])

function mountListener(onPress: () => void) {
  const Host = defineComponent({
    setup() {
      useQuestionMarkKey(onPress)
      return renderFields
    },
  })
  return mount(Host, { attachTo: document.body })
}

function press(target: Element | Document, init?: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { key: '?', bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('useQuestionMarkKey', () => {
  it('calls back on ? pressed anywhere on the page, and keeps the browser from acting on it', () => {
    const onPress = vi.fn()
    const wrapper = mountListener(onPress)

    const event = press(wrapper.get('button').element)

    expect(onPress).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores every other key', () => {
    const onPress = vi.fn()
    mountListener(onPress)

    press(document, { key: '/' })
    press(document, { key: 'h' })

    expect(onPress).not.toHaveBeenCalled()
  })

  it('leaves ? to a text field, which types a question mark', () => {
    const onPress = vi.fn()
    const wrapper = mountListener(onPress)

    const event = press(wrapper.get('input').element)
    press(wrapper.get('textarea').element)

    expect(onPress).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('leaves ? to an editable element', () => {
    const onPress = vi.fn()
    mountListener(onPress)
    const editable = document.createElement('div')
    // jsdom has no isContentEditable, so the attribute is what the page sets and the check reads.
    editable.contentEditable = 'true'
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    document.body.append(editable)

    press(editable)
    editable.remove()

    expect(onPress).not.toHaveBeenCalled()
  })

  it('ignores ? with Ctrl, Cmd or Alt held, which belong to the browser', () => {
    const onPress = vi.fn()
    mountListener(onPress)

    press(document, { key: '?', ctrlKey: true })
    press(document, { key: '?', metaKey: true })
    press(document, { key: '?', altKey: true })

    expect(onPress).not.toHaveBeenCalled()
  })

  it('ignores ? while a dialog is open, so one dialog never opens over another', () => {
    const onPress = vi.fn()
    mountListener(onPress)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'alertdialog')
    document.body.append(dialog)

    press(document)
    dialog.remove()

    expect(onPress).not.toHaveBeenCalled()
  })

  it('stops listening when the page goes away', () => {
    const onPress = vi.fn()
    const wrapper = mountListener(onPress)

    wrapper.unmount()
    press(document)

    expect(onPress).not.toHaveBeenCalled()
  })
})
