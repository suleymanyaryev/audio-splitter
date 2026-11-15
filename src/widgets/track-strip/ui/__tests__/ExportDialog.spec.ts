import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { flushPromises, mount } from '@vue/test-utils'
import { useExportTracksStore } from '../../model/export-tracks.ts'
import ExportDialog from '../ExportDialog.vue'

// The dialog renders into document.body, outside the wrapper.
const dialog = () => document.querySelector('[role="alertdialog"]')

function buttonNamed(name: string) {
  const button = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent.trim() === name,
  )
  if (!button) throw new Error(`no ${name} button`)
  return button
}

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

describe('ExportDialog', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  async function mountWith(state: Partial<ReturnType<typeof useExportTracksStore>>) {
    const exporter = useExportTracksStore()
    Object.assign(exporter, state)
    wrapper = mount(ExportDialog, { attachTo: document.body })
    await flushPromises()
    return exporter
  }

  it('shows nothing while no export is going', async () => {
    await mountWith({ status: 'idle' })

    expect(dialog()).toBeNull()
  })

  describe('while the export runs', () => {
    const running = {
      status: 'running',
      trackNumber: 3,
      trackCount: 8,
      savedCount: 2,
      folderName: 'evening-set-vol3',
    } as const

    it('shows the folder, "Track 3 of 8" on a bar, and Cancel', async () => {
      await mountWith(running)

      expect(dialog()?.textContent).toContain('Saving to evening-set-vol3/')
      expect(dialog()?.textContent).toContain('Track 3 of 8')
      expect(dialog()?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe(
        '2',
      )
      expect(buttonNamed('Cancel')).toBeDefined()
      expect(() => buttonNamed('Close')).toThrow()
    })

    it('names no folder before the subfolder exists', async () => {
      await mountWith({ ...running, folderName: null })

      expect(dialog()?.textContent).not.toContain('Saving to')
      expect(dialog()?.textContent).not.toContain('Choosing')
      expect(dialog()?.textContent).toContain('Track 3 of 8')
    })

    it('cancels the export when Cancel is pressed', async () => {
      const exporter = await mountWith(running)
      const cancel = vi.spyOn(exporter, 'cancel').mockImplementation(() => {})

      buttonNamed('Cancel').click()

      expect(cancel).toHaveBeenCalledTimes(1)
    })

    it('stays open when Escape is pressed', async () => {
      const exporter = await mountWith(running)

      pressEscape()
      await flushPromises()

      expect(dialog()).not.toBeNull()
      expect(exporter.status).toBe('running')
    })
  })

  describe('when the export is over', () => {
    it('shows how many tracks were saved and where, and closes with Close', async () => {
      const exporter = await mountWith({
        status: 'done',
        savedCount: 8,
        trackCount: 8,
        folderName: 'evening-set-vol3',
      })

      expect(dialog()?.textContent).toContain('8 tracks saved to evening-set-vol3/')
      expect(dialog()?.querySelector('[role="progressbar"]')).toBeNull()
      expect(() => buttonNamed('Cancel')).toThrow()

      buttonNamed('Close').click()
      await flushPromises()

      expect(exporter.status).toBe('idle')
      expect(dialog()).toBeNull()
    })

    it('names the track that failed', async () => {
      await mountWith({
        status: 'failed',
        savedCount: 2,
        trackCount: 8,
        folderName: 'evening-set-vol3',
        failure: { track: { number: 3, name: null }, message: 'Invalid data' },
      })

      expect(dialog()?.textContent).toContain('Export failed')
      expect(dialog()?.textContent).toContain('Track 3 failed: Invalid data')
    })

    it('says a cancelled export was cancelled', async () => {
      await mountWith({
        status: 'cancelled',
        savedCount: 1,
        trackCount: 8,
        folderName: 'evening-set-vol3',
      })

      expect(dialog()?.textContent).toContain('Export cancelled. 1 of 8 tracks saved')
    })

    it('closes on Escape', async () => {
      const exporter = await mountWith({
        status: 'done',
        savedCount: 8,
        trackCount: 8,
        folderName: 'evening-set-vol3',
      })

      pressEscape()
      await flushPromises()

      expect(exporter.status).toBe('idle')
    })
  })
})
