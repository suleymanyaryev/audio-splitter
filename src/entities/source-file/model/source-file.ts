import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { openFfmpeg, type FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'
import { downmix } from '@/shared/lib/audio/downmix.ts'
import { minMaxPeaks } from '@/shared/lib/audio/min-max-peaks.ts'
import { decodeWholeFile } from '../api/decode-whole-file.ts'
import { probe, type SupportedFormat } from '../api/probe.ts'

type Step = 'probe' | 'decode'

export type LoadFailure =
  { kind: 'unsupported'; message: string } | { kind: 'failed'; step: Step; reason: string }

/*
The one source file being worked on, and what the analysis keeps of it. The decoded samples are
thrown away as soon as the peaks are made: only the small summary stays.
*/
export const useSourceFileStore = defineStore('source-file', () => {
  const status = ref<'empty' | 'loading' | 'ready' | 'failed'>('empty')
  const file = shallowRef<File | null>(null)
  const format = ref<SupportedFormat | null>(null)
  const durationSeconds = ref<number | null>(null)
  // [min, max] of the mono downmix per bucket of round(rate / 100) samples: exactly 10 ms at
  // 44.1 and 48 kHz (see shared/lib/audio/min-max-peaks.ts).
  const peaks = shallowRef<Float32Array | null>(null)
  const failure = ref<LoadFailure | null>(null)

  // Counts loads, so a load that finishes after "New file" or a newer load changes nothing.
  let currentLoad = 0

  function reset() {
    currentLoad++
    status.value = 'empty'
    file.value = null
    format.value = null
    durationSeconds.value = null
    peaks.value = null
    failure.value = null
  }

  async function load(chosen: File) {
    reset()
    const thisLoad = currentLoad
    const isStale = () => thisLoad !== currentLoad
    file.value = chosen
    status.value = 'loading'

    let ffmpeg: FfmpegSession | undefined
    let step: Step = 'probe'
    try {
      ffmpeg = await openFfmpeg(chosen)
      const probed = await probe(ffmpeg)
      if (isStale()) return
      if (probed.kind === 'unsupported') {
        fail({ kind: 'unsupported', message: probed.message })
        return
      }
      if (probed.kind === 'unreadable') {
        fail({ kind: 'failed', step, reason: probed.reason })
        return
      }
      format.value = probed.format
      durationSeconds.value = probed.durationSeconds

      step = 'decode'
      const pcm = await decodeWholeFile(ffmpeg)
      if (isStale()) return
      peaks.value = minMaxPeaks(downmix(pcm, probed.channelCount), probed.sampleRate)
      status.value = 'ready'
    } catch (error) {
      if (isStale()) return
      fail({ kind: 'failed', step, reason: error instanceof Error ? error.message : String(error) })
    } finally {
      // A fresh worker per file: ffmpeg.wasm wears out after a few dozen calls on one worker.
      ffmpeg?.close()
    }
  }

  function fail(what: LoadFailure) {
    status.value = 'failed'
    failure.value = what
  }

  return { status, file, format, durationSeconds, peaks, failure, load, reset }
})
