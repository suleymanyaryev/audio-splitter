import { shallowRef } from 'vue'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { formatSpectrogramReadout } from './format-spectrogram-readout.ts'
import { readSpectrogram } from './read-spectrogram.ts'
import { yToFrequency } from './spectrogram-axis.ts'
import { zoomLayout } from './zoom-layout.ts'

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
half of `frame` (`zoomLayout`): "1.0 kHz · −32 dB" (DESIGN.md).
`secondsAt` is the view's own time under a pixel. Over the waveform, outside the view or the file
(its last column may run past the end) or before the load is ready there is no readout, and `hide`
takes it away when the pointer leaves. When the view moves under a still pointer, `follow` reads it
again there, so it is never stale. The pointer's other actions are the view's own.
*/
export function useSpectrogramReadout(options: {
  frame: () => HTMLElement | null
  secondsAt: (x: number, width: number) => number | null
}) {
  const sourceFile = useSourceFileStore()
  const readout = shallowRef<Readout | null>(null)
  // The last pointer over the view, until it leaves.
  let pointer: MouseEvent | undefined

  function readAt(event: MouseEvent): Readout | null {
    const element = options.frame()
    const spectrogram = sourceFile.spectrogram
    const columnSeconds = sourceFile.loudnessWindowSeconds
    if (!element || !spectrogram || columnSeconds === null) return null
    const { left, top, width, height } = element.getBoundingClientRect()
    const x = event.clientX - left
    // A captured drag keeps reporting the pointer past the view's edges.
    if (x < 0 || x > width) return null
    const y = event.clientY - top
    const { stripTop, stripHeight } = zoomLayout(height)
    if (y < stripTop || y > height) return null
    const seconds = options.secondsAt(x, width)
    const duration = sourceFile.durationSeconds ?? 0
    if (seconds === null || seconds < 0 || seconds >= duration) return null
    const hz = yToFrequency(y - stripTop, spectrogram.topHz, stripHeight)
    const decibels = readSpectrogram(spectrogram, columnSeconds, seconds, hz)
    if (decibels === null) return null
    return {
      text: formatSpectrogramReadout(hz, decibels),
      x,
      y,
      isLeftOfPointer: x > width / 2,
    }
  }

  function show(event: MouseEvent) {
    pointer = event
    readout.value = readAt(event)
  }

  function hide() {
    pointer = undefined
    readout.value = null
  }

  function follow() {
    if (pointer) readout.value = readAt(pointer)
  }

  return { readout, show, hide, follow }
}
