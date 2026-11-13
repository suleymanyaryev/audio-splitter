import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import UiProgressBar from '../UiProgressBar.vue'

describe('UiProgressBar', () => {
  it('is a progress bar with its value, named by the visible count', () => {
    const wrapper = mount(UiProgressBar, {
      props: { value: 38, max: 62, label: '38 / 62 slices', running: true },
    })

    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('38')
    expect(bar.attributes('aria-valuemax')).toBe('62')
    const labelId = bar.attributes('aria-labelledby')
    expect(wrapper.get(`[id="${labelId}"]`).text()).toBe('38 / 62 slices')
  })
})
