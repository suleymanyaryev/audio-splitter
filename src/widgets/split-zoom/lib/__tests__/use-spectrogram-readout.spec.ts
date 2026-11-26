import { beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSpectrogramReadout } from '../use-spectrogram-readout.ts'

/*
A 10 s file at 44.1 kHz, 200 columns of 50 ms, whose band 62 (955 to 1001 Hz) reads 173
(−32.2 dB) everywhere and the rest −100 dB.
*/
function loadTenSeconds() {
  const bands = new Uint8Array(200 * 128)
  for (let column = 0; column < 200; column++) bands[column * 128 + 62] = 173
  const sourceFile = useSourceFileStore()
  sourceFile.spectrogram = { bands, bandCount: 128, topHz: 22_050 }
  sourceFile.loudnessWindowSeconds = 0.05
  sourceFile.durationSeconds = 10
}

// A view 1000 x 320 px at (100, 50) on the page, showing the 10 s file plus 1 s past its end.
const frame = { getBoundingClientRect: () => new DOMRect(100, 50, 1000, 320) } as HTMLElement
const secondsAt = (x: number, width: number) => (x / width) * 11

// 1 kHz is 81.28 px down the 160 px strip, which starts 160 px down the view.
const at = (x: number, y: number) =>
  new MouseEvent('pointermove', { clientX: 100 + x, clientY: 50 + y })

describe('useSpectrogramReadout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reads the frequency at the pointer’s height in the strip and the level of its band', () => {
    loadTenSeconds()
    const { readout, show } = useSpectrogramReadout({ frame: () => frame, secondsAt })

    show(at(300, 241.28))

    expect(readout.value).toMatchObject({
      text: '1.0 kHz · −32 dB',
      x: 300,
      isLeftOfPointer: false,
    })
    expect(readout.value?.y).toBeCloseTo(241.28, 9)
  })

  it('sits left of the pointer past the view’s middle', () => {
    loadTenSeconds()
    const { readout, show } = useSpectrogramReadout({ frame: () => frame, secondsAt })

    show(at(700, 241.28))

    expect(readout.value?.isLeftOfPointer).toBe(true)
  })

  it('reads 50 Hz at the strip’s bottom edge', () => {
    loadTenSeconds()
    const { readout, show } = useSpectrogramReadout({ frame: () => frame, secondsAt })

    show(at(300, 320))

    expect(readout.value?.text).toBe('50 Hz · −100 dB')
  })

  it('shows nothing over the waveform, past the file’s end, or once hidden', () => {
    loadTenSeconds()
    const { readout, show, hide } = useSpectrogramReadout({ frame: () => frame, secondsAt })

    show(at(300, 159))
    expect(readout.value).toBeNull()

    // 950 px of 1000 is 10.45 s, past the 10 s file.
    show(at(950, 241.28))
    expect(readout.value).toBeNull()

    show(at(300, 241.28))
    hide()
    expect(readout.value).toBeNull()
  })

  it('shows nothing past the view’s edges, where a captured drag still reports the pointer', () => {
    loadTenSeconds()
    // A view of 2 to 8 s, so the time either side of it is still inside the file.
    const { readout, show } = useSpectrogramReadout({
      frame: () => frame,
      secondsAt: (x, width) => 2 + (x / width) * 6,
    })

    show(at(-5, 241.28))
    expect(readout.value).toBeNull()

    show(at(1005, 241.28))
    expect(readout.value).toBeNull()
  })

  it('reads again under a still pointer when the view moves, until the pointer leaves', () => {
    loadTenSeconds()
    let startSeconds = 0
    const { readout, show, hide, follow } = useSpectrogramReadout({
      frame: () => frame,
      secondsAt: (x, width) => startSeconds + (x / width) * 11,
    })
    show(at(300, 241.28))

    // 300 px of 1000 is now 9 s + 3.3 s, past the 10 s file.
    startSeconds = 9
    follow()
    expect(readout.value).toBeNull()

    startSeconds = 0
    follow()
    expect(readout.value?.text).toBe('1.0 kHz · −32 dB')

    hide()
    follow()
    expect(readout.value).toBeNull()
  })

  it('shows nothing before the load is ready', () => {
    const { readout, show } = useSpectrogramReadout({ frame: () => frame, secondsAt })

    show(at(300, 241.28))

    expect(readout.value).toBeNull()
  })
})
