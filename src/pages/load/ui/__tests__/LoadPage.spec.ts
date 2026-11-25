import { beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import LoadPage from '../LoadPage.vue'

const file = new File(['x'], 'evening-set-vol3.m4a')

function buttons(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').map((button) => button.text())
}

describe('LoadPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('offers audio and video files in the file dialog', () => {
    const wrapper = mount(LoadPage)

    expect(wrapper.get('input[type="file"]').attributes('accept')?.split(',')).toEqual([
      '.m4a',
      '.mp4',
      '.m4v',
      '.mov',
      '.mp3',
      '.opus',
      '.webm',
      '.mkv',
    ])
  })

  describe('while loading', () => {
    it('shows only a status line until the probe has set the slice total', () => {
      const sourceFile = useSourceFileStore()
      sourceFile.file = file
      sourceFile.status = 'loading'

      const wrapper = mount(LoadPage)

      expect(wrapper.get('[role="status"]').text()).toBe('Reading evening-set-vol3.m4a…')
      expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
    })

    it('counts the slices in a progress bar labelled "38 / 62 slices"', () => {
      const sourceFile = useSourceFileStore()
      sourceFile.file = file
      sourceFile.status = 'loading'
      sourceFile.sliceTotal = 62
      sourceFile.slicesDone = 38

      const wrapper = mount(LoadPage)

      const bar = wrapper.get('[role="progressbar"]')
      expect(bar.attributes('aria-valuenow')).toBe('38')
      expect(bar.attributes('aria-valuemax')).toBe('62')
      const labelId = bar.attributes('aria-labelledby')
      expect(wrapper.get(`[id="${labelId}"]`).text()).toBe('38 / 62 slices')
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    describe('while the ffmpeg core downloads', () => {
      it('shows a progress bar labelled "Downloading ffmpeg… 38%", announced as a status', () => {
        const sourceFile = useSourceFileStore()
        sourceFile.file = file
        sourceFile.status = 'loading'
        sourceFile.downloadFraction = 0.38

        const wrapper = mount(LoadPage)

        const bar = wrapper.get('[role="status"] [role="progressbar"]')
        expect(bar.attributes('aria-valuenow')).toBe('38')
        expect(bar.attributes('aria-valuemax')).toBe('100')
        const labelId = bar.attributes('aria-labelledby')
        expect(wrapper.get(`[id="${labelId}"]`).text()).toBe('Downloading ffmpeg… 38%')
        expect(wrapper.text()).not.toContain('Reading')
      })

      it('rounds the percentage, and starts from 0%', async () => {
        const sourceFile = useSourceFileStore()
        sourceFile.file = file
        sourceFile.status = 'loading'
        sourceFile.downloadFraction = 0

        const wrapper = mount(LoadPage)
        expect(wrapper.text()).toContain('Downloading ffmpeg… 0%')

        sourceFile.downloadFraction = 0.4249
        await wrapper.vm.$nextTick()
        expect(wrapper.text()).toContain('Downloading ffmpeg… 42%')
      })

      it('goes on to "Reading <file>…" when the download is done', async () => {
        const sourceFile = useSourceFileStore()
        sourceFile.file = file
        sourceFile.status = 'loading'
        sourceFile.downloadFraction = 0.99

        const wrapper = mount(LoadPage)
        sourceFile.downloadFraction = null
        await wrapper.vm.$nextTick()

        expect(wrapper.get('[role="status"]').text()).toBe('Reading evening-set-vol3.m4a…')
        expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
      })

      it('still offers Cancel', () => {
        const sourceFile = useSourceFileStore()
        sourceFile.file = file
        sourceFile.status = 'loading'
        sourceFile.downloadFraction = 0.38

        expect(buttons(mount(LoadPage))).toEqual(['Cancel'])
      })
    })

    it('offers Cancel instead of "Choose file…", and Cancel returns to the empty page', async () => {
      const sourceFile = useSourceFileStore()
      sourceFile.file = file
      sourceFile.status = 'loading'
      sourceFile.sliceTotal = 62
      sourceFile.slicesDone = 38

      const wrapper = mount(LoadPage)
      expect(buttons(wrapper)).toEqual(['Cancel'])

      await wrapper.get('button').trigger('click')

      expect(sourceFile.status).toBe('empty')
      expect(buttons(wrapper)).toEqual(['Choose file…'])
      expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
    })
  })

  describe('after a failure', () => {
    it("names the file, the failed step and ffmpeg's reason", () => {
      const sourceFile = useSourceFileStore()
      sourceFile.file = file
      sourceFile.status = 'failed'
      sourceFile.failure = {
        kind: 'failed',
        step: 'slice 41 of 62',
        reason: 'Error while decoding stream',
      }

      const wrapper = mount(LoadPage)

      const lines = wrapper.findAll('[role="alert"] p').map((line) => line.text())
      expect(lines).toEqual([
        'evening-set-vol3.m4a could not be loaded.',
        'Failed at: slice 41 of 62.',
        'Reason: Error while decoding stream',
      ])
      expect(buttons(wrapper)).toEqual(['Choose another file'])
    })

    it('names "downloading ffmpeg" as the step of a failed download', () => {
      const sourceFile = useSourceFileStore()
      sourceFile.file = file
      sourceFile.status = 'failed'
      sourceFile.failure = {
        kind: 'failed',
        step: 'downloading ffmpeg',
        reason: 'The download stalled: no data for 30 s',
      }

      const wrapper = mount(LoadPage)

      const lines = wrapper.findAll('[role="alert"] p').map((line) => line.text())
      expect(lines).toEqual([
        'evening-set-vol3.m4a could not be loaded.',
        'Failed at: downloading ffmpeg.',
        'Reason: The download stalled: no data for 30 s',
      ])
    })

    it('keeps the unsupported-format message as it was', () => {
      const sourceFile = useSourceFileStore()
      sourceFile.file = new File(['x'], 'dinner.ogg')
      sourceFile.status = 'failed'
      sourceFile.failure = { kind: 'unsupported', message: 'This file is Vorbis in Ogg.' }

      const wrapper = mount(LoadPage)

      const lines = wrapper.findAll('[role="alert"] p').map((line) => line.text())
      expect(lines).toEqual([
        'dinner.ogg is not a supported format.',
        'This file is Vorbis in Ogg.',
      ])
      expect(buttons(wrapper)).toEqual(['Choose another file'])
    })
  })
})
