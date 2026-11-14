import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { openFfmpeg } from '@/shared/api/ffmpeg/ffmpeg.ts'
import {
  fakeFfmpegSession,
  m4aProbeLog,
  mp3ProbeLog,
  toneThenSilencePcm,
  vorbisProbeLog,
} from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { downmix } from '@/shared/lib/audio/downmix.ts'
import { createPeaksBuilder } from '@/shared/lib/audio/peaks-builder.ts'
import { useSourceFileStore } from '../source-file.ts'

vi.mock('@/shared/api/ffmpeg/ffmpeg.ts', () => ({ openFfmpeg: vi.fn() }))

const file = new File(['x'], 'evening-set-vol3.m4a')

// A 150 s file is 2.5 slices. Each slice has its own loudness, so a slice read twice or in the
// wrong place shows in the peaks. The slices are 60 s, 60 s and 30 s of stereo at 44.1 kHz.
const slicePcm = (index: number) =>
  index < 2
    ? toneThenSilencePcm(44_100, 30, 0.2 * (index + 1))
    : toneThenSilencePcm(44_100, 15, 0.6)

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
    expect(session.close).toHaveBeenCalled()
  })

  it('names what an unsupported file is and does not decode it', async () => {
    const session = fakeFfmpegSession({ probeLog: vorbisProbeLog(30) })
    vi.mocked(openFfmpeg).mockResolvedValue(session)
    const store = useSourceFileStore()

    await store.load(file)

    expect(store.status).toBe('failed')
    expect(store.failure).toEqual({
      kind: 'unsupported',
      message:
        'This file is Vorbis in Ogg; the splitter supports AAC in .m4a, MP3 and Opus in .opus.',
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
  })
})
