import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import UiIconButton from '../UiIconButton.vue'

describe('UiIconButton', () => {
  it('is a plain button named by its label, since the icon has no text', () => {
    const wrapper = mount(UiIconButton, {
      props: { label: 'Delete split 3' },
      slots: { default: '<svg />' },
    })

    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.attributes('aria-label')).toBe('Delete split 3')
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
