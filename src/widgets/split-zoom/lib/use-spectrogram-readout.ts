import { shallowRef } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { formatSpectrogramReadout } from './format-spectrogram-readout.ts'
import { readSpectrogram } from './read-spectrogram.ts'
import { yToFrequency } from './spectrogram-axis.ts'

// The readout's text and where the pointer is in the view, in its own pixels.
export type Readout = {
  text: string
  x: number
  y: number
  // Past the view's middle the readout sits left of the pointer, so it stays inside the view.
  isLeftOfPointer: boolean
}

/*
The frequency and level under the pointer while it is over a view's spectrogram strip, the bottom
half of `frame`: "1.0 kHz · −32 dB" (concept note 14). `secondsAt` is the view's own time under a
pixel. Over the waveform, outside the file or before the load is ready there is no readout, and
`hide` takes it away when the pointer leaves. The pointer's other actions are the view's own.
*/
export function useSpectrogramReadout(options: {
  frame: () => HTMLElement | null
  secondsAt: (x: number, width: number) => number | null
}) {
  const sourceFile = useSourceFileStore()
  const readout = shallowRef<Readout | null>(null)

  function hide() {
    readout.value = null
  }

  function show(event: MouseEvent) {
    const element = options.frame()
    const spectrogram = sourceFile.spectrogram
    const columnSeconds = sourceFile.loudnessWindowSeconds
    if (!element || !spectrogram || columnSeconds === null) return hide()
    const { left, top, width, height } = element.getBoundingClientRect()
    const x = event.clientX - left
    const y = event.clientY - top
    const stripTop = height / 2
    const seconds = options.secondsAt(x, width)
    if (seconds === null || y < stripTop || y > height) return hide()
    const hz = yToFrequency(y - stripTop, spectrogram.topHz, height - stripTop)
    const decibels = readSpectrogram(spectrogram, columnSeconds, seconds, hz)
    if (decibels === null) return hide()
    readout.value = {
      text: formatSpectrogramReadout(hz, decibels),
      x,
      y,
      isLeftOfPointer: x > width / 2,
    }
  }

  return { readout, show, hide }
}
