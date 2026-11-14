import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { openFfmpeg, type FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'
import { downmix } from '@/shared/lib/audio/downmix.ts'
import { createLoudnessBuilder } from '@/shared/lib/audio/loudness-builder.ts'
import { createPeaksBuilder } from '@/shared/lib/audio/peaks-builder.ts'
import { decodeSlice, sliceCount } from '../api/decode-slice.ts'
import { probe, type SupportedFormat } from '../api/probe.ts'

export type LoadFailure =
  | { kind: 'unsupported'; message: string }
  // `step` is "probe" or "slice 41 of 62".
  | { kind: 'failed'; step: string; reason: string }

/*
The one source file being worked on, and what the analysis keeps of it. The file is decoded one
slice at a time (60 s, or 300 s for an MP3), and each slice's samples are thrown away as soon as
the peaks and the loudness curve have taken what they need: only the small summaries stay.
*/
export const useSourceFileStore = defineStore('source-file', () => {
  const status = ref<'empty' | 'loading' | 'ready' | 'failed'>('empty')
  const file = shallowRef<File | null>(null)
  const format = ref<SupportedFormat | null>(null)
  const durationSeconds = ref<number | null>(null)
  // [min, max] of the mono downmix per bucket of round(rate / 100) samples: exactly 10 ms at
  // 44.1 and 48 kHz (see shared/lib/audio/peaks-builder.ts).
  const peaks = shallowRef<Float32Array | null>(null)
  // dB of the mono downmix per window of round(rate × 0.05) samples: 50 ms at 44.1 and 48 kHz; -100 dB
  // is the floor (see shared/lib/audio/loudness-builder.ts).
  const loudness = shallowRef<Float32Array | null>(null)
  const failure = ref<LoadFailure | null>(null)
  // Progress, in slices (the probe is not counted): "38 / 62 slices". Both are 0 when empty.
  const slicesDone = ref(0)
  const sliceTotal = ref(0)

  // Counts loads, so a load that finishes after "New file" or a newer load changes nothing.
  let currentLoad = 0
  // The ffmpeg session of the current load, so `cancel` can reach its worker.
  let session: FfmpegSession | undefined

  function reset() {
    currentLoad++
    status.value = 'empty'
    file.value = null
    format.value = null
    durationSeconds.value = null
    peaks.value = null
    loudness.value = null
    failure.value = null
    slicesDone.value = 0
    sliceTotal.value = 0
  }

  // Stops the load and keeps nothing. Terminating the worker rejects the call it is in the middle
  // of; that load is stale by then, so the rejection is not reported as a failure.
  function cancel() {
    reset()
    session?.close()
  }

  async function load(chosen: File) {
    reset()
    const thisLoad = currentLoad
    const isStale = () => thisLoad !== currentLoad
    file.value = chosen
    status.value = 'loading'

    let ffmpeg: FfmpegSession | undefined
    let step = 'probe'
    try {
      ffmpeg = await openFfmpeg(chosen)
      // Cancelled while ffmpeg was loading: `finally` closes it, and a newer load keeps its session.
      if (isStale()) return
      session = ffmpeg
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

      const total = sliceCount(probed.durationSeconds, probed.format)
      sliceTotal.value = total
      const peaksBuilder = createPeaksBuilder(probed.sampleRate)
      const loudnessBuilder = createLoudnessBuilder(probed.sampleRate)
      for (let index = 0; index < total; index++) {
        step = `slice ${index + 1} of ${total}`
        const pcm = await decodeSlice(ffmpeg, index, probed.format)
        if (isStale()) return
        const mono = downmix(pcm, probed.channelCount)
        peaksBuilder.push(mono)
        loudnessBuilder.push(mono)
        slicesDone.value = index + 1
      }
      peaks.value = peaksBuilder.finish()
      loudness.value = loudnessBuilder.finish()
      status.value = 'ready'
    } catch (error) {
      if (isStale()) return
      fail({ kind: 'failed', step, reason: error instanceof Error ? error.message : String(error) })
    } finally {
      // A fresh worker per file, and none left running after a failure.
      ffmpeg?.close()
      // A newer load may have its own session by now.
      if (session === ffmpeg) session = undefined
    }
  }

  function fail(what: LoadFailure) {
    status.value = 'failed'
    failure.value = what
  }

  return {
    status,
    file,
    format,
    durationSeconds,
    peaks,
    loudness,
    failure,
    slicesDone,
    sliceTotal,
    load,
    cancel,
    reset,
  }
})
