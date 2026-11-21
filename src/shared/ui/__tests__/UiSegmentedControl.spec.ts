import { afterEach, describe, it, expect } from 'vitest'
import { h, type Component } from 'vue'

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import UiSegmentedControl from '../UiSegmentedControl.vue'

enableAutoUnmount(afterEach)

const Dot = () => h('svg', { 'data-icon': '' })

interface Option {
  value: string
  label: string
  disabled?: boolean
  icon?: Component
}

const OPTIONS: Option[] = [
  { value: 'split', label: 'Split' },
  { value: 'range', label: 'Range' },
]

function mountControl(modelValue: string, options = OPTIONS, variant?: 'inverse') {
  return mount(UiSegmentedControl, {
    props: { label: 'Panel view', options, modelValue, variant },
  })
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

  it('shows the chosen option by its aria-checked, which the tooltip around it cannot overwrite', () => {
    const option = radio(mountControl('split'), 'Split')

    expect(option.classes()).toContain('aria-checked:border-ink')
    expect(option.classes().some((name) => name.startsWith('data-[state='))).toBe(false)
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

  describe('inverse variant', () => {
    it('takes the header band classes instead of the panel ones', () => {
      const plain = mountControl('split')
      const inverse = mountControl('split', OPTIONS, 'inverse')

      expect(plain.get('[role="radiogroup"]').classes()).toContain('bg-surface')
      expect(inverse.get('[role="radiogroup"]').classes()).toContain('border-vinyl-edge')
      expect(inverse.get('[role="radiogroup"]').classes()).not.toContain('bg-surface')
      expect(radio(inverse, 'Split').classes()).toContain('text-on-vinyl')
      expect(radio(inverse, 'Split').classes()).not.toContain('text-ink')
    })

    it('spells its focus ring out in the band ink', () => {
      const option = radio(mountControl('split', OPTIONS, 'inverse'), 'Split')

      expect(option.classes()).toContain('focus-visible:outline-on-vinyl')
      expect(option.classes()).not.toContain('focus-visible:focus-ring')
    })
  })

  describe('icons', () => {
    const ICON_OPTIONS: Option[] = [
      { value: 'system', label: 'System', icon: Dot },
      { value: 'light', label: 'Light', icon: Dot },
    ]

    function mountIcons() {
      return mount(UiSegmentedControl, {
        props: { label: 'Theme', options: ICON_OPTIONS, modelValue: 'system' },
        attachTo: document.body,
      })
    }

    function lightRadio(wrapper: ReturnType<typeof mountIcons>) {
      const found = wrapper
        .findAll('[role="radio"]')
        .find((candidate) => candidate.attributes('aria-label') === 'Light')
      if (!found) throw new Error('no Light option')
      return found
    }

    it('draws the icon and no text, and names the option by its label', () => {
      const wrapper = mountIcons()

      const light = lightRadio(wrapper)
      expect(light.find('svg[data-icon]').exists()).toBe(true)
      expect(light.text()).toBe('')
      expect(wrapper.findAll('[role="radio"]')).toHaveLength(2)
    })

    it('says the label in a tooltip on focus', async () => {
      const wrapper = mountIcons()

      await lightRadio(wrapper).trigger('focus')

      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Light')
    })

    it('still chooses an option when its icon is clicked', async () => {
      const wrapper = mountIcons()

      await lightRadio(wrapper).trigger('click')

      expect(wrapper.emitted('update:modelValue')).toEqual([['light']])
    })

    it('gives an option without an icon no tooltip', async () => {
      const wrapper = mount(UiSegmentedControl, {
        props: { label: 'Panel view', options: OPTIONS, modelValue: 'split' },
        attachTo: document.body,
      })

      await radio(wrapper, 'Range').trigger('focus')

      expect(document.querySelector('[role="tooltip"]')).toBeNull()
    })
  })
})
