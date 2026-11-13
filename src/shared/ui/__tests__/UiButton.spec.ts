import { describe, it, expect } from 'vitest'

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
})
