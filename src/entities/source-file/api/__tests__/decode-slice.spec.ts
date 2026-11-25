import { describe, it, expect } from 'vitest'

import { fakeFfmpegSession, m4aProbeLog } from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { decodeSlice, sliceCount } from '../decode-slice.ts'

describe('sliceCount', () => {
  it('rounds up, so the last, shorter slice is counted', () => {
    expect(sliceCount(3686.21, 'm4a')).toBe(62)
    expect(sliceCount(30, 'm4a')).toBe(1)
  })

  it('does not add an empty slice when the duration is a whole number of slices', () => {
    expect(sliceCount(120, 'm4a')).toBe(2)
    expect(sliceCount(120.01, 'm4a')).toBe(3)
  })

  it('cuts MP3 slices of 300 s and the other formats of 60 s', () => {
    expect(sliceCount(3686.21, 'mp3')).toBe(13)
    expect(sliceCount(3686.21, 'opus')).toBe(62)
    expect(sliceCount(3686.21, 'ogg')).toBe(62)
    expect(sliceCount(300, 'mp3')).toBe(1)
    expect(sliceCount(300.01, 'mp3')).toBe(2)
  })
})

describe('decodeSlice', () => {
  it('decodes the first slice from the start, with no pre-roll', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await decodeSlice(ffmpeg, 0, 'm4a')

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

    await decodeSlice(ffmpeg, 3, 'm4a')

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

  it('cuts an MP3 in slices of 300 s, from the start', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await decodeSlice(ffmpeg, 0, 'mp3')

    expect(ffmpeg.run.mock.calls[0]?.[0]).toEqual([
      '-v',
      'error',
      '-i',
      '/in/source.m4a',
      '-t',
      '300',
      '-map',
      '0:a:0',
      '-f',
      'f32le',
      '/slice.pcm',
    ])
  })

  it('starts a later MP3 slice 1 s before its 300 s multiple', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await decodeSlice(ffmpeg, 2, 'mp3')

    // Slice 2 is 600 s to 900 s: seek to 599 s on the input, then skip 1 s of the decoded audio.
    expect(ffmpeg.run.mock.calls[0]?.[0]).toEqual([
      '-v',
      'error',
      '-ss',
      '599',
      '-i',
      '/in/source.m4a',
      '-ss',
      '1',
      '-t',
      '300',
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

    const samples = await decodeSlice(ffmpeg, 0, 'm4a')

    expect(samples).toEqual(pcm)
    expect(ffmpeg.takeFile).toHaveBeenCalledWith('/slice.pcm')
  })

  it("throws ffmpeg's last log line when the decode fails", async () => {
    const ffmpeg = fakeFfmpegSession({
      probeLog: m4aProbeLog(30),
      decodeError: 'Invalid data found when processing input',
    })

    await expect(decodeSlice(ffmpeg, 1, 'm4a')).rejects.toThrow(
      'Invalid data found when processing input',
    )
    expect(ffmpeg.takeFile).not.toHaveBeenCalled()
  })
})
