import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import UiTooltip from '../UiTooltip.vue'

enableAutoUnmount(afterEach)

// The tooltip renders into document.body, outside the wrapper. Reka keeps the same text in a
// visually hidden `role="tooltip"` element, which the trigger's `aria-describedby` points at.
function tooltipText() {
  return document.querySelector('[role="tooltip"]')?.textContent
}

function mountTooltip(hint?: string) {
  return mount(UiTooltip, {
    props: { label: 'Add split', hint },
    slots: { default: '<button type="button">+</button>' },
    attachTo: document.body,
  })
}

describe('UiTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows nothing until the trigger is hovered or focused', async () => {
    mountTooltip()
    await flushPromises()

    expect(tooltipText()).toBeUndefined()
  })

  it('opens on hover, after a short delay', async () => {
    const wrapper = mountTooltip()

    await wrapper.get('button').trigger('pointermove')
    expect(tooltipText()).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1000)

    expect(tooltipText()).toBe('Add split')
  })

  it('opens at once on keyboard focus, and closes on blur', async () => {
    const wrapper = mountTooltip()

    await wrapper.get('button').trigger('focus')
    expect(tooltipText()).toBe('Add split')

    await wrapper.get('button').trigger('blur')
    await vi.advanceTimersByTimeAsync(1000)

    expect(tooltipText()).toBeUndefined()
  })

  it('closes on Escape', async () => {
    const wrapper = mountTooltip()
    await wrapper.get('button').trigger('focus')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await vi.advanceTimersByTimeAsync(1000)

    expect(tooltipText()).toBeUndefined()
  })

  it('says its key after the label, in brackets', async () => {
    const wrapper = mountTooltip('Enter')

    await wrapper.get('button').trigger('focus')

    expect(tooltipText()).toBe('Add split (Enter)')
  })
})
