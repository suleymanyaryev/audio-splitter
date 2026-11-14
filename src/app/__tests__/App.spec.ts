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
      'This file is Vorbis in Ogg; the splitter supports AAC in .m4a, MP3 and Opus in .opus.',
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
    expect(alert).toContain('evening-set-vol3.m4a could not be loaded at the decode step.')
    expect(alert).toContain('ffmpeg said: Error while decoding stream')
  })

  it('returns to the load page on "New file"', async () => {
    const wrapper = mount(App)
    await chooseFile(wrapper, file)

    const newFile = wrapper.findAll('button').find((button) => button.text() === 'New file')
    await newFile?.trigger('click')

    expect(wrapper.text()).toContain('Choose file…')
    expect(wrapper.text()).not.toContain('evening-set-vol3.m4a')
  })
})
