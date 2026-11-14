import { describe, it, expect } from 'vitest'

import { fakeFfmpegSession, m4aProbeLog } from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { decodeSlice, sliceCount, SLICE_SECONDS } from '../decode-slice.ts'

describe('sliceCount', () => {
  it('rounds up, so the last, shorter slice is counted', () => {
    expect(sliceCount(3686.21)).toBe(62)
    expect(sliceCount(30)).toBe(1)
  })

  it('does not add an empty slice when the duration is a whole number of slices', () => {
    expect(sliceCount(120)).toBe(2)
    expect(sliceCount(120.01)).toBe(3)
  })

  it('cuts slices of 60 s', () => {
    expect(SLICE_SECONDS).toBe(60)
  })
})

describe('decodeSlice', () => {
  it('decodes the first slice from the start, with no pre-roll', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await decodeSlice(ffmpeg, 0)

    expect(ffmpeg.run).toHaveBeenCalledOnce()
    expect(ffmpeg.run.mock.calls[0]?.[0]).toEqual([
      '-v',
      'error',
      '-i',
      '/in/source.m4a',
      '-t',
      '60',
      '-map',
      '0:a:0',
      '-f',
      'f32le',
      '/slice.pcm',
    ])
  })

  it('starts a later slice 1 s early and drops that second after decoding', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await decodeSlice(ffmpeg, 3)

    // Slice 3 is 180 s to 240 s: seek to 179 s on the input, then skip 1 s of the decoded audio.
    expect(ffmpeg.run.mock.calls[0]?.[0]).toEqual([
      '-v',
      'error',
      '-ss',
      '179',
      '-i',
      '/in/source.m4a',
      '-ss',
      '1',
      '-t',
      '60',
      '-map',
      '0:a:0',
      '-f',
      'f32le',
      '/slice.pcm',
    ])
  })

  it('gives the slice as floats and takes its file out of ffmpeg', async () => {
    const pcm = Float32Array.of(0.25, -0.5, 1, -1)
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30), pcm })

    const samples = await decodeSlice(ffmpeg, 0)

    expect(samples).toEqual(pcm)
    expect(ffmpeg.takeFile).toHaveBeenCalledWith('/slice.pcm')
  })

  it("throws ffmpeg's last log line when the decode fails", async () => {
    const ffmpeg = fakeFfmpegSession({
      probeLog: m4aProbeLog(30),
      decodeError: 'Invalid data found when processing input',
    })

    await expect(decodeSlice(ffmpeg, 1)).rejects.toThrow('Invalid data found when processing input')
    expect(ffmpeg.takeFile).not.toHaveBeenCalled()
  })
})
