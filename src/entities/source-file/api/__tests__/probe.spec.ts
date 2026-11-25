import { describe, it, expect } from 'vitest'

import { readProbeLog } from '../probe.ts'

// What `ffmpeg -hide_banner -i <file>` prints, one line per log event, as ffmpeg.wasm 5.1.4
// delivers it. The first lines of each are the real headers of the samples and fixtures.
const m4aLog = [
  "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/in/source.m4a':",
  '  Metadata:',
  '    major_brand     : M4A ',
  '  Duration: 01:01:26.21, start: 0.000000, bitrate: 193 kb/s',
  '  Stream #0:0[0x1](eng): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 192 kb/s (default)',
  'At least one output file must be specified',
]

const mp3WithCoverLog = [
  "Input #0, mp3, from '/in/source.mp3':",
  '  Duration: 00:00:30.00, start: 0.025057, bitrate: 96 kb/s',
  '  Stream #0:0: Video: mjpeg (Baseline), yuvj420p(pc, bt470bg/unknown/unknown), 600x600, 90k tbr, 90k tbn (attached pic)',
  '  Stream #0:1: Audio: mp3 (mp3float), 44100 Hz, stereo, fltp, 96 kb/s',
  'At least one output file must be specified',
]

const opusLog = [
  "Input #0, ogg, from '/in/source.opus':",
  '  Duration: 00:00:30.01, start: 0.000000, bitrate: 90 kb/s',
  '  Stream #0:0: Audio: opus, 48000 Hz, mono, fltp',
  'At least one output file must be specified',
]

// Captured from the pinned core on stand-ins built like a downloader's files (ticket 01 of
// video-and-more-formats): the picture comes first, a chapter track last, and the audio between.
const mp4VideoLog = [
  "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/in/source.mp4':",
  '  Metadata:',
  '    major_brand     : isom',
  '    compatible_brands: isomiso2avc1mp41',
  '  Duration: 01:01:26.32, start: 0.000000, bitrate: 2698 kb/s',
  '  Stream #0:0[0x1](und): Video: h264 (Constrained Baseline) (avc1 / 0x31637661), yuv420p(progressive), 320x180 [SAR 1:1 DAR 16:9], 2500 kb/s, 25 fps, 25 tbr, 12800 tbn (default)',
  '    Metadata:',
  '      handler_name    : VideoHandler',
  '  Stream #0:1[0x2](eng): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 192 kb/s (default)',
  '    Metadata:',
  '      handler_name    : ISO Media file produced by Google Inc.',
  '  Stream #0:2[0x3](eng): Data: bin_data (text / 0x74786574)',
  '    Metadata:',
  '      handler_name    : SubtitleHandler',
  'At least one output file must be specified',
]

const movVideoLog = mp4VideoLog.map((line) =>
  line
    .replace("from '/in/source.mp4'", "from '/in/source.mov'")
    .replace('major_brand     : isom', 'major_brand     : qt  '),
)

// The picture runs 3 s past the audio (600 s): the log gives the container's length only.
const mp4VideoPastAudioLog = mp4VideoLog.map((line) =>
  line.replace('Duration: 01:01:26.32', 'Duration: 00:10:03.00'),
)

describe('readProbeLog', () => {
  it('reads AAC in .m4a as a supported format with its duration, rate and channels', () => {
    expect(readProbeLog(m4aLog)).toEqual({
      kind: 'supported',
      format: 'm4a',
      seek: 'once',
      durationSeconds: 3686.21,
      sampleRate: 44_100,
      channelCount: 2,
    })
  })

  it('takes the first audio stream, past an attached cover picture', () => {
    expect(readProbeLog(mp3WithCoverLog)).toEqual({
      kind: 'supported',
      format: 'mp3',
      seek: 'twice',
      durationSeconds: 30,
      sampleRate: 44_100,
      channelCount: 2,
    })
  })

  it('reads Opus in Ogg as a supported format', () => {
    expect(readProbeLog(opusLog)).toMatchObject({
      kind: 'supported',
      format: 'opus',
      seek: 'twice',
      sampleRate: 48_000,
      channelCount: 1,
    })
  })

  it.each([
    ['5.1(side)', 6],
    ['quad', 4],
    ['3 channels', 3],
  ])('counts the channels of a "%s" layout as %i', (layout, channelCount) => {
    const log = opusLog.map((line) => line.replace('mono', () => layout))

    expect(readProbeLog(log)).toMatchObject({ channelCount })
  })

  it('names what a readable but unsupported file is, by its contents', () => {
    const vorbisLog = opusLog.map((line) => line.replace('Audio: opus', 'Audio: vorbis'))

    expect(readProbeLog(vorbisLog)).toEqual({
      kind: 'unsupported',
      message:
        'This file is Vorbis in Ogg; the splitter supports AAC in .m4a, .mp4 or .mov, MP3 and Opus in .opus.',
    })
  })

  describe('a video file with AAC audio', () => {
    it('reads the first audio stream past the picture, as .m4a seeking once', () => {
      expect(readProbeLog(mp4VideoLog)).toEqual({
        kind: 'supported',
        format: 'm4a',
        seek: 'once',
        durationSeconds: 3686.32,
        sampleRate: 44_100,
        channelCount: 2,
      })
    })

    it('reads a MOV the same way, since MP4 and MOV share one demuxer', () => {
      expect(readProbeLog(movVideoLog)).toMatchObject({ kind: 'supported', format: 'm4a' })
    })

    /*
    MP4 and MOV logs hold no length of the audio stream on its own (ticket 01), so the
    container's length stands in, and that is the picture's when it runs on.
    */
    it("falls back to the container's length when the picture runs past the audio", () => {
      expect(readProbeLog(mp4VideoPastAudioLog)).toMatchObject({ durationSeconds: 603 })
    })
  })

  it('lists AAC in .m4a, .mp4 or .mov among the supported formats in the unsupported message', () => {
    const flacLog = m4aLog
      .map((line) => line.replace('mov,mp4,m4a,3gp,3g2,mj2', 'flac'))
      .map((line) => line.replace('Audio: aac (LC) (mp4a / 0x6134706D)', 'Audio: flac'))

    expect(readProbeLog(flacLog)).toEqual({
      kind: 'unsupported',
      message:
        'This file is FLAC in FLAC; the splitter supports AAC in .m4a, .mp4 or .mov, MP3 and Opus in .opus.',
    })
  })

  it('rejects an .m4a that holds ALAC rather than AAC', () => {
    const alacLog = m4aLog.map((line) =>
      line.replace('Audio: aac (LC) (mp4a / 0x6134706D)', 'Audio: alac (alac / 0x63616C61)'),
    )

    expect(readProbeLog(alacLog)).toMatchObject({
      kind: 'unsupported',
      message: expect.stringMatching(/^This file is ALAC in MP4;/),
    })
  })

  it('calls a file with no audio stream unreadable', () => {
    const log = [
      "Input #0, png_pipe, from '/in/source.m4a':",
      '  Duration: N/A, bitrate: N/A',
      '  Stream #0:0: Video: png, rgba(pc), 64x64, 25 tbr, 25 tbn',
      'At least one output file must be specified',
    ]

    expect(readProbeLog(log)).toEqual({ kind: 'unreadable', reason: 'it has no audio stream' })
  })

  it("calls a file ffmpeg cannot open unreadable, with ffmpeg's last line as the reason", () => {
    const log = ['/in/source.m4a: Invalid data found when processing input']

    expect(readProbeLog(log)).toEqual({
      kind: 'unreadable',
      reason: '/in/source.m4a: Invalid data found when processing input',
    })
  })
})
