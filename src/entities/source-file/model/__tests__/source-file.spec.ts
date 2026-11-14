import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { openFfmpeg } from '@/shared/api/ffmpeg/ffmpeg.ts'
import {
  fakeFfmpegSession,
  m4aProbeLog,
  toneThenSilencePcm,
  vorbisProbeLog,
} from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { useSourceFileStore } from '../source-file.ts'

vi.mock('@/shared/api/ffmpeg/ffmpeg.ts', () => ({ openFfmpeg: vi.fn() }))

const file = new File(['x'], 'evening-set-vol3.m4a')

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
      step: 'decode',
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
