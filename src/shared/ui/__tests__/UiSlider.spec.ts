import { describe, it, expect } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import UiSlider from '../UiSlider.vue'

function mountSlider(extra: { compact?: boolean } = {}) {
  return mount(UiSlider, {
    props: {
      modelValue: 1,
      label: 'Minimum gap length',
      readout: '1.0 s',
      min: 0.2,
      max: 5,
      step: 0.1,
      ...extra,
    },
    attachTo: document.body,
  })
}

describe('UiSlider', () => {
  it('puts the slider role, name and value on the thumb', async () => {
    const wrapper = mountSlider()
    // Reka finds the thumb's place among the slider's thumbs after mounting.
    await flushPromises()

    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-label')).toBe('Minimum gap length')
    expect(thumb.attributes('aria-valuenow')).toBe('1')
    expect(thumb.attributes('aria-valuemin')).toBe('0.2')
    expect(thumb.attributes('aria-valuemax')).toBe('5')
    wrapper.unmount()
  })

  it('reads its value out as the readout, so a screen reader hears "1.0 s" and not "1"', async () => {
    const wrapper = mountSlider()
    await flushPromises()

    expect(wrapper.get('[role="slider"]').attributes('aria-valuetext')).toBe('1.0 s')
    wrapper.unmount()
  })

  it('shows the setting name and the readout', () => {
    const wrapper = mountSlider()

    expect(wrapper.text()).toContain('Minimum gap length')
    expect(wrapper.text()).toContain('1.0 s')
    wrapper.unmount()
  })

  it('reports a keyboard step as a single number', async () => {
    const wrapper = mountSlider()

    await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight' })

    expect(wrapper.emitted('update:modelValue')).toEqual([[1.1]])
    wrapper.unmount()
  })

  describe('compact, for a title row', () => {
    it('leaves the name and the readout to the thumb, for a screen reader', async () => {
      const wrapper = mountSlider({ compact: true })
      await flushPromises()

      expect(wrapper.text()).toBe('')
      const thumb = wrapper.get('[role="slider"]')
      expect(thumb.attributes('aria-label')).toBe('Minimum gap length')
      expect(thumb.attributes('aria-valuetext')).toBe('1.0 s')
      wrapper.unmount()
    })
  })
})
