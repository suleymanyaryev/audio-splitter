import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { flushPromises, mount } from '@vue/test-utils'
import { openFfmpeg } from '@/shared/api/ffmpeg/ffmpeg.ts'
import {
  fakeFfmpegSession,
  m4aProbeLog,
  toneThenSilencePcm,
  vorbisProbeLog,
} from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useTheme } from '@/shared/lib/theme/theme.ts'
import App from '../App.vue'

vi.mock('@/shared/api/ffmpeg/ffmpeg.ts', () => ({ openFfmpeg: vi.fn() }))

const file = new File(['x'], 'evening-set-vol3.m4a')

async function chooseFile(wrapper: ReturnType<typeof mount>, chosen: File) {
  const input = wrapper.get<HTMLInputElement>('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [chosen], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

function headings(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('h2').map((heading) => heading.text())
}

function dialog() {
  return document.querySelector('[role="alertdialog"]')
}

function dialogButton(text: string) {
  const button = [...(dialog()?.querySelectorAll('button') ?? [])].find(
    (candidate) => candidate.textContent === text,
  )
  if (!button) throw new Error(`no "${text}" button`)
  return button
}

function shortcutsButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('header button[aria-label="Keyboard shortcuts"]')
}

function shortcutsDialog() {
  return document.querySelector('[role="dialog"]')
}

function themeRadios(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('header [role="radiogroup"][aria-label="Theme"] [role="radio"]')
}

function themeRadio(wrapper: ReturnType<typeof mount>, name: string) {
  const found = themeRadios(wrapper).find(
    (candidate) => candidate.attributes('aria-label') === name,
  )
  if (!found) throw new Error(`no ${name} option`)
  return found
}

function newFileButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('header button')
    .find((candidate) => candidate.text() === 'New file')
  if (!button) throw new Error('no New file button')
  return button
}

