import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { flushPromises, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useExportSingleStore } from '../../model/export-single.ts'
import SingleExportDialog from '../SingleExportDialog.vue'

// The dialog renders into document.body, outside the wrapper.
const dialog = () => document.querySelector('[role="dialog"]')
const field = () => dialog()?.querySelector('input') as HTMLInputElement

function buttonNamed(name: string) {
  const button = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent.trim() === name,
  )
  if (!button) throw new Error(`no ${name} button`)
  return button
}

async function type(text: string) {
  field().value = text
  field().dispatchEvent(new Event('input'))
  await flushPromises()
}

function pressEnter() {
  field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

describe('SingleExportDialog', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  async function mountWith(state: Partial<ReturnType<typeof useExportSingleStore>>) {
    const exporter = useExportSingleStore()
    Object.assign(exporter, state)
    wrapper = mount(SingleExportDialog, { attachTo: document.body })
    await flushPromises()
    return exporter
  }

  const naming = { status: 'naming', defaultName: 'Evening Set 02' } as const

  it('shows nothing while idle or showing a saved file', async () => {
    await mountWith({ status: 'saved', savedFile: '02.m4a', savedFolderName: 'Music' })

    expect(dialog()).toBeNull()
  })

  describe('naming', () => {
    it('opens with the default name in the field, and the track’s title', async () => {
      await mountWith(naming)

      expect(field().value).toBe('Evening Set 02')
      expect(dialog()?.textContent).toContain('Export track')
      expect(field().getAttribute('maxlength')).toBe('100')
    })

    it('titles a range’s dialog', async () => {
      // `subject` is the store's own, set by opening a range.
      useSourceFileStore().file = new File([], 'Evening Set.m4a')
      const exporter = useExportSingleStore()
      exporter.openRange({ startSeconds: 10, endSeconds: 40 })
      wrapper = mount(SingleExportDialog, { attachTo: document.body })
      await flushPromises()

      expect(dialog()?.textContent).toContain('Export range')
    })

    it('says a folder is chosen on confirming when none is remembered', async () => {
      await mountWith(naming)

      expect(dialog()?.textContent).toContain('You choose a folder when you confirm')
      expect(() => buttonNamed('Change folder')).toThrow()
    })

    it('names the remembered folder, with "Change folder"', async () => {
      const exporter = await mountWith({ ...naming, folderName: 'Music' })
      const changeFolder = vi.spyOn(exporter, 'changeFolder').mockResolvedValue()

      expect(dialog()?.textContent).toContain('Saves into Music')
      buttonNamed('Change folder').click()

      expect(changeFolder).toHaveBeenCalledOnce()
    })

    it('confirms the typed name with OK', async () => {
      await mountWith(naming)
      await type('Chorus')

      buttonNamed('OK').click()

      expect(wrapper?.emitted('confirm')).toEqual([['Chorus']])
    })

    it('confirms with Enter in the field', async () => {
      await mountWith(naming)

      pressEnter()

      expect(wrapper?.emitted('confirm')).toEqual([['Evening Set 02']])
    })

    it('has OK off, and Enter doing nothing, while the name is empty', async () => {
      await mountWith(naming)
      await type(' '.repeat(3))

      expect(buttonNamed('OK').disabled).toBe(true)
      pressEnter()
      buttonNamed('OK').click()

      expect(wrapper?.emitted('confirm')).toBeUndefined()
    })

    it('closes with Cancel and with Escape, and keeps no name for the next time', async () => {
      const exporter = await mountWith(naming)
      await type('Half typed')

      buttonNamed('Cancel').click()
      await flushPromises()
      expect(exporter.status).toBe('idle')
      expect(dialog()).toBeNull()

      exporter.status = 'naming'
      await flushPromises()
      expect(field().value).toBe('Evening Set 02')

      pressEscape()
      await flushPromises()
      expect(exporter.status).toBe('idle')
    })
  })

  describe('running', () => {
    it('says what it is doing, with Cancel and no field', async () => {
      const exporter = await mountWith({ ...naming, status: 'running' })
      const cancel = vi.spyOn(exporter, 'cancel').mockImplementation(() => {})

      expect(dialog()?.textContent).toContain('Cutting and saving')
      expect(dialog()?.querySelector('input')).toBeNull()
      expect(() => buttonNamed('OK')).toThrow()

      buttonNamed('Cancel').click()
      expect(cancel).toHaveBeenCalledOnce()
    })

    it('stays open on Escape', async () => {
      const exporter = await mountWith({ ...naming, status: 'running' })

      pressEscape()
      await flushPromises()

      expect(dialog()).not.toBeNull()
      expect(exporter.status).toBe('running')
    })
  })

  describe('failed', () => {
    it('shows the reason with the name still there, to confirm again', async () => {
      await mountWith({ ...naming, status: 'failed', failure: 'Disk full' })

      expect(dialog()?.textContent).toContain('Export failed: Disk full')
      expect(field().value).toBe('Evening Set 02')

      buttonNamed('OK').click()
      expect(wrapper?.emitted('confirm')).toEqual([['Evening Set 02']])
    })
  })
})
