import { afterEach, describe, it, expect, vi } from 'vitest'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import UiIconButton from '../UiIconButton.vue'

enableAutoUnmount(afterEach)

function tooltipText() {
  return document.querySelector('[role="tooltip"]')?.textContent
}

describe('UiIconButton', () => {
  it('is a plain button named by its label, since the icon has no text', () => {
    const wrapper = mount(UiIconButton, {
      props: { label: 'Delete split 3' },
      slots: { default: '<svg />' },
    })

    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('Delete split 3')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('shows its label as a tooltip when focused', async () => {
    const wrapper = mount(UiIconButton, {
      props: { label: 'Delete split 3' },
      slots: { default: '<svg />' },
      attachTo: document.body,
    })

    await wrapper.get('button').trigger('focus')

    expect(tooltipText()).toBe('Delete split 3')
  })

  it('adds its key to the tooltip, and keeps its accessible name to the label alone', async () => {
    const wrapper = mount(UiIconButton, {
      props: { label: 'Add split', hint: 'Enter' },
      slots: { default: '<svg />' },
      attachTo: document.body,
    })

    await wrapper.get('button').trigger('focus')

    expect(tooltipText()).toBe('Add split (Enter)')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Add split')
  })

  it('passes the caller’s click to the button', async () => {
    const onClick = vi.fn()
    const wrapper = mount(UiIconButton, {
      props: { label: 'Play' },
      attrs: { onClick },
      slots: { default: '<svg />' },
    })

    await wrapper.get('button').trigger('click')

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('passes the caller’s disabled to the button', () => {
    const wrapper = mount(UiIconButton, {
      props: { label: 'Play' },
      attrs: { disabled: true },
      slots: { default: '<svg />' },
    })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
