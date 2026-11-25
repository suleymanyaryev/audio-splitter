import { describe, it, expect } from 'vitest'

import { fakeFfmpegSession, m4aProbeLog } from '@/shared/api/ffmpeg/__tests__/fake-ffmpeg.ts'
import { cutTrack } from '../cut-track.ts'

const tags = { title: 'sample1 02', track: '2/8', album: 'sample1' }

const commandOf = (ffmpeg: ReturnType<typeof fakeFfmpegSession>) => ffmpeg.run.mock.calls[0]?.[0]

describe('cutTrack', () => {
  it('copies a middle .m4a track with -ss and -to before the input', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 231.55,
      endSeconds: 877.1,
      tags,
    })

    // The concept note's worked example: track 2 of 8 of sample1.m4a.
    expect(ffmpeg.run).toHaveBeenCalledOnce()
    expect(commandOf(ffmpeg)).toEqual([
      '-v',
      'error',
      '-y',
      '-ss',
      '231.55',
      '-to',
      '877.1',
      '-i',
      '/in/source.m4a',
      '-map',
      '0:a:0',
      '-c',
      'copy',
      '-map_chapters',
      '-1',
      '-metadata',
      'title=sample1 02',
      '-metadata',
      'track=2/8',
      '-metadata',
      'album=sample1',
      '-movflags',
      '+faststart',
      '/track.m4a',
    ])
  })

  it('has no -ss for the first track, which starts with the file', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 0,
      endSeconds: 231.55,
      tags,
    })

    const command = commandOf(ffmpeg) ?? []
    expect(command.slice(3, 7)).toEqual(['-to', '231.55', '-i', '/in/source.m4a'])
    expect(command).not.toContain('-ss')
  })

  it('has no -to for the last track, which runs to the end of the file', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 3549.35,
      endSeconds: undefined,
      tags,
    })

    const command = commandOf(ffmpeg) ?? []
    expect(command.slice(3, 6)).toEqual(['-ss', '3549.35', '-i'])
    expect(command).not.toContain('-to')
  })

  it('has neither for a file with no splits: one track over the whole file', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 0,
      endSeconds: undefined,
      tags,
    })

    const command = commandOf(ffmpeg) ?? []
    expect(command.slice(0, 4)).toEqual(['-v', 'error', '-y', '-i'])
    expect(command).not.toContain('-ss')
    expect(command).not.toContain('-to')
  })

  it('writes seconds without float noise, to the millisecond', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    // 0.1 + 0.2 is 0.30000000000000004 in floats.
    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 0.1 + 0.2,
      endSeconds: 100.1 + 0.2,
      tags,
    })

    const command = commandOf(ffmpeg) ?? []
    expect(command[command.indexOf('-ss') + 1]).toBe('0.3')
    expect(command[command.indexOf('-to') + 1]).toBe('100.3')
  })

  it('passes a title as one argument, exactly as given', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })
    const title = '-Café – ¿Qué? 日本 "live"'

    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 0,
      endSeconds: 10,
      tags: { ...tags, title },
    })

    expect(commandOf(ffmpeg)).toContain(`title=${title}`)
  })

  it('blanks the track tag of a file that is no track, so one the source had is not carried over', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 0,
      endSeconds: 10,
      tags: { ...tags, track: null },
    })

    const command = commandOf(ffmpeg) ?? []
    expect(command.filter((argument) => argument.startsWith('track='))).toEqual(['track='])
  })

  it("gives the track's bytes and takes the file out of ffmpeg", async () => {
    const track = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70)
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30), track })

    const bytes = await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'once',
      startSeconds: 0,
      endSeconds: 10,
      tags,
    })

    expect(bytes).toEqual(track)
    expect(ffmpeg.takeFile).toHaveBeenCalledWith('/track.m4a')
  })

  it('gives the watchdog 5 minutes', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(30) })

    await cutTrack(ffmpeg, { format: 'm4a', seek: 'once', startSeconds: 0, endSeconds: 10, tags })

    expect(ffmpeg.run.mock.calls[0]?.[1]).toBe(300_000)
  })

  it("throws ffmpeg's last log line when the cut fails", async () => {
    const ffmpeg = fakeFfmpegSession({
      probeLog: m4aProbeLog(30),
      cutError: 'Invalid data found when processing input',
    })

    await expect(
      cutTrack(ffmpeg, { format: 'm4a', seek: 'once', startSeconds: 0, endSeconds: 10, tags }),
    ).rejects.toThrow('Invalid data found when processing input')
    expect(ffmpeg.takeFile).not.toHaveBeenCalled()
  })

  it('seeks by the seek method and not by the format: an .m4a track can seek twice', async () => {
    const ffmpeg = fakeFfmpegSession({ probeLog: m4aProbeLog(3686) })

    await cutTrack(ffmpeg, {
      format: 'm4a',
      seek: 'twice',
      startSeconds: 231.55,
      endSeconds: 877.1,
      tags,
    })

    const command = commandOf(ffmpeg) ?? []
    expect(command).toContain('-t')
    expect(command).not.toContain('-to')
    // The tags and the extension still follow the format.
    expect(command).toContain('+faststart')
    expect(command.at(-1)).toBe('/track.m4a')
  })

  describe('.mp3 and .opus, which seek twice', () => {
    const copyTail = ['-map', '0:a:0', '-c', 'copy', '-map_chapters', '-1']

    it('copies a middle .mp3 track: a jump 2 s early, then the exact seek and -t', async () => {
      const ffmpeg = fakeFfmpegSession({ inputPath: '/in/source.mp3', probeLog: m4aProbeLog(3686) })

      await cutTrack(ffmpeg, {
        format: 'mp3',
        seek: 'twice',
        startSeconds: 231.55,
        endSeconds: 877.1,
        tags,
      })

      /*
      Start 231.55, so the jump lands at 229.55 and the exact seek is 2 s later; the length is
      877.1 - 231.55, which is 645.55 in the command and not -to's 877.1.
      */
      expect(commandOf(ffmpeg)).toEqual([
        '-v',
        'error',
        '-y',
        '-ss',
        '229.55',
        '-i',
        '/in/source.mp3',
        '-ss',
        '2',
        '-t',
        '645.55',
        ...copyTail,
        '-metadata',
        'title=sample1 02',
        '-metadata',
        'track=2/8',
        '-metadata',
        'album=sample1',
        '/track.mp3',
      ])
    })

    it('has no -ss at all for the first .mp3 track, which starts with the file', async () => {
      const ffmpeg = fakeFfmpegSession({ inputPath: '/in/source.mp3', probeLog: m4aProbeLog(3686) })

      await cutTrack(ffmpeg, {
        format: 'mp3',
        seek: 'twice',
        startSeconds: 0,
        endSeconds: 231.55,
        tags,
      })

      const command = commandOf(ffmpeg) ?? []
      expect(command.slice(3, 7)).toEqual(['-i', '/in/source.mp3', '-t', '231.55'])
      expect(command).not.toContain('-ss')
    })

    it('has no -t for the last .mp3 track, which runs to the end of the file', async () => {
      const ffmpeg = fakeFfmpegSession({ inputPath: '/in/source.mp3', probeLog: m4aProbeLog(3686) })

      await cutTrack(ffmpeg, {
        format: 'mp3',
        seek: 'twice',
        startSeconds: 3549.35,
        endSeconds: undefined,
        tags,
      })

      const command = commandOf(ffmpeg) ?? []
      expect(command.slice(3, 10)).toEqual([
        '-ss',
        '3547.35',
        '-i',
        '/in/source.mp3',
        '-ss',
        '2',
        ...copyTail.slice(0, 1),
      ])
      expect(command).not.toContain('-t')
      expect(command).not.toContain('-to')
    })

    it('never seeks before 0 for a track that starts inside the first 2 s', async () => {
      const ffmpeg = fakeFfmpegSession({ inputPath: '/in/source.mp3', probeLog: m4aProbeLog(30) })

      await cutTrack(ffmpeg, {
        format: 'mp3',
        seek: 'twice',
        startSeconds: 1.25,
        endSeconds: 10,
        tags,
      })

      // No jump (the file's start is already near enough); the exact seek is the whole start.
      const command = commandOf(ffmpeg) ?? []
      expect(command.slice(3, 9)).toEqual(['-i', '/in/source.mp3', '-ss', '1.25', '-t', '8.75'])
      expect(command.filter((argument) => argument === '-ss')).toHaveLength(1)
    })

    it('has neither seek nor -t for a file with no splits', async () => {
      const ffmpeg = fakeFfmpegSession({ inputPath: '/in/source.mp3', probeLog: m4aProbeLog(30) })

      await cutTrack(ffmpeg, {
        format: 'mp3',
        seek: 'twice',
        startSeconds: 0,
        endSeconds: undefined,
        tags,
      })

      const command = commandOf(ffmpeg) ?? []
      expect(command.slice(0, 5)).toEqual(['-v', 'error', '-y', '-i', '/in/source.mp3'])
      expect(command).not.toContain('-ss')
      expect(command).not.toContain('-t')
    })

    it('computes the exact seek and length from the millisecond values, with no float noise', async () => {
      const ffmpeg = fakeFfmpegSession({ inputPath: '/in/source.mp3', probeLog: m4aProbeLog(300) })

      // 100.1 + 0.2 is 100.30000000000001 and 229.55 - 2 is 227.54999999999998 in floats.
      await cutTrack(ffmpeg, {
        format: 'mp3',
        seek: 'twice',
        startSeconds: 100.1 + 0.2,
        endSeconds: 229.55 + 0.1,
        tags,
      })

      const command = commandOf(ffmpeg) ?? []
      expect(command[command.indexOf('-ss') + 1]).toBe('98.3')
      expect(command[command.lastIndexOf('-ss') + 1]).toBe('2')
      expect(command[command.indexOf('-t') + 1]).toBe('129.35')
    })

    it('has no faststart for .mp3', async () => {
      const ffmpeg = fakeFfmpegSession({ inputPath: '/in/source.mp3', probeLog: m4aProbeLog(30) })

      await cutTrack(ffmpeg, {
        format: 'mp3',
        seek: 'twice',
        startSeconds: 5,
        endSeconds: 10,
        tags,
      })

      expect(commandOf(ffmpeg)).not.toContain('-movflags')
    })

    it('copies a middle .opus track the same way, with the tags on the audio stream', async () => {
      const ffmpeg = fakeFfmpegSession({
        probeLog: m4aProbeLog(3686),
        inputPath: '/in/source.opus',
      })

      await cutTrack(ffmpeg, {
        format: 'opus',
        seek: 'twice',
        startSeconds: 231.55,
        endSeconds: 877.1,
        tags,
      })

      expect(commandOf(ffmpeg)).toEqual([
        '-v',
        'error',
        '-y',
        '-ss',
        '229.55',
        '-i',
        '/in/source.opus',
        '-ss',
        '2',
        '-t',
        '645.55',
        ...copyTail,
        '-metadata:s:a:0',
        'title=sample1 02',
        '-metadata:s:a:0',
        'track=2/8',
        '-metadata:s:a:0',
        'album=sample1',
        '/track.opus',
      ])
    })

    it('copies a middle Vorbis track as .ogg, seeking twice, with the tags on the audio stream', async () => {
      const ffmpeg = fakeFfmpegSession({
        probeLog: m4aProbeLog(3686),
        inputPath: '/in/source.ogg',
      })

      await cutTrack(ffmpeg, {
        format: 'ogg',
        seek: 'twice',
        startSeconds: 231.55,
        endSeconds: 877.1,
        tags,
      })

      expect(commandOf(ffmpeg)).toEqual([
        '-v',
        'error',
        '-y',
        '-ss',
        '229.55',
        '-i',
        '/in/source.ogg',
        '-ss',
        '2',
        '-t',
        '645.55',
        ...copyTail,
        '-metadata:s:a:0',
        'title=sample1 02',
        '-metadata:s:a:0',
        'track=2/8',
        '-metadata:s:a:0',
        'album=sample1',
        '/track.ogg',
      ])
    })

    it('takes the .opus file out of ffmpeg by its own name', async () => {
      const track = Uint8Array.of(0x4f, 0x67, 0x67, 0x53)
      const ffmpeg = fakeFfmpegSession({
        inputPath: '/in/source.mp3',
        probeLog: m4aProbeLog(30),
        track,
      })

      const bytes = await cutTrack(ffmpeg, {
        format: 'opus',
        seek: 'twice',
        startSeconds: 0,
        endSeconds: 10,
        tags,
      })

      expect(bytes).toEqual(track)
      expect(ffmpeg.takeFile).toHaveBeenCalledWith('/track.opus')
    })
  })
})
