import { describe, it, expect } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import UiSegmentedControl from '../UiSegmentedControl.vue'

interface Option {
  value: string
  label: string
  disabled?: boolean
}

const OPTIONS: Option[] = [
  { value: 'split', label: 'Split' },
  { value: 'range', label: 'Range' },
]

function mountControl(modelValue: string, options = OPTIONS) {
  return mount(UiSegmentedControl, { props: { label: 'Panel view', options, modelValue } })
}

function radio(wrapper: ReturnType<typeof mountControl>, name: string) {
  const found = wrapper.findAll('[role="radio"]').find((candidate) => candidate.text() === name)
  if (!found) throw new Error(`no option ${name}`)
  return found
}

describe('UiSegmentedControl', () => {
  it('is a radio group named by its label, with one radio for each option', () => {
    const wrapper = mountControl('split')

    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('Panel view')
    expect(wrapper.findAll('[role="radio"]').map((option) => option.text())).toEqual([
      'Split',
      'Range',
    ])
  })

  it('marks the chosen option', () => {
    const wrapper = mountControl('range')

    expect(radio(wrapper, 'Range').attributes('aria-checked')).toBe('true')
    expect(radio(wrapper, 'Split').attributes('aria-checked')).toBe('false')
  })

  it('chooses another option when it is clicked', async () => {
    const wrapper = mountControl('split')

    await radio(wrapper, 'Range').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['range']])
  })

  it('keeps its choice when the chosen option is clicked again', async () => {
    const wrapper = mountControl('split')

    await radio(wrapper, 'Split').trigger('click')

    expect(wrapper.emitted('update:modelValue') ?? []).toEqual([])
  })

  it('cannot choose a disabled option', async () => {
    const wrapper = mountControl('split', [
      { value: 'split', label: 'Split' },
      { value: 'range', label: 'Range', disabled: true },
    ])

    await radio(wrapper, 'Range').trigger('click')

    expect(radio(wrapper, 'Range').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('update:modelValue') ?? []).toEqual([])
  })

  describe('focus', () => {
    it('is not taken by a mouse press on an option, so the next key goes to the view on show', () => {
      const wrapper = mountControl('split')

      const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      radio(wrapper, 'Range').element.dispatchEvent(press)

      expect(press.defaultPrevented).toBe(true)
    })

    it('is taken by Tab, with its ring, and the group still handles the arrows', async () => {
      const wrapper = mount(UiSegmentedControl, {
        props: { label: 'Panel view', options: OPTIONS, modelValue: 'split' },
        attachTo: document.body,
      })
      await flushPromises()
      const chosen = radio(wrapper, 'Split')

      if (chosen.element instanceof HTMLElement) chosen.element.focus()
      const arrow = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
      chosen.element.dispatchEvent(arrow)

      expect(document.activeElement).toBe(chosen.element)
      expect(chosen.classes()).toContain('focus-visible:focus-ring')
      // The group's own key handling took the arrow, so the page does not.
      expect(arrow.defaultPrevented).toBe(true)
      wrapper.unmount()
    })
  })
})
