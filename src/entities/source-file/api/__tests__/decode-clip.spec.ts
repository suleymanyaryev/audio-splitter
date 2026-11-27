import { describe, it, expect } from 'vitest'

import { fakeFfmpegSession, m4aProbeLog } from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { decodeClip } from '../decode-clip.ts'

describe('decodeClip', () => {
  it('decodes the asked start and length with 1 s of pre-roll, to WAV', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    const clip = await decodeClip(ffmpeg, 325.05, 8, 3686.21)

    /*
    docs/concepts/06-seeking-compressed-audio.md's worked example: 325.05 to 333.05 s, seeking 1 s
    earlier on the input.
    */
    expect(ffmpeg.run).toHaveBeenCalledOnce()
    expect(ffmpeg.run.mock.calls[0]?.[0]).toEqual([
      '-v',
      'error',
      '-y',
      '-ss',
      '324.05',
      '-i',
      '/in/source.m4a',
      '-ss',
      '1',
      '-t',
      '8',
      '-map',
      '0:a:0',
      '-c:a',
      'pcm_s16le',
      '-f',
      'wav',
      '/clip.wav',
    ])
    expect(clip).toMatchObject({ startSeconds: 325.05, lengthSeconds: 8 })
  })

  it('gives the WAV bytes and takes the file out of ffmpeg', async () => {
    const wav = Uint8Array.of(0x52, 0x49, 0x46, 0x46)
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30), wav })

    const clip = await decodeClip(ffmpeg, 11, 8, 30)

    expect(clip.wav).toEqual(wav)
    expect(ffmpeg.takeFile).toHaveBeenCalledWith('/clip.wav')
  })

  it('has no pre-roll and no seek on the input when the clip starts at 0 s', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    const clip = await decodeClip(ffmpeg, 0, 7, 30)

    expect(ffmpeg.run.mock.calls[0]?.[0]).toEqual([
      '-v',
      'error',
      '-y',
      '-i',
      '/in/source.m4a',
      '-t',
      '7',
      '-map',
      '0:a:0',
      '-c:a',
      'pcm_s16le',
      '-f',
      'wav',
      '/clip.wav',
    ])
    expect(clip).toMatchObject({ startSeconds: 0, lengthSeconds: 7 })
  })

  it('uses the room before the start as pre-roll when it is under 1 s', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    const clip = await decodeClip(ffmpeg, 0.5, 8, 30)

    // 0.5 to 8.5 s: only 0.5 s of room, so the input seeks to 0 and the output skips 0.5 s.
    const command = ffmpeg.run.mock.calls[0]?.[0] ?? []
    expect(command.slice(3, 10)).toEqual(['-ss', '0', '-i', '/in/source.m4a', '-ss', '0.5', '-t'])
    expect(command[10]).toBe('8')
    expect(clip).toMatchObject({ startSeconds: 0.5, lengthSeconds: 8 })
  })

  it('ends the clip at the end of the file', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    const clip = await decodeClip(ffmpeg, 3681, 8, 3686.21)

    // Asked for 3681 to 3689 s, got 3681 to 3686.21 s: 5.21 s, and 1 s of pre-roll from 3680 s.
    const command = ffmpeg.run.mock.calls[0]?.[0] ?? []
    expect(command[command.indexOf('-t') + 1]).toBe('5.21')
    expect(clip).toMatchObject({ startSeconds: 3681, lengthSeconds: 5.21 })
  })

  it('decodes a 10 min range with the same 1 s pre-roll', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    const clip = await decodeClip(ffmpeg, 2400, 600, 3686.21)

    const command = ffmpeg.run.mock.calls[0]?.[0] ?? []
    expect(command.slice(3, 11)).toEqual([
      '-ss',
      '2399',
      '-i',
      '/in/source.m4a',
      '-ss',
      '1',
      '-t',
      '600',
    ])
    expect(clip).toMatchObject({ startSeconds: 2400, lengthSeconds: 600 })
  })

  it('shortens a clip asked to begin before the start of the file', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    const clip = await decodeClip(ffmpeg, -2, 8, 30)

    expect(clip).toMatchObject({ startSeconds: 0, lengthSeconds: 6 })
  })

  it('ends a long range at the end of the file', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    const clip = await decodeClip(ffmpeg, 3500, 600, 3686.21)

    expect(clip).toMatchObject({ startSeconds: 3500, lengthSeconds: 186.21 })
  })

  it('writes seconds without float noise, to the millisecond', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    // 329.05 - 4 is 325.04999999999995 in floats, and 0.1 + 0.2 is 0.30000000000000004.
    const clip = await decodeClip(ffmpeg, 100.1 + 0.2 - 4, 8.1 + 0.2 - 0.3, 1000)

    const command = ffmpeg.run.mock.calls[0]?.[0] ?? []
    expect(command.filter((part) => /^\d+\.\d{4,}$/.test(part))).toEqual([])
    expect(clip.startSeconds).toBeCloseTo(96.3, 12)
  })

  it('gives the watchdog 30 s, far above the clip', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await decodeClip(ffmpeg, 11, 8, 30)

    expect(ffmpeg.run.mock.calls[0]?.[1]).toBe(30_000)
  })

  it("throws ffmpeg's last log line when the decode fails", async () => {
    const ffmpeg = fakeFfmpegSession({
      probeLog: m4aProbeLog(30),
      clipError: 'Invalid data found when processing input',
    })

    await expect(decodeClip(ffmpeg, 11, 8, 30)).rejects.toThrow(
      'Invalid data found when processing input',
    )
    expect(ffmpeg.takeFile).not.toHaveBeenCalled()
  })
})
