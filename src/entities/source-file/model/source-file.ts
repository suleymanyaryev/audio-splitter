import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { openFfmpeg, type FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'
import { downmix } from '@/shared/lib/audio/downmix.ts'
import {
  createLoudnessBuilder,
  loudnessWindowSeconds as windowSecondsAt,
} from '@/shared/lib/audio/loudness-builder.ts'
import { createPeaksBuilder } from '@/shared/lib/audio/peaks-builder.ts'
import { decodeClip } from '../api/decode-clip.ts'
import { decodeSlice, sliceCount } from '../api/decode-slice.ts'
import { probe, type SupportedFormat } from '../api/probe.ts'

export type LoadFailure =
  | { kind: 'unsupported'; message: string }
  // `step` is "probe" or "slice 41 of 62".
  | { kind: 'failed'; step: string; reason: string }

// Exported so a caller can tell this rejection (nothing to report) from a clip that really failed.
export class FileReplacedError extends Error {
  constructor() {
    super('The file was replaced before the clip was ready')
    this.name = 'FileReplacedError'
  }
}

// Waits for a clip's end however it ends: its caller gets the error, and the next clip goes on.
async function settled(promise: Promise<unknown>) {
  try {
    await promise
  } catch {
    // Reported to the caller of that clip.
  }
}

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
  /*
  How long one window of the curve lasts, from its sample count: 0.05 at 44.1 and 48 kHz, but
  1103 / 22050 at 22.05 kHz. Window i starts at i × this; it is set together with the curve.
  */
  const loudnessWindowSeconds = ref<number | null>(null)
  const failure = ref<LoadFailure | null>(null)
  // Progress, in slices (the probe is not counted): "38 / 62 slices". Both are 0 when empty.
  const slicesDone = ref(0)
  const sliceTotal = ref(0)

  // Counts loads, so a load that finishes after "New file" or a newer load changes nothing.
  let currentLoad = 0
  /*
  The ffmpeg session of the current load. It stays open once the file is ready, so a clip reuses
  the loaded core (see the concept note, docs/concepts/06-seeking-compressed-audio.md), and
  `reset` and `cancel` close it.
  */
  let session: FfmpegSession | undefined
  /*
  The end of the latest clip call. One ffmpeg worker runs one command at a time, and the
  session's log buffer belongs to one call, so each clip waits for the one before it.
  */
  let clipQueue: Promise<unknown> = Promise.resolve()

  function reset() {
    currentLoad++
    session?.close()
    session = undefined
    status.value = 'empty'
    file.value = null
    format.value = null
    durationSeconds.value = null
    peaks.value = null
    loudness.value = null
    loudnessWindowSeconds.value = null
    failure.value = null
    slicesDone.value = 0
    sliceTotal.value = 0
  }

  // Stops the load and keeps nothing. Terminating the worker rejects the call it is in the middle
  // of; that load is stale by then, so the rejection is not reported as a failure.
  function cancel() {
    reset()
  }

  async function load(chosen: File) {
    reset()
    const thisLoad = currentLoad
    const isStale = () => thisLoad !== currentLoad
    file.value = chosen
    status.value = 'loading'

    let ffmpeg: FfmpegSession | undefined
    let isKept = false
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
      loudnessWindowSeconds.value = windowSecondsAt(probed.sampleRate)
      status.value = 'ready'
      isKept = true
    } catch (error) {
      if (isStale()) return
      fail({ kind: 'failed', step, reason: error instanceof Error ? error.message : String(error) })
    } finally {
      if (!isKept) {
        /*
        A fresh worker per file, and none left running after a failure or a cancel. A cancel
        closed it already; closing twice is harmless.
        */
        ffmpeg?.close()
        // A newer load may have its own session by now.
        if (session === ffmpeg) session = undefined
      }
    }
  }

  /*
  Decodes the 8 s around a split in the open session. A clip whose file was reset or replaced
  while it waited or decoded rejects, because the audio it would hand back is the old file's.
  */
  async function clip(splitSeconds: number) {
    const open = session
    const duration = durationSeconds.value
    if (!open || duration === null || status.value !== 'ready') {
      throw new Error('No file is ready to play')
    }
    const thisLoad = currentLoad
    const isStale = () => thisLoad !== currentLoad
    const previous = clipQueue

    const turn = (async () => {
      await previous
      if (isStale()) throw new FileReplacedError()
      const decoded = await decodeClip(open, splitSeconds, duration)
      if (isStale()) throw new FileReplacedError()
      return decoded
    })()
    clipQueue = settled(turn)
    return turn
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
    loudnessWindowSeconds,
    failure,
    slicesDone,
    sliceTotal,
    load,
    clip,
    cancel,
    reset,
  }
})
