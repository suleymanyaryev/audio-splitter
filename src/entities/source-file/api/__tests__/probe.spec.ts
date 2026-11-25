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

// The same stand-ins as WebM with VP9 video and Opus audio (ticket 01). Matroska gives each stream
// its own DURATION line, so the audio's length is not the container's when the picture runs on.
const webmVideoLog = [
  "Input #0, matroska,webm, from '/in/source.webm':",
  '  Metadata:',
  '    ENCODER         : Lavf62.12.100',
  '  Duration: 01:01:26.32, start: -0.007000, bitrate: 2603 kb/s',
  '  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv, progressive), 320x180, lossless, SAR 1:1 DAR 16:9, 25 fps, 25 tbr, 1k tbn',
  '    Metadata:',
  '      ENCODER         : Lavc62.28.100 libvpx-vp9',
  '      DURATION        : 01:01:26.320000000',
  '  Stream #0:1(eng): Audio: opus, 48000 Hz, stereo, fltp',
  '    Metadata:',
  '      ENCODER         : Lavc62.28.100 libopus',
  '      HANDLER_NAME    : ISO Media file produced by Google Inc.',
  '      DURATION        : 01:01:26.222000000',
  'At least one output file must be specified',
]

const mkvVideoLog = webmVideoLog.map((line) => line.replace('source.webm', 'source.mkv'))

// Audio only: no picture and nothing to tell apart, but the stream still has its DURATION line.
const webmAudioOnlyLog = [
  "Input #0, matroska,webm, from '/in/source.webm':",
  '  Metadata:',
  '    ENCODER         : Lavf62.12.100',
  '  Duration: 01:01:26.22, start: -0.007000, bitrate: 102 kb/s',
  '  Stream #0:0(eng): Audio: opus, 48000 Hz, stereo, fltp',
  '    Metadata:',
  '      ENCODER         : Lavc62.28.100 libopus',
  '      DURATION        : 01:01:26.222000000',
  'At least one output file must be specified',
]

// The picture runs 3 s past the audio (600.021 s): the audio stream's own line has its length.
const webmVideoPastAudioLog = [
  "Input #0, matroska,webm, from '/in/source.webm':",
  '  Metadata:',
  '    ENCODER         : Lavf62.12.100',
  '  Duration: 00:10:03.00, start: -0.007000, bitrate: 2599 kb/s',
  '  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv, progressive), 320x180, lossless, SAR 1:1 DAR 16:9, 25 fps, 25 tbr, 1k tbn',
  '    Metadata:',
  '      ENCODER         : Lavc62.28.100 libvpx-vp9',
  '      DURATION        : 00:10:03.000000000',
  '  Stream #0:1(eng): Audio: opus, 48000 Hz, stereo, fltp',
  '    Metadata:',
  '      ENCODER         : Lavc62.28.100 libopus',
  '      DURATION        : 00:10:00.021000000',
  'At least one output file must be specified',
]

// Vorbis in Ogg from ticket 01's stand-in: no picture, no per-stream length, tags on the stream.
const vorbisLog = [
  "Input #0, ogg, from '/in/source.ogg':",
  '  Duration: 01:01:26.21, start: 0.000000, bitrate: 91 kb/s',
  '  Stream #0:0(eng): Audio: vorbis, 44100 Hz, stereo, fltp, 128 kb/s',
  '    Metadata:',
  '      encoder         : Lavc62.28.100 libvorbis',
  'At least one output file must be specified',
]

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

  it('reads Vorbis in Ogg as .ogg, seeking twice', () => {
    expect(readProbeLog(vorbisLog)).toEqual({
      kind: 'supported',
      format: 'ogg',
      seek: 'twice',
      durationSeconds: 3686.21,
      sampleRate: 44_100,
      channelCount: 2,
    })
  })

  it('names what a readable but unsupported file is, by its contents', () => {
    const flacLog = opusLog.map((line) =>
      line.replace('ogg, from', 'flac, from').replace('Audio: opus', 'Audio: flac'),
    )

    expect(readProbeLog(flacLog)).toEqual({
      kind: 'unsupported',
      message:
        'This file is FLAC in FLAC; the splitter supports AAC in .m4a, .mp4 or .mov, MP3, Opus in .opus, .webm or .mkv, and Vorbis in .ogg.',
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

  describe('Opus in WebM or Matroska', () => {
    it("reads a WebM video as .opus seeking twice, with the audio stream's own length", () => {
      expect(readProbeLog(webmVideoLog)).toEqual({
        kind: 'supported',
        format: 'opus',
        seek: 'twice',
        durationSeconds: 3686.222,
        sampleRate: 48_000,
        channelCount: 2,
      })
    })

    it('reads an MKV the same way, since WebM and Matroska share one demuxer', () => {
      expect(readProbeLog(mkvVideoLog)).toMatchObject({
        kind: 'supported',
        format: 'opus',
        seek: 'twice',
        durationSeconds: 3686.222,
      })
    })

    it('reads an audio-only WebM', () => {
      expect(readProbeLog(webmAudioOnlyLog)).toMatchObject({
        kind: 'supported',
        format: 'opus',
        seek: 'twice',
        durationSeconds: 3686.222,
      })
    })

    it("gives the audio's length, not the container's, when the picture runs past it", () => {
      expect(readProbeLog(webmVideoPastAudioLog)).toMatchObject({ durationSeconds: 600.021 })
    })

    it("takes the first audio stream's length when a second audio stream follows", () => {
      const log = [
        ...webmVideoPastAudioLog.slice(0, -1),
        '  Stream #0:2(fre): Audio: opus, 48000 Hz, stereo, fltp',
        '    Metadata:',
        '      DURATION        : 00:09:00.000000000',
        ...webmVideoPastAudioLog.slice(-1),
      ]

      expect(readProbeLog(log)).toMatchObject({ durationSeconds: 600.021 })
    })

    it("falls back to the container's length when the audio stream has no DURATION line", () => {
      const log = webmAudioOnlyLog.filter((line) => !line.includes('DURATION'))

      expect(readProbeLog(log)).toMatchObject({ durationSeconds: 3686.22 })
    })

    it('does not take a DURATION line of the picture for the length of the audio', () => {
      // The picture's own line says 10:05, unlike the container's 10:03, so taking it would show.
      const log = webmVideoPastAudioLog
        .filter((line) => !line.includes('00:10:00.021'))
        .map((line) => line.replace('00:10:03.000000000', '00:10:05.000000000'))

      expect(readProbeLog(log)).toMatchObject({ durationSeconds: 603 })
    })

    it('turns away AAC in Matroska, which the splitter does not cut', () => {
      const log = mkvVideoLog.map((line) => line.replace('Audio: opus', 'Audio: aac (LC)'))

      expect(readProbeLog(log)).toMatchObject({
        kind: 'unsupported',
        message: expect.stringMatching(/^This file is AAC in WebM or Matroska;/),
      })
    })

    it('still turns away Vorbis in WebM and names the supported pairs', () => {
      const vorbisInWebmLog = webmVideoLog.map((line) =>
        line.replace('Audio: opus', 'Audio: vorbis'),
      )

      expect(readProbeLog(vorbisInWebmLog)).toEqual({
        kind: 'unsupported',
        message:
          'This file is Vorbis in WebM or Matroska; the splitter supports AAC in .m4a, .mp4 or .mov, MP3, Opus in .opus, .webm or .mkv, and Vorbis in .ogg.',
      })
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
