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

// jsdom has no pointer capture, which Reka asks for when a drag starts.
function stubPointerCapture() {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => true
  Element.prototype.releasePointerCapture = () => {}
}

// jsdom has no PointerEvent: a mouse event of that name, with the pointer's id.
function pointer(type: string) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  return event
}

function focusElement(element: Element) {
  if (element instanceof HTMLElement) element.focus()
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

  describe('focus', () => {
    /*
    Not even while the drag goes on: a dialog the drag opens (the replace-your-edits question) would
    remember the thumb and give it the focus back when it closes.
    */
    it('is never on the thumb during a pointer drag, so the next key goes to the view on show', async () => {
      stubPointerCapture()
      const wrapper = mountSlider()
      await flushPromises()
      const track = wrapper.get('[data-orientation]')
      const thumb = wrapper.get('[role="slider"]').element

      track.element.dispatchEvent(pointer('pointerdown'))
      await flushPromises()
      expect(document.activeElement).not.toBe(thumb)

      track.element.dispatchEvent(pointer('pointermove'))
      await flushPromises()
      expect(document.activeElement).not.toBe(thumb)

      track.element.dispatchEvent(pointer('pointerup'))
      await flushPromises()
      expect(document.activeElement).not.toBe(thumb)
      wrapper.unmount()
    })

    it('can be taken by the thumb with Tab after a pointer drag has ended', async () => {
      stubPointerCapture()
      const wrapper = mountSlider()
      await flushPromises()
      const track = wrapper.get('[data-orientation]')
      track.element.dispatchEvent(pointer('pointerdown'))
      track.element.dispatchEvent(pointer('pointerup'))
      await flushPromises()
      const thumb = wrapper.get('[role="slider"]').element

      focusElement(thumb)

      expect(document.activeElement).toBe(thumb)
      wrapper.unmount()
    })

    it('is kept by a thumb reached with Tab, which keeps its native keys and its ring', async () => {
      const wrapper = mountSlider()
      await flushPromises()
      const thumb = wrapper.get('[role="slider"]')

      focusElement(thumb.element)
      await thumb.trigger('keydown', { key: 'ArrowRight' })

      expect(document.activeElement).toBe(thumb.element)
      expect(thumb.classes()).toContain('focus-visible:focus-ring')
      expect(wrapper.emitted('update:modelValue')).toEqual([[1.1]])
      wrapper.unmount()
    })
  })
})