async function loadAndEdit() {
  const wrapper = mount(App, { attachTo: document.body })
  await chooseFile(wrapper, file)
  useSplitStore().renameTrack(null, 'Opener')
  await newFileButton(wrapper).trigger('click')
  await flushPromises()
  return wrapper
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // A 30 s file: 15 s of tone, then 15 s of silence.
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: m4aProbeLog(30), pcm: toneThenSilencePcm(44_100, 15, 0.5) }),
    )
  })

  it('opens on the load page', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Choose file…')
    expect(headings(wrapper)).not.toContain('Whole file')
  })

  it('shows the whole-file waveform and the file chip once a supported file has loaded', async () => {
    const wrapper = mount(App)

    await chooseFile(wrapper, file)

    expect(headings(wrapper)).toContain('Whole file')
    expect(wrapper.text()).toContain('evening-set-vol3.m4a · 0:00:30')
    expect(wrapper.get('canvas').attributes('aria-label')).toBe('Waveform of the whole file')
    expect(wrapper.text()).toMatch(/0:00:00\s*0:00:07\s*0:00:15\s*0:00:22\s*0:00:30/)
  })

  it('opens the file as one track with its gaps shown once it is ready, and forgets them on New file', async () => {
    const wrapper = mount(App)

    await chooseFile(wrapper, file)

    // 15 s of tone, then 15 s of silence: one run-out gap, which Find gaps would add no split for.
    const split = useSplitStore()
    expect(split.gaps).toEqual([{ startSeconds: 15, endSeconds: 30, edge: 'run-out' }])
    expect(split.tracks).toHaveLength(1)
    expect(split.tracks[0]?.lengthSeconds).toBe(30)
    expect(headings(wrapper)).toContain('Tracks (1)')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)

    await newFileButton(wrapper).trigger('click')
    expect(split.tracks).toEqual([])
  })

  it('loads a file dropped anywhere on the load page', async () => {
    const wrapper = mount(App, { attachTo: document.body })

    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } })
    document.body.dispatchEvent(drop)
    await flushPromises()

    expect(headings(wrapper)).toContain('Whole file')
    wrapper.unmount()
  })

  it('stays on the load page and names what an unsupported file is', async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(fakeFfmpegSession({ probeLog: vorbisProbeLog(30) }))
    const wrapper = mount(App)

    await chooseFile(wrapper, new File(['x'], 'dinner.ogg'))

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'This file is Vorbis in Ogg; the splitter supports AAC in .m4a, .mp4 or .mov, MP3 and Opus in .opus, .webm or .mkv.',
    )
    expect(wrapper.text()).toContain('Choose another file')
  })

  it("names the failed step and ffmpeg's reason when a file cannot be loaded", async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: m4aProbeLog(30), decodeError: 'Error while decoding stream' }),
    )
    const wrapper = mount(App)

    await chooseFile(wrapper, file)

    const alert = wrapper.get('[role="alert"]').text()
    expect(alert).toContain('evening-set-vol3.m4a could not be loaded.')
    expect(alert).toContain('Failed at: slice 1 of 1.')
    expect(alert).toContain('Reason: Error while decoding stream')
  })

  it('returns to the load page on "New file"', async () => {
    const wrapper = mount(App)
    await chooseFile(wrapper, file)

    const newFile = wrapper.findAll('button').find((button) => button.text() === 'New file')
    await newFile?.trigger('click')

    expect(wrapper.text()).toContain('Choose file…')
    expect(wrapper.text()).not.toContain('evening-set-vol3.m4a')
  })

  describe('the theme switch', () => {
    beforeEach(() => {
      useTheme().setThemeChoice('system')
    })

    it('is in the header on the load page, before "Local only", with the choice checked', () => {
      const wrapper = mount(App)

      expect(themeRadios(wrapper).map((option) => option.attributes('aria-label'))).toEqual([
        'System',
        'Light',
        'Dark',
      ])
      expect(themeRadio(wrapper, 'System').attributes('aria-checked')).toBe('true')
      const header = wrapper.get('header').html()
      expect(header.indexOf('role="radiogroup"')).toBeLessThan(header.indexOf('Local only'))
    })

    it('is in the header on the review page too', async () => {
      const wrapper = mount(App)
      await chooseFile(wrapper, file)

      expect(headings(wrapper)).toContain('Whole file')
      expect(themeRadios(wrapper)).toHaveLength(3)
    })

    it('sets the theme choice when an option is chosen', async () => {
      const wrapper = mount(App)

      await themeRadio(wrapper, 'Dark').trigger('click')

      expect(useTheme().themeChoice.value).toBe('dark')
      expect(themeRadio(wrapper, 'Dark').attributes('aria-checked')).toBe('true')
    })

    it('shows the saved choice', () => {
      useTheme().setThemeChoice('light')

      const wrapper = mount(App)

      expect(themeRadio(wrapper, 'Light').attributes('aria-checked')).toBe('true')
    })
  })

  describe('the shortcuts button', () => {
    it('is not on the load page', () => {
      const wrapper = mount(App)

      expect(shortcutsButton(wrapper).exists()).toBe(false)
    })

    it('is in the header once the review screen is up, with its tooltip and key', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)

      const button = shortcutsButton(wrapper)
      expect(button.exists()).toBe(true)
      await button.trigger('focus')

      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Keyboard shortcuts (?)')
      wrapper.unmount()
    })

    it('opens the shortcuts dialog', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)

      await shortcutsButton(wrapper).trigger('click')
      await flushPromises()

      expect(shortcutsDialog()?.textContent).toContain('Keyboard shortcuts')
      wrapper.unmount()
    })

    it('goes with the review screen on "New file"', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)

      await newFileButton(wrapper).trigger('click')
      await flushPromises()

      expect(shortcutsButton(wrapper).exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('"New file" with edits to lose', () => {
    it('asks first, counting the edits, and stays on the review page', async () => {
      const wrapper = await loadAndEdit()

      expect(dialog()?.textContent).toContain('Discard your edits?')
      expect(dialog()?.textContent).toContain('Loading a new file discards your 1 edit.')
      expect(document.activeElement).toBe(dialogButton('Keep edits'))
      expect(headings(wrapper)).toContain('Whole file')
      wrapper.unmount()
    })

    it('keeps the file and the edits on "Keep edits"', async () => {
      const wrapper = await loadAndEdit()

      dialogButton('Keep edits').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(headings(wrapper)).toContain('Whole file')
      expect(useSplitStore().tracks[0]?.name).toBe('Opener')
      wrapper.unmount()
    })

    it('returns to the load page on "New file"', async () => {
      const wrapper = await loadAndEdit()

      dialogButton('New file').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(wrapper.text()).toContain('Choose file…')
      expect(useSplitStore().tracks).toEqual([])
      wrapper.unmount()
    })

    it('asks with pending splits and no edits, counting them', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)
      const split = useSplitStore()
      split.addPendingSplit(10, false)
      split.addPendingSplit(20, false)
      expect(split.hasEdits).toBe(false)

      await newFileButton(wrapper).trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain('Loading a new file discards your 2 pending splits.')
      expect(headings(wrapper)).toContain('Whole file')
      wrapper.unmount()
    })

    it('counts the edits and the pending splits together', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)
      const split = useSplitStore()
      split.renameTrack(null, 'Opener')
      split.addPendingSplit(10, false)

      await newFileButton(wrapper).trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain(
        'Loading a new file discards your 1 edit and 1 pending split.',
      )
      dialogButton('New file').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.text()).toContain('Choose file…')
      expect(split.pendingSplits).toEqual([])
      wrapper.unmount()
    })

    it('asks once the user moves a split that Find gaps added', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)
      // 20 s of tone, a 2 s silence, 20 s of tone: one inner gap.
      const curve = new Float32Array(440).fill(-10)
      curve.fill(-70, 200, 240)
      const split = useSplitStore()
      split.open(curve, { windowSeconds: 0.05, durationSeconds: 22 })
      split.addGapSplits()
      expect(split.splits).toHaveLength(1)

      expect(split.hasEdits).toBe(false)
      split.selectSplit(split.splits[0]!.id)
      split.moveSplit(split.splits[0]!.id, split.splits[0]!.seconds + 0.5)
      await newFileButton(wrapper).trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain('Loading a new file discards your 1 edit.')
      wrapper.unmount()
    })

    it('does not ask after Find gaps alone', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)
      const curve = new Float32Array(440).fill(-10)
      curve.fill(-70, 200, 240)
      const split = useSplitStore()
      split.open(curve, { windowSeconds: 0.05, durationSeconds: 22 })
      split.addGapSplits()
      expect(split.splits).toHaveLength(1)

      await newFileButton(wrapper).trigger('click')
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(wrapper.text()).toContain('Choose file…')
      wrapper.unmount()
    })

    it('does not ask when nothing was edited', async () => {
      const wrapper = mount(App, { attachTo: document.body })
      await chooseFile(wrapper, file)

      await newFileButton(wrapper).trigger('click')
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(wrapper.text()).toContain('Choose file…')
      wrapper.unmount()
    })
  })
})
