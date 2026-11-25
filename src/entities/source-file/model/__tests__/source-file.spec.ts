import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { CoreDownloadError } from '@/shared/api/ffmpeg/core-preloader.ts'
import { openFfmpeg } from '@/shared/api/ffmpeg/ffmpeg.ts'
import {
  fakeFfmpegSession,
  m4aProbeLog,
  mp3ProbeLog,
  webmProbeLog,
  toneThenSilencePcm,
  flacProbeLog,
} from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { downmix } from '@/shared/lib/audio/downmix.ts'
import { createLoudnessBuilder } from '@/shared/lib/audio/loudness-builder.ts'
import { createPeaksBuilder } from '@/shared/lib/audio/peaks-builder.ts'
import { FileReplacedError, useSourceFileStore } from '../source-file.ts'

vi.mock('@/shared/api/ffmpeg/ffmpeg.ts', () => ({ openFfmpeg: vi.fn() }))

const file = new File(['x'], 'evening-set-vol3.m4a')

// A 150 s file is 2.5 slices. Each slice has its own loudness, so a slice read twice or in the
// wrong place shows in the peaks. The slices are 60 s, 60 s and 30 s of stereo at 44.1 kHz.
const slicePcm = (index: number) =>
  index < 2
    ? toneThenSilencePcm(44_100, 30, 0.2 * (index + 1))
    : toneThenSilencePcm(44_100, 15, 0.6)

// Stands in for `navigator.storage.persist`; the real one may answer false or throw.
function stubPersist(persist: () => Promise<unknown>) {
  vi.stubGlobal('navigator', { storage: { persist } })
}

// A one-second file that loads to ready.
const readySession = () =>
  fakeFfmpegSession({ probeLog: m4aProbeLog(2), pcm: toneThenSilencePcm(44_100, 1, 0.5) })

