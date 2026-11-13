import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import UiTextField from '../UiTextField.vue'

describe('UiTextField', () => {
  it('reports what the user types through v-model', async () => {
    const wrapper = mount(UiTextField, { props: { modelValue: '03' } })

    const input = wrapper.get('input')
    expect(input.element.value).toBe('03')
    await input.setValue('Sunrise Drive')

    expect(wrapper.emitted('update:modelValue')).toEqual([['Sunrise Drive']])
  })

  it('puts native attributes on the input, not on its wrapper', () => {
    const wrapper = mount(UiTextField, {
      props: { modelValue: '', variant: 'inline' },
      attrs: { 'aria-label': 'Name of track 3', maxlength: 100 },
    })

    const input = wrapper.get('input')
    expect(input.attributes('aria-label')).toBe('Name of track 3')
    expect(input.attributes('maxlength')).toBe('100')
  })

  it('marks the field invalid and links it to the message', () => {
    const wrapper = mount(UiTextField, { props: { modelValue: '', error: 'Enter a name.' } })

    const input = wrapper.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    const messageId = input.attributes('aria-describedby')
    expect(wrapper.get(`[id="${messageId}"]`).text()).toBe('Enter a name.')
  })

  it('is not invalid without a message', () => {
    const wrapper = mount(UiTextField, { props: { modelValue: '' } })

    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
  })
})
