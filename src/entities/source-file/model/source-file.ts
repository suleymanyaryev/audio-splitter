import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { askToKeepCore, CoreDownloadError } from '@/shared/api/ffmpeg/core-preloader.ts'
import { openFfmpeg, type FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'
import { downmix } from '@/shared/lib/audio/downmix.ts'
import {
  createLoudnessBuilder,
  loudnessWindowSeconds as windowSecondsAt,
} from '@/shared/lib/audio/loudness-builder.ts'
import { createPeaksBuilder } from '@/shared/lib/audio/peaks-builder.ts'
import { cutTrack as cutTrackIn, type TrackCut } from '../api/cut-track.ts'
import { decodeClip } from '../api/decode-clip.ts'
import { decodeSlice, sliceCount } from '../api/decode-slice.ts'
import { probe, type SupportedFormat } from '../api/probe.ts'

export type LoadFailure =
  | { kind: 'unsupported'; message: string }
  // `step` is "downloading ffmpeg", "probe" or "slice 41 of 62".
  | { kind: 'failed'; step: string; reason: string }

// Exported so a caller can tell this rejection (nothing to report) from a clip that really failed.
export class FileReplacedError extends Error {
  constructor() {
    super('The file was replaced before the result was ready')
    this.name = 'FileReplacedError'
  }
}

// The message of `FfmpegSession.interrupt`'s rejection, which a cut stopped in the queue shares.
const STOPPED_MESSAGE = 'ffmpeg was stopped'

// What a call on the open session works with.
interface ReadyFile {
  open: FfmpegSession
  duration: number
  format: SupportedFormat
}

// Waits for a call's end however it ends: its caller gets the error, and the next call goes on.
async function settled(promise: Promise<unknown>) {
  try {
    await promise
  } catch {
    // Reported to the caller of that call.
  }
}

// A thrown error as a load failure: a failed download names its own step, whatever step was on.
function failureOf(error: unknown, step: string): LoadFailure {
  return {
    kind: 'failed',
    step: error instanceof CoreDownloadError ? 'downloading ffmpeg' : step,
    reason: error instanceof Error ? error.message : String(error),
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
  /*
  How much of the ffmpeg core has arrived (0 to 1) while it is being downloaded for this load, and
  null before the download starts, once it is done, and when nothing needed downloading: the load
  page tells the download step from the reading step by it.
  */
  const downloadFraction = ref<number | null>(null)

  // Counts loads, so a load that finishes after "New file" or a newer load changes nothing.
  let currentLoad = 0
  /*
  The ffmpeg session of the current load. It stays open once the file is ready, so a clip reuses
  the loaded core (see the concept note, docs/concepts/06-seeking-compressed-audio.md), and
  `reset` and `cancel` close it.
  */
  let session: FfmpegSession | undefined
  // Aborted when the load it belongs to is cancelled or replaced, so its ffmpeg never starts.
  let loadAbort: AbortController | undefined
  /*
  The end of the latest clip or cut call. One ffmpeg worker runs one command at a time, and the
  session's log buffer belongs to one call, so each call waits for the one before it.
  */
  let callQueue: Promise<unknown> = Promise.resolve()
  /*
  Counts `stopCuts` calls: a cut remembers the count it was asked at, and a changed count when its
  turn comes means it was stopped while it waited.
  */
  let stopCount = 0
  // The request goes out once in the page's life, at the first ready file.
  let hasAskedToKeepCore = false

  function reset() {
    currentLoad++
    loadAbort?.abort()
    loadAbort = undefined
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
    downloadFraction.value = null
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
    const abort = new AbortController()
    loadAbort = abort
    file.value = chosen
    status.value = 'loading'

    let ffmpeg: FfmpegSession | undefined
    let isKept = false
    let step = 'probe'
    try {
      /*
      A cancelled or replaced load aborts the signal, which stops its listening and its ffmpeg
      worker; the download goes on, and the next load joins it (see core-preloader.ts).
      */
      ffmpeg = await openFfmpeg(chosen, {
        onDownloadProgress: (fraction) => {
          if (!isStale()) downloadFraction.value = fraction < 1 ? fraction : null
        },
        signal: abort.signal,
      })
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
      /*
      Asked now and not when the page opens: a browser that prompts for it (Firefox) does so
      once the visitor has seen the tool work, and a file that failed asks nothing.
      */
      if (!hasAskedToKeepCore) {
        hasAskedToKeepCore = true
        void askToKeepCore()
      }
    } catch (error) {
      if (isStale()) return
      fail(failureOf(error, step))
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
  Runs `work` on the open session once the calls before it are done. A call whose file was reset
  or replaced while it waited or ran rejects, because what it would hand back is the old file's.
  */
  async function inSession<T>(work: (ready: ReadyFile) => Promise<T>) {
    const open = session
    const duration = durationSeconds.value
    const kind = format.value
    if (!open || duration === null || kind === null || status.value !== 'ready') {
      throw new Error('No file is ready')
    }
    const thisLoad = currentLoad
    const isStale = () => thisLoad !== currentLoad
    const previous = callQueue

    const turn = (async () => {
      await previous
      if (isStale()) throw new FileReplacedError()
      const result = await work({ open, duration, format: kind })
      if (isStale()) throw new FileReplacedError()
      return result
    })()
    callQueue = settled(turn)
    return turn
  }

  /*
  Decodes `lengthSeconds` from `startSeconds` in the open session, less where the file ends. A
  clip the caller no longer wants (`signal` aborted) must not hold up the calls behind it: one
  still waiting rejects when its turn comes, without running, and one running is interrupted,
  which costs the next call a fresh worker (under 100 ms) instead of the rest of a decode.
  */
  async function clip(startSeconds: number, lengthSeconds: number, signal?: AbortSignal) {
    return inSession(async ({ open, duration }) => {
      signal?.throwIfAborted()
      // The queue runs one call at a time, so the command an interrupt stops is this clip's.
      const interrupt = () => {
        open.interrupt()
      }
      signal?.addEventListener('abort', interrupt, { once: true })
      try {
        return await decodeClip(open, startSeconds, lengthSeconds, duration)
      } finally {
        signal?.removeEventListener('abort', interrupt)
      }
    })
  }

  /*
  Copies one track out of the file in the open session, in the file's own format, and gives the
  new file's bytes. `endSeconds` is undefined for the last track. Each cut counts toward the
  session's 20-call reload budget like any other call. A cut asked for before `stopCuts` and not
  yet started when it is called rejects with that call's error, without running.
  */
  async function cutTrack(track: Omit<TrackCut, 'format'>) {
    const askedAt = stopCount
    return inSession(({ open, format: kind }) => {
      if (stopCount !== askedAt) throw new Error(STOPPED_MESSAGE)
      return cutTrackIn(open, { format: kind, ...track })
    })
  }

  /*
  Stops the export's cuts: the call that is running, a cut or an audition clip, rejects at once
  and the session starts a fresh worker for its next call, and every cut still waiting in the
  queue rejects when its turn comes, without running (it may be waiting behind that clip). Clips
  asked for meanwhile are left alone, and so are cuts asked for after this call.
  */
  function stopCuts() {
    stopCount++
    session?.interrupt()
  }

  function fail(what: LoadFailure) {
    status.value = 'failed'
    failure.value = what
    downloadFraction.value = null
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
    downloadFraction,
    load,
    clip,
    cutTrack,
    stopCuts,
    cancel,
    reset,
  }
})