describe('the source-file store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('probes and decodes a supported file into its format, duration and 10 ms peaks', async () => {
    // 1 s of tone then 1 s of silence: 200 buckets of 10 ms.
    const session = fakeFfmpegSession({
      probeLog: m4aProbeLog(2),
      pcm: toneThenSilencePcm(44_100, 1, 0.5),
    })
    vi.mocked(openFfmpeg).mockResolvedValue(session)
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.status).toBe('ready')
    expect(store.file?.name).toBe('evening-set-vol3.m4a')
    expect(store.format).toBe('m4a')
    expect(store.durationSeconds).toBe(2)
    expect(store.peaks).toHaveLength(2 * 200)
    expect(store.peaks?.[1]).toBeCloseTo(0.5, 2)
    expect(store.peaks?.[2 * 199 + 1]).toBe(0)
  })

  it('keeps a loudness curve of 50 ms windows: loud in the tone, -100 dB in the silence', async () => {
    // 1 s of tone then 1 s of silence: 20 windows of 50 ms each. A sine of amplitude 0.5 has an
    // RMS of 0.5 / sqrt(2), which is -9.03 dB.
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: m4aProbeLog(2), pcm: toneThenSilencePcm(44_100, 1, 0.5) }),
    )
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.loudness).toHaveLength(2 * 20)
    expect(store.loudness?.[5]).toBeCloseTo(-9.03, 1)
    expect(store.loudness?.[2 * 20 - 1]).toBe(-100)
  })

  it('keeps the length of a loudness window in seconds, from the window size in samples', async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: m4aProbeLog(2), pcm: toneThenSilencePcm(44_100, 1, 0.5) }),
    )
    const store = useSourceFileStore()
    expect(store.loudnessWindowSeconds).toBeNull()

    await store.load(file)

    expect(store.loudnessWindowSeconds).toBeCloseTo(0.05, 12)
  })

  it('keeps 1103 / 22050 s per loudness window at 22.05 kHz, not 0.05', async () => {
    const log = m4aProbeLog(2).map((line) => line.replace('44100 Hz', '22050 Hz'))
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: log, pcm: toneThenSilencePcm(22_050, 1, 0.5) }),
    )
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.loudnessWindowSeconds).toBeCloseTo(1103 / 22_050, 12)
  })

  it('names what an unsupported file is and does not decode it', async () => {
    const session = fakeFfmpegSession({ probeLog: flacProbeLog(30) })
    vi.mocked(openFfmpeg).mockResolvedValue(session)
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.status).toBe('failed')
    expect(store.failure).toEqual({
      kind: 'unsupported',
      message:
        'This file is FLAC in FLAC; the splitter supports AAC in .m4a, .mp4 or .mov, MP3, Opus in .opus, .webm or .mkv, and Vorbis in .ogg.',
    })
    expect(session.run).toHaveBeenCalledTimes(1)
    expect(session.close).toHaveBeenCalled()
  })

  it("reports the failed step and ffmpeg's last log line when the decode fails", async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: m4aProbeLog(30), decodeError: 'Error while decoding stream' }),
    )
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.status).toBe('failed')
    expect(store.failure).toEqual({
      kind: 'failed',
      step: 'slice 1 of 1',
      reason: 'Error while decoding stream',
    })
  })

  it('reports the probe step when ffmpeg cannot read the file', async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: ['/in/source.m4a: Invalid data found when processing input'] }),
    )
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.failure).toEqual({
      kind: 'failed',
      step: 'probe',
      reason: '/in/source.m4a: Invalid data found when processing input',
    })
  })

  it('decodes a 2.5-slice file in three slices and keeps the peaks of the whole', async () => {
    const session = fakeFfmpegSession({ probeLog: m4aProbeLog(150), pcmForSlice: slicePcm })
    vi.mocked(openFfmpeg).mockResolvedValue(session)
    const store = useSourceFileStore()

    await store.load(file)

    // Call 0 is the probe; each slice seeks 1 s before its start, and the first has no seek.
    const seeks = session.run.mock.calls
      .slice(1)
      .map(([command]) => (command.includes('-ss') ? command[command.indexOf('-ss') + 1] : null))
    expect(seeks).toEqual([null, '59', '119'])
    const whole = new Float32Array([...slicePcm(0), ...slicePcm(1), ...slicePcm(2)])
    const builder = createPeaksBuilder(44_100)
    builder.push(downmix(whole, 2))
    expect(store.peaks).toEqual(builder.finish())
    expect(store.peaks).toHaveLength(15_000 * 2)
    // 150 s is 3000 windows of 50 ms. The slices end on whole windows here (60 s is 1200), so the
    // curve of the whole and the curve slice by slice are the same.
    const loudness = createLoudnessBuilder(44_100)
    loudness.push(downmix(whole, 2))
    expect(store.loudness).toEqual(loudness.finish())
    expect(store.loudness).toHaveLength(3000)
    expect(store.status).toBe('ready')
  })

  it('decodes an MP3 in slices of 300 s', async () => {
    // 650 s is 300 s, 300 s and 50 s.
    const session = fakeFfmpegSession({ probeLog: mp3ProbeLog(650), pcmForSlice: slicePcm })
    vi.mocked(openFfmpeg).mockResolvedValue(session)
    const store = useSourceFileStore()

    await store.load(file)

    const seeks = session.run.mock.calls
      .slice(1)
      .map(([command]) => (command.includes('-ss') ? command[command.indexOf('-ss') + 1] : null))
    expect(seeks).toEqual([null, '299', '599'])
    expect(store.sliceTotal).toBe(3)
    expect(store.slicesDone).toBe(3)
    expect(store.status).toBe('ready')
  })

  it('counts the slices done, not the probe', async () => {
    const store = useSourceFileStore()
    const seen: string[] = []
    const snapshot = () => `${store.slicesDone} / ${store.sliceTotal}`
    expect(snapshot()).toBe('0 / 0')
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({
        probeLog: m4aProbeLog(150),
        // Read as each slice is decoded, so it shows what the page would show during that slice.
        pcmForSlice: (index) => {
          seen.push(snapshot())
          return slicePcm(index)
        },
      }),
    )

    await store.load(file)

    expect(seen).toEqual(['0 / 3', '1 / 3', '2 / 3'])
    expect(snapshot()).toBe('3 / 3')
  })

  it("names the slice that failed and keeps ffmpeg's last log line", async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({
        probeLog: m4aProbeLog(150),
        pcmForSlice: slicePcm,
        decodeError: 'Error while decoding stream',
        failAtSlice: 1,
      }),
    )
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.status).toBe('failed')
    expect(store.failure).toEqual({
      kind: 'failed',
      step: 'slice 2 of 3',
      reason: 'Error while decoding stream',
    })
    expect(store.peaks).toBeNull()
    expect(store.loudness).toBeNull()
  })

  it('returns to empty on cancel during a slice, and the stopped call is not a failure', async () => {
    const session = fakeFfmpegSession({ probeLog: m4aProbeLog(150), pcmForSlice: slicePcm })
    // The first slice never answers by itself; terminating ffmpeg's worker rejects it, as in
    // ffmpeg.wasm.
    const probe = session.run.getMockImplementation()
    session.run.mockImplementationOnce(probe!)
    session.run.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          session.close.mockImplementation(() => {
            reject(new Error('called FFmpeg.terminate()'))
          })
        }),
    )
    vi.mocked(openFfmpeg).mockResolvedValue(session)
    const store = useSourceFileStore()
    const loading = store.load(file)
    await vi.waitFor(() => {
      expect(session.run).toHaveBeenCalledTimes(2)
    })

    store.cancel()
    await loading

    expect(session.close).toHaveBeenCalled()
    expect(store.status).toBe('empty')
    expect(store.failure).toBeNull()
    expect(store.file).toBeNull()
    expect(store.peaks).toBeNull()
    expect(store.loudness).toBeNull()
    expect(store.slicesDone).toBe(0)
    expect(store.sliceTotal).toBe(0)
  })

  it('cancels the newer load, not one cancelled while ffmpeg was still loading', async () => {
    const first = fakeFfmpegSession({ probeLog: m4aProbeLog(150), pcmForSlice: slicePcm })
    const second = fakeFfmpegSession({ probeLog: m4aProbeLog(150), pcmForSlice: slicePcm })
    // The second file's probe never answers by itself, so it is still loading at the end.
    second.run.mockImplementation(() => new Promise(() => {}))
    let firstOpened: ((session: typeof first) => void) | undefined
    vi.mocked(openFfmpeg)
      .mockImplementationOnce(() => new Promise((resolve) => (firstOpened = resolve)))
      .mockResolvedValueOnce(second)
    const store = useSourceFileStore()

    const loadingFirst = store.load(file)
    store.cancel()
    void store.load(new File(['y'], 'second.m4a'))
    await vi.waitFor(() => {
      expect(second.run).toHaveBeenCalled()
    })
    // The first file's ffmpeg finishes loading only now, after the second load has started.
    firstOpened?.(first)
    await loadingFirst
    store.cancel()

    expect(first.close).toHaveBeenCalled()
    expect(second.close).toHaveBeenCalled()
    expect(store.status).toBe('empty')
  })

  it('forgets everything on reset', async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: m4aProbeLog(2), pcm: toneThenSilencePcm(44_100, 1, 0.5) }),
    )
    const store = useSourceFileStore()
    await store.load(file)

    store.reset()

    expect(store.status).toBe('empty')
    expect(store.file).toBeNull()
    expect(store.peaks).toBeNull()
    expect(store.loudness).toBeNull()
    expect(store.loudnessWindowSeconds).toBeNull()
  })

  it('clears the loudness curve of the previous file when a new load starts', async () => {
    vi.mocked(openFfmpeg).mockResolvedValue(
      fakeFfmpegSession({ probeLog: m4aProbeLog(2), pcm: toneThenSilencePcm(44_100, 1, 0.5) }),
    )
    const store = useSourceFileStore()
    await store.load(file)
    expect(store.loudness).not.toBeNull()
    // The second file's probe never answers by itself, so the load stays in progress.
    const second = fakeFfmpegSession({ probeLog: m4aProbeLog(2) })
    second.run.mockImplementation(() => new Promise(() => {}))
    vi.mocked(openFfmpeg).mockResolvedValue(second)

    void store.load(new File(['y'], 'second.m4a'))

    expect(store.status).toBe('loading')
    expect(store.loudness).toBeNull()
    expect(store.loudnessWindowSeconds).toBeNull()
  })

  describe('the ffmpeg core download', () => {
    type OnProgress = ((fraction: number) => void) | undefined

    /*
    Makes the next `openFfmpeg` wait on a download the test drives: `progress` reaches the
    callback the store passed, `finish` lets `openFfmpeg` resolve and `fail` makes it reject.
    */
    function pendingDownload() {
      let onProgress: OnProgress
      let finish!: (session: ReturnType<typeof readySession>) => void
      let fail!: (error: Error) => void
      vi.mocked(openFfmpeg).mockImplementationOnce(
        (_file, options) =>
          new Promise((resolve, reject) => {
            onProgress = options?.onDownloadProgress
            finish = resolve as typeof finish
            fail = reject
          }),
      )
      return {
        progress: (fraction: number) => onProgress?.(fraction),
        finish: () => {
          finish(readySession())
        },
        fail: (error: Error) => {
          fail(error)
        },
      }
    }

    it('holds the fraction while progress comes in, and nothing once the download is done', async () => {
      const download = pendingDownload()
      const store = useSourceFileStore()
      expect(store.downloadFraction).toBeNull()

      const loading = store.load(file)
      download.progress(0)
      expect(store.downloadFraction).toBe(0)
      download.progress(0.38)
      expect(store.downloadFraction).toBeCloseTo(0.38)
      download.progress(1)
      expect(store.downloadFraction).toBeNull()
      expect(store.status).toBe('loading')

      download.finish()
      await loading
      expect(store.status).toBe('ready')
      expect(store.downloadFraction).toBeNull()
    })

    it('holds no fraction when nothing is downloaded', async () => {
      vi.mocked(openFfmpeg).mockResolvedValue(readySession())
      const store = useSourceFileStore()

      await store.load(file)

      expect(vi.mocked(openFfmpeg)).toHaveBeenCalledWith(file, {
        onDownloadProgress: expect.any(Function),
        signal: expect.any(AbortSignal),
      })
      expect(store.downloadFraction).toBeNull()
    })

    it('names the step "downloading ffmpeg" when the download fails, with its reason', async () => {
      const download = pendingDownload()
      const store = useSourceFileStore()
      const loading = store.load(file)
      download.progress(0.2)

      download.fail(new CoreDownloadError('The download stalled: no data for 30 s'))
      await loading

      expect(store.status).toBe('failed')
      expect(store.failure).toEqual({
        kind: 'failed',
        step: 'downloading ffmpeg',
        reason: 'The download stalled: no data for 30 s',
      })
      expect(store.downloadFraction).toBeNull()
    })

    it('keeps the step "probe" when ffmpeg itself fails to load after the download', async () => {
      const download = pendingDownload()
      const store = useSourceFileStore()
      const loading = store.load(file)
      download.progress(1)

      download.fail(new Error('ffmpeg did not finish loading within 180 s'))
      await loading

      expect(store.failure).toEqual({
        kind: 'failed',
        step: 'probe',
        reason: 'ffmpeg did not finish loading within 180 s',
      })
    })

    it('cancels mid-download: the store is empty, and later progress changes nothing', async () => {
      const download = pendingDownload()
      const store = useSourceFileStore()
      const loading = store.load(file)
      download.progress(0.5)

      store.cancel()
      download.progress(0.6)

      expect(store.status).toBe('empty')
      expect(store.downloadFraction).toBeNull()
      download.finish()
      await loading
      expect(store.status).toBe('empty')
    })

    it("aborts the load's signal on Cancel and on a newer load, so no ffmpeg worker starts for it", async () => {
      pendingDownload()
      const store = useSourceFileStore()
      void store.load(file)
      const first = vi.mocked(openFfmpeg).mock.calls.at(-1)?.[1]?.signal
      expect(first?.aborted).toBe(false)

      store.cancel()
      expect(first?.aborted).toBe(true)

      pendingDownload()
      void store.load(file)
      const second = vi.mocked(openFfmpeg).mock.calls.at(-1)?.[1]?.signal
      expect(second?.aborted).toBe(false)
      pendingDownload()
      void store.load(file)
      expect(second?.aborted).toBe(true)
    })

    it('ignores the progress of a load that a newer load has replaced', async () => {
      const first = pendingDownload()
      const store = useSourceFileStore()
      void store.load(file)
      first.progress(0.5)
      store.cancel()
      const second = pendingDownload()
      void store.load(new File(['y'], 'second.m4a'))
      expect(store.downloadFraction).toBeNull()

      first.progress(0.9)
      expect(store.downloadFraction).toBeNull()
      second.progress(0.55)
      expect(store.downloadFraction).toBeCloseTo(0.55)
    })
  })

  describe('asking the browser to keep its stored data', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('asks once, when the first file is ready, and not while it is still loading', async () => {
      const persist = vi.fn(() => Promise.resolve(true))
      stubPersist(persist)
      let finish!: (session: ReturnType<typeof readySession>) => void
      vi.mocked(openFfmpeg).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve as typeof finish
          }),
      )
      const store = useSourceFileStore()

      const loading = store.load(file)
      expect(persist).not.toHaveBeenCalled()
      finish(readySession())
      await loading

      expect(store.status).toBe('ready')
      expect(persist).toHaveBeenCalledTimes(1)
    })

    it('does not ask after a failed load', async () => {
      const persist = vi.fn(() => Promise.resolve(true))
      stubPersist(persist)
      vi.mocked(openFfmpeg).mockResolvedValue(
        fakeFfmpegSession({
          probeLog: m4aProbeLog(30),
          decodeError: 'Error while decoding stream',
        }),
      )
      const store = useSourceFileStore()

      await store.load(file)

      expect(store.status).toBe('failed')
      expect(persist).not.toHaveBeenCalled()
    })

    it('does not ask again for a second file', async () => {
      const persist = vi.fn(() => Promise.resolve(true))
      stubPersist(persist)
      const store = useSourceFileStore()
      vi.mocked(openFfmpeg).mockResolvedValueOnce(readySession())
      await store.load(file)
      vi.mocked(openFfmpeg).mockResolvedValueOnce(readySession())

      await store.load(file)

      expect(store.status).toBe('ready')
      expect(persist).toHaveBeenCalledTimes(1)
    })

    it('asks at the first ready file even when an earlier load failed', async () => {
      const persist = vi.fn(() => Promise.resolve(true))
      stubPersist(persist)
      const store = useSourceFileStore()
      vi.mocked(openFfmpeg).mockRejectedValueOnce(new Error('no core'))
      await store.load(file)
      expect(persist).not.toHaveBeenCalled()
      vi.mocked(openFfmpeg).mockResolvedValueOnce(readySession())

      await store.load(file)

      expect(persist).toHaveBeenCalledTimes(1)
    })

    it('loads as usual when the browser refuses', async () => {
      stubPersist(() => Promise.resolve(false))
      vi.mocked(openFfmpeg).mockResolvedValue(readySession())
      const store = useSourceFileStore()

      await store.load(file)

      expect(store.status).toBe('ready')
      expect(store.failure).toBeNull()
    })

    it('loads as usual when the request rejects, and reports nothing', async () => {
      stubPersist(() => Promise.reject(new Error('blocked')))
      vi.mocked(openFfmpeg).mockResolvedValue(readySession())
      const store = useSourceFileStore()

      await store.load(file)
      // A rejection nobody handles would fail the run as an unhandled rejection.
      await Promise.resolve()

      expect(store.status).toBe('ready')
      expect(store.failure).toBeNull()
    })

    it('loads as usual when the request throws at once', async () => {
      stubPersist(() => {
        throw new Error('blocked')
      })
      vi.mocked(openFfmpeg).mockResolvedValue(readySession())
      const store = useSourceFileStore()

      await store.load(file)

      expect(store.status).toBe('ready')
    })

    it.each([
      ['no storage manager', {}],
      ['no persist on it', { storage: {} }],
    ])('loads as usual with %s', async (_name, navigatorStub) => {
      vi.stubGlobal('navigator', navigatorStub)
      vi.mocked(openFfmpeg).mockResolvedValue(readySession())
      const store = useSourceFileStore()

      await store.load(file)

      expect(store.status).toBe('ready')
    })
  })

  describe('the open session and clips', () => {
    const wav = Uint8Array.of(0x52, 0x49, 0x46, 0x46)
    const loadedSession = () =>
      fakeFfmpegSession({
        probeLog: m4aProbeLog(30),
        pcm: toneThenSilencePcm(44_100, 15, 0.5),
        wav,
      })
    const clipRuns = (session: ReturnType<typeof loadedSession>) =>
      session.run.mock.calls.filter(([command]) => command.includes('wav'))

    it('keeps the session open after a successful load', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()

      await store.load(file)

      expect(store.status).toBe('ready')
      expect(session.close).not.toHaveBeenCalled()
    })

    it('closes the session of a load that fails', async () => {
      const session = fakeFfmpegSession({
        probeLog: m4aProbeLog(30),
        decodeError: 'Error while decoding stream',
      })
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()

      await store.load(file)

      expect(store.status).toBe('failed')
      expect(session.close).toHaveBeenCalled()
    })

    it('closes the session on reset, so New file frees the worker', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)

      store.reset()

      expect(session.close).toHaveBeenCalledOnce()
    })

    it('closes the session on cancel', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)

      store.cancel()

      expect(session.close).toHaveBeenCalled()
    })

    it('closes the old session when a new load starts', async () => {
      const first = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(first)
      const store = useSourceFileStore()
      await store.load(file)
      const second = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(second)

      await store.load(new File(['y'], 'second.m4a'))

      expect(first.close).toHaveBeenCalledOnce()
      expect(second.close).not.toHaveBeenCalled()
    })

    it('decodes a clip of the given start and length in the open session and gives its bytes and start', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)

      const clip = await store.clip(11, 8)

      expect(clip).toEqual({ wav, startSeconds: 11, lengthSeconds: 8 })
      expect(clipRuns(session)).toHaveLength(1)
      expect(clipRuns(session)[0]?.[0]).toContain('/in/source.m4a')
    })

    it('rejects a clip before a file is ready', async () => {
      const store = useSourceFileStore()

      await expect(store.clip(11, 8)).rejects.toThrow('No file is ready')
    })

    it('rejects a clip while the file is still loading', async () => {
      const session = loadedSession()
      session.run.mockImplementation(() => new Promise(() => {}))
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      void store.load(file)
      await vi.waitFor(() => {
        expect(session.run).toHaveBeenCalled()
      })

      await expect(store.clip(11, 8)).rejects.toThrow('No file is ready')
    })

    it('runs clips one at a time, in the order they were pressed', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      // The first clip holds ffmpeg until released.
      const decode = session.run.getMockImplementation()!
      let release: (() => void) | undefined
      session.run.mockImplementationOnce(
        async (command, timeoutMs) =>
          new Promise((resolve) => {
            release = () => {
              resolve(decode(command, timeoutMs))
            }
          }),
      )

      const first = store.clip(6, 8)
      const second = store.clip(16, 8)
      await vi.waitFor(() => {
        expect(clipRuns(session)).toHaveLength(1)
      })
      // Give a wrongly parallel second call the chance to start.
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(clipRuns(session)).toHaveLength(1)
      release?.()

      await expect(first).resolves.toMatchObject({ startSeconds: 6 })
      await expect(second).resolves.toMatchObject({ startSeconds: 16 })
      expect(clipRuns(session)).toHaveLength(2)
    })

    it('still runs the next clip after one fails', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      session.run.mockResolvedValueOnce({ exitCode: 1, log: ['Invalid data'] })

      await expect(store.clip(6, 8)).rejects.toThrow('Invalid data')
      await expect(store.clip(16, 8)).resolves.toMatchObject({ startSeconds: 16 })
    })

    it('rejects a queued clip whose file was reset meanwhile, without decoding', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      const decode = session.run.getMockImplementation()!
      let release: (() => void) | undefined
      session.run.mockImplementationOnce(
        async (command, timeoutMs) =>
          new Promise((resolve) => {
            release = () => {
              resolve(decode(command, timeoutMs))
            }
          }),
      )
      const first = store.clip(6, 8)
      const second = store.clip(16, 8)
      await vi.waitFor(() => {
        expect(clipRuns(session)).toHaveLength(1)
      })

      store.reset()
      release?.()

      await expect(first).rejects.toBeInstanceOf(FileReplacedError)
      await expect(second).rejects.toBeInstanceOf(FileReplacedError)
      expect(clipRuns(session)).toHaveLength(1)
    })

    it('interrupts a running clip whose signal is aborted, and the next clip still runs', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      // The clip hangs until the session is interrupted, as a slow decode would.
      session.run.mockImplementationOnce(
        async () =>
          new Promise((_, reject) => {
            session.interrupt.mockImplementationOnce(() => {
              reject(new Error('ffmpeg was stopped'))
            })
          }),
      )
      const unwanted = new AbortController()
      const first = store.clip(6, 8, unwanted.signal)
      const second = store.clip(16, 8)
      await vi.waitFor(() => {
        expect(clipRuns(session)).toHaveLength(1)
      })

      unwanted.abort()

      await expect(first).rejects.toThrow('ffmpeg was stopped')
      await expect(second).resolves.toMatchObject({ startSeconds: 16 })
    })

    it('rejects a queued clip whose signal is aborted, without running it', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      const decode = session.run.getMockImplementation()!
      let release: (() => void) | undefined
      session.run.mockImplementationOnce(
        async (command, timeoutMs) =>
          new Promise((resolve) => {
            release = () => {
              resolve(decode(command, timeoutMs))
            }
          }),
      )
      const first = store.clip(6, 8)
      const unwanted = new AbortController()
      const second = store.clip(16, 8, unwanted.signal)
      await vi.waitFor(() => {
        expect(clipRuns(session)).toHaveLength(1)
      })

      unwanted.abort()
      release?.()

      await expect(first).resolves.toMatchObject({ startSeconds: 6 })
      await expect(second).rejects.toThrow()
      expect(clipRuns(session)).toHaveLength(1)
      expect(session.interrupt).not.toHaveBeenCalled()
    })

    it('leaves a clip that ended alone when its signal is aborted later', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      const done = new AbortController()
      await store.clip(6, 8, done.signal)

      done.abort()

      expect(session.interrupt).not.toHaveBeenCalled()
    })

    it('rejects a clip after reset', async () => {
      vi.mocked(openFfmpeg).mockResolvedValue(loadedSession())
      const store = useSourceFileStore()
      await store.load(file)

      store.reset()

      await expect(store.clip(11, 8)).rejects.toThrow('No file is ready')
    })
  })

  describe('cutting a track in the open session', () => {
    const track = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70)
    const tags = { title: 'evening-set-vol3 02', track: '2/8', album: 'evening-set-vol3' }
    const loadedSession = () =>
      fakeFfmpegSession({
        probeLog: m4aProbeLog(30),
        pcm: toneThenSilencePcm(44_100, 15, 0.5),
        track,
      })
    const cutRuns = (session: ReturnType<typeof loadedSession>) =>
      session.run.mock.calls.filter(([command]) => command.includes('copy'))
    // The next ffmpeg call holds until released, then answers as the fake would.
    const holdNextCall = (session: ReturnType<typeof loadedSession>) => {
      const answer = session.run.getMockImplementation()!
      const held: { release?: () => void } = {}
      session.run.mockImplementationOnce(
        async (command, timeoutMs) =>
          new Promise((resolve) => {
            held.release = () => {
              resolve(answer(command, timeoutMs))
            }
          }),
      )
      return held
    }

    it("cuts the track in the open session, in the file's own format, and gives its bytes", async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)

      const bytes = await store.cutTrack({ startSeconds: 10, endSeconds: 20, tags })

      expect(bytes).toEqual(track)
      expect(cutRuns(session)).toHaveLength(1)
      const command = cutRuns(session)[0]?.[0] ?? []
      expect(command).toContain('/in/source.m4a')
      expect(command.slice(3, 7)).toEqual(['-ss', '10', '-to', '20'])
      expect(command.at(-1)).toBe('/track.m4a')
    })

    it('cuts with the seek method the probe read: an MP3 seeks twice', async () => {
      const session = fakeFfmpegSession({
        probeLog: mp3ProbeLog(30),
        pcm: toneThenSilencePcm(44_100, 15, 0.5),
        track,
      })
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)

      await store.cutTrack({ startSeconds: 10, endSeconds: 20, tags })

      const command = cutRuns(session)[0]?.[0] ?? []
      expect(store.format).toBe('mp3')
      expect(command.slice(3, 5)).toEqual(['-ss', '8'])
      expect(command).toContain('-t')
    })

    it('cuts a WebM video as an .opus track, seeking twice, with its tags on the stream', async () => {
      const session = fakeFfmpegSession({
        probeLog: webmProbeLog(30),
        inputPath: '/in/source.webm',
        pcm: toneThenSilencePcm(48_000, 15, 0.5),
        track,
      })
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(new File(['x'], 'mix.webm'))

      await store.cutTrack({ startSeconds: 10, endSeconds: 20, tags })

      const command = cutRuns(session)[0]?.[0] ?? []
      expect(store.format).toBe('opus')
      expect(command.slice(2, 8)).toEqual(['-y', '-ss', '8', '-i', '/in/source.webm', '-ss'])
      expect(command).toContain('-t')
      expect(command).not.toContain('-to')
      expect(command).toContain('-metadata:s:a:0')
      expect(command.at(-1)).toBe('/track.opus')
    })

    it('rejects a cut before a file is ready', async () => {
      const store = useSourceFileStore()

      await expect(
        store.cutTrack({ startSeconds: 0, endSeconds: undefined, tags }),
      ).rejects.toThrow('No file is ready')
    })

    it('runs a cut and a clip one at a time, in the order they were asked for', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      const held = holdNextCall(session)

      const cut = store.cutTrack({ startSeconds: 0, endSeconds: 10, tags })
      const clip = store.clip(16, 8)
      await vi.waitFor(() => {
        expect(cutRuns(session)).toHaveLength(1)
      })
      // Give a wrongly parallel clip the chance to start.
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(session.run.mock.calls.filter(([command]) => command.includes('wav'))).toHaveLength(0)
      held.release?.()

      await expect(cut).resolves.toEqual(track)
      await expect(clip).resolves.toMatchObject({ startSeconds: 16 })
    })

    it("still runs the next cut after one fails, and the failure is ffmpeg's last line", async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      session.run.mockResolvedValueOnce({ exitCode: 1, log: ['Invalid data'] })

      await expect(store.cutTrack({ startSeconds: 0, endSeconds: 10, tags })).rejects.toThrow(
        'Invalid data',
      )
      await expect(store.cutTrack({ startSeconds: 10, endSeconds: 20, tags })).resolves.toEqual(
        track,
      )
    })

    it('rejects a cut whose file was reset meanwhile, and a queued one without running it', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      const held = holdNextCall(session)
      const first = store.cutTrack({ startSeconds: 0, endSeconds: 10, tags })
      const second = store.cutTrack({ startSeconds: 10, endSeconds: 20, tags })
      await vi.waitFor(() => {
        expect(cutRuns(session)).toHaveLength(1)
      })

      store.reset()
      held.release?.()

      await expect(first).rejects.toBeInstanceOf(FileReplacedError)
      await expect(second).rejects.toBeInstanceOf(FileReplacedError)
      expect(cutRuns(session)).toHaveLength(1)
    })

    it('stops the running call through the session, and the next cut still runs', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      session.run.mockImplementationOnce(
        async () =>
          new Promise((_, reject) => {
            session.interrupt.mockImplementationOnce(() => {
              reject(new Error('ffmpeg was stopped'))
            })
          }),
      )
      const cut = store.cutTrack({ startSeconds: 0, endSeconds: 10, tags })
      await vi.waitFor(() => {
        expect(cutRuns(session)).toHaveLength(1)
      })

      store.stopCuts()

      await expect(cut).rejects.toThrow('ffmpeg was stopped')
      expect(session.close).not.toHaveBeenCalled()
      await expect(store.cutTrack({ startSeconds: 10, endSeconds: 20, tags })).resolves.toEqual(
        track,
      )
    })

    it('rejects a cut queued behind a clip without running it, and a later cut still runs', async () => {
      const session = loadedSession()
      vi.mocked(openFfmpeg).mockResolvedValue(session)
      const store = useSourceFileStore()
      await store.load(file)
      // The clip hangs until the session is interrupted, as a slow decode would.
      session.run.mockImplementationOnce(
        async () =>
          new Promise((_, reject) => {
            session.interrupt.mockImplementationOnce(() => {
              reject(new Error('ffmpeg was stopped'))
            })
          }),
      )
      const clip = store.clip(16, 8)
      const queued = store.cutTrack({ startSeconds: 0, endSeconds: 10, tags })
      const alsoQueued = store.cutTrack({ startSeconds: 10, endSeconds: 20, tags })
      await vi.waitFor(() => {
        expect(session.run.mock.calls.filter(([command]) => command.includes('wav'))).toHaveLength(
          1,
        )
      })

      store.stopCuts()

      await expect(clip).rejects.toThrow('ffmpeg was stopped')
      await expect(queued).rejects.toThrow('ffmpeg was stopped')
      await expect(alsoQueued).rejects.toThrow('ffmpeg was stopped')
      expect(cutRuns(session)).toHaveLength(0)
      await expect(
        store.cutTrack({ startSeconds: 20, endSeconds: undefined, tags }),
      ).resolves.toEqual(track)
      expect(cutRuns(session)).toHaveLength(1)
    })

    it('does nothing to stop a cut when no file is open', () => {
      const store = useSourceFileStore()

      expect(() => {
        store.stopCuts()
      }).not.toThrow()
    })
  })
})
