import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useShortcutsDialogStore } from '../../model/shortcuts-dialog.ts'
import ShortcutsDialog from '../ShortcutsDialog.vue'

enableAutoUnmount(afterEach)

// The dialog renders into document.body, outside the wrapper.
const dialog = () => document.querySelector('[role="dialog"]')
const sectionTitles = () =>
  [...(dialog()?.querySelectorAll('h3') ?? [])].map((heading) => heading.textContent)

async function openDialog() {
  const wrapper = mount(ShortcutsDialog, { attachTo: document.body })
  useShortcutsDialogStore().show()
  await flushPromises()
  return wrapper
}

describe('ShortcutsDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is closed until it is shown', async () => {
    mount(ShortcutsDialog, { attachTo: document.body })
    await flushPromises()

    expect(dialog()).toBeNull()
  })

  it('lists one section per area, the Split view first when it is on show', async () => {
    await openDialog()

    expect(sectionTitles()).toEqual([
      'Split view',
      'Track view',
      'Range view',
      'Whole-file view',
      'Track list',
    ])
  })

  it('puts the view on show first: the Range view when a range is shown', async () => {
    useSplitStore().detect(new Float32Array(2000).fill(-10), {
      windowSeconds: 0.05,
      durationSeconds: 100,
    })
    useSplitStore().setRange(10, 20)

    await openDialog()

    expect(sectionTitles().slice(0, 2)).toEqual(['Range view', 'Split view'])
  })

  it('lists the keys and the pointer gestures of an area', async () => {
    await openDialog()

    const text = dialog()?.textContent ?? ''
    // A key, a double-reach drag and a click: the three kinds of input.
    expect(text).toContain('Left / Right')
    expect(text).toContain('Drag across the waveform')
    expect(text).toContain('Click a split’s line')
  })

  it('closes on Escape', async () => {
    await openDialog()

    dialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(useShortcutsDialogStore().isOpen).toBe(false)
    expect(dialog()).toBeNull()
  })

  it('closes on a press outside it', async () => {
    await openDialog()

    const ground = document.querySelector('[data-state="open"]:not([role="dialog"])')
    ground?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()

    expect(useShortcutsDialogStore().isOpen).toBe(false)
  })

  it('closes with its Close button', async () => {
    await openDialog()

    dialog()?.querySelector('button')?.click()
    await flushPromises()

    expect(useShortcutsDialogStore().isOpen).toBe(false)
  })
})
