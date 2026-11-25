import type { FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'

// The track format: the extension the exported tracks get, set by the codec (GLOSSARY.md).
export type TrackFormat = 'm4a' | 'mp3' | 'opus'

/*
How a cut seeks, set by the container (docs/concepts/07-cutting-without-re-encoding.md): `once`
jumps before the input, where the container's index lands on the frame that holds the time;
`twice` jumps 2 s early and then seeks exactly after the input.
*/
export type SeekMethod = 'once' | 'twice'

export type ProbeOutcome =
  | {
      kind: 'supported'
      format: TrackFormat
      seek: SeekMethod
      durationSeconds: number
      sampleRate: number
      channelCount: number
    }
  | { kind: 'unsupported'; message: string }
  | { kind: 'unreadable'; reason: string }

/*
ffmpeg's demuxer name for the container and the codec of each supported pair, with the track
format the codec sets and the seek method the container sets.
*/
const SUPPORTED: {
  container: string
  codec: string
  format: TrackFormat
  seek: SeekMethod
}[] = [
  { container: 'mov,mp4,m4a,3gp,3g2,mj2', codec: 'aac', format: 'm4a', seek: 'once' },
  { container: 'mp3', codec: 'mp3', format: 'mp3', seek: 'twice' },
  { container: 'ogg', codec: 'opus', format: 'opus', seek: 'twice' },
]

// Readable names for the message about an unsupported file; anything else shows ffmpeg's name.
const CONTAINER_NAMES: Record<string, string> = {
  'mov,mp4,m4a,3gp,3g2,mj2': 'MP4',
  mp3: 'MP3',
  ogg: 'Ogg',
  'matroska,webm': 'WebM or Matroska',
  wav: 'WAV',
  flac: 'FLAC',
  aiff: 'AIFF',
}
const CODEC_NAMES: Record<string, string> = {
  aac: 'AAC',
  mp3: 'MP3',
  opus: 'Opus',
  vorbis: 'Vorbis',
  flac: 'FLAC',
  alac: 'ALAC',
}

// Named channel layouts that do not spell out their count ("5.1" and "7.1" add up instead).
const LAYOUT_CHANNELS: Record<string, number> = { mono: 1, stereo: 2, quad: 4, hexagonal: 6 }

function countChannels(layout: string): number | undefined {
  const named = LAYOUT_CHANNELS[layout]
  if (named) return named
  // "3 channels"
  const counted = /^(\d+) channels$/.exec(layout)
  if (counted) return Number(counted[1])
  // "5.1(side)" is 5 full-range channels plus 1 bass channel.
  const surround = /^(\d+)\.(\d+)/.exec(layout)
  return surround ? Number(surround[1]) + Number(surround[2]) : undefined
}

/*
Reads the source file's details from what `ffmpeg -i` prints. ffmpeg has no separate "tell me
about this file" answer in this build, so the log is the only place they appear:

  Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/in/source.m4a':
    Duration: 01:01:26.21, start: 0.000000, bitrate: 193 kb/s
    Stream #0:0[0x1](eng): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, …

The container and codec decide whether the file is a supported format, never the extension.
*/
export function readProbeLog(log: string[]): ProbeOutcome {
  const text = log.join('\n')

  const container = /^Input #0, (.+), from '/m.exec(text)?.[1]
  if (!container) return { kind: 'unreadable', reason: log.at(-1) ?? 'ffmpeg printed nothing' }

  // The first audio stream; a cover picture shows up as a Video stream and is skipped.
  const audio = /: Audio: (\w+)(?: [^,]*)?, (\d+) Hz, ([^,]+),/.exec(text)
  if (!audio) return { kind: 'unreadable', reason: 'it has no audio stream' }
  const [, codec = '', rate = '', layout = ''] = audio

  const supported = SUPPORTED.find(
    (entry) => entry.container === container && entry.codec === codec,
  )
  if (!supported) {
    const what = `${CODEC_NAMES[codec] ?? codec} in ${CONTAINER_NAMES[container] ?? container}`
    return {
      kind: 'unsupported',
      message: `This file is ${what}; the splitter supports AAC in .m4a, MP3 and Opus in .opus.`,
    }
  }

  const duration = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(text)
  if (!duration) return { kind: 'unreadable', reason: 'ffmpeg reports no duration' }
  const [, hours = 0, minutes = 0, seconds = 0] = duration.map(Number)

  const channelCount = countChannels(layout)
  if (!channelCount) return { kind: 'unreadable', reason: `unknown channel layout "${layout}"` }

  return {
    kind: 'supported',
    format: supported.format,
    seek: supported.seek,
    durationSeconds: hours * 3600 + minutes * 60 + seconds,
    sampleRate: Number(rate),
    channelCount,
  }
}

// ffmpeg opens a file in well under a second; the rest is margin for a slow machine.
const PROBE_TIMEOUT_MS = 30_000

/*
Opens the file without writing anything. ffmpeg then complains that no output was given and exits
with an error, which is expected: the details have already been printed.
*/
export async function probe(ffmpeg: FfmpegSession): Promise<ProbeOutcome> {
  const { log } = await ffmpeg.run(['-hide_banner', '-i', ffmpeg.inputPath], PROBE_TIMEOUT_MS)
  return readProbeLog(log)
}
