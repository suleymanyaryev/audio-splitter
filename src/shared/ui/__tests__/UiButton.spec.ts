import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import UiButton from '../UiButton.vue'

describe('UiButton', () => {
  it('is a plain button, so it never submits a surrounding form', () => {
    const wrapper = mount(UiButton, { slots: { default: 'Add split' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Add split')
  })

  it('passes native attributes such as disabled through', () => {
    const wrapper = mount(UiButton, { attrs: { disabled: true }, slots: { default: 'Export' } })

    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  describe('focus', () => {
    it('is not taken by a mouse press, so the next key goes to the view on show', () => {
      const wrapper = mount(UiButton, { slots: { default: 'Play' }, attachTo: document.body })

      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(press)

      // The browser moves the focus on the default action of a mouse press, and only then.
      expect(press.defaultPrevented).toBe(true)
      wrapper.unmount()
    })

    it('lets go of a text field being edited when pressed', () => {
      const wrapper = mount(UiButton, { slots: { default: 'Play' }, attachTo: document.body })
      const field = document.createElement('input')
      document.body.append(field)
      field.focus()

      wrapper.element.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      )

      expect(document.activeElement).not.toBe(field)
      field.remove()
      wrapper.unmount()
    })

    it('is taken by Tab, with its ring and its native keys', async () => {
      const onClick = vi.fn()
      const wrapper = mount(UiButton, {
        attrs: { onClick },
        slots: { default: 'Play' },
        attachTo: document.body,
      })

      wrapper.element.focus()
      const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(space)
      wrapper.element.dispatchEvent(enter)
      await wrapper.trigger('click')

      expect(document.activeElement).toBe(wrapper.element)
      expect(wrapper.classes()).toContain('focus-visible:focus-ring')
      expect(space.defaultPrevented).toBe(false)
      expect(enter.defaultPrevented).toBe(false)
      expect(onClick).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })
  })
})
