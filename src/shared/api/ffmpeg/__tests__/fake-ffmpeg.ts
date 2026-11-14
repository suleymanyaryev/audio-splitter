import { vi } from 'vitest'

import type { FfmpegSession } from '../ffmpeg.ts'

/*
A stand-in for one ffmpeg.wasm session, which cannot run outside a browser. It answers the probe
with `probeLog`. A decode answers with interleaved floats: `pcm` for every slice, or
`pcmForSlice(index)` when slices differ. The slice is read back from the call's seek and length:
the command of slice n seeks to n × length − 1 s, with the length in `-t` (slice 0 has no seek).
`decodeError` makes a decode fail with that as ffmpeg's last log line and exit code 1, at every
slice or only at slice `failAtSlice` (from 0). A clip (a command with the pair `-f wav`) answers
with `wav`, or fails with `clipError` as its last log line and exit code 1.
*/
export function fakeFfmpegSession(options: {
  probeLog: string[]
  pcm?: Float32Array
  pcmForSlice?: (index: number) => Float32Array
  decodeError?: string
  failAtSlice?: number
  wav?: Uint8Array
  clipError?: string
}) {
  // The slice of the latest decode call, for `takeFile` to answer with.
  let slice = 0
  const session = {
    inputPath: '/in/source.m4a',
    run: vi.fn<FfmpegSession['run']>(async (command) => {
      if (command.at(command.indexOf('-f') + 1) === 'wav') {
        return options.clipError
          ? { exitCode: 1, log: [options.clipError] }
          : { exitCode: 0, log: [] }
      }
      if (!command.includes('f32le')) return { exitCode: 1, log: options.probeLog }
      const seek = command.indexOf('-ss')
      const length = Number(command[command.indexOf('-t') + 1])
      slice = seek === -1 ? 0 : (Number(command[seek + 1]) + 1) / length
      const isFailing = options.failAtSlice === undefined || options.failAtSlice === slice
      return isFailing && options.decodeError
        ? { exitCode: 1, log: [options.decodeError] }
        : { exitCode: 0, log: [] }
    }),
    takeFile: vi.fn<FfmpegSession['takeFile']>(async (path) => {
      if (path.endsWith('.wav')) return options.wav ?? new Uint8Array(0)
      const pcm = options.pcmForSlice?.(slice) ?? options.pcm ?? new Float32Array(0)
      return new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
    }),
    close: vi.fn<FfmpegSession['close']>(),
  } satisfies FfmpegSession
  return session
}

// Stereo PCM: `seconds` of a 440 Hz tone at `amplitude`, then the same length of silence.
export function toneThenSilencePcm(sampleRate: number, seconds: number, amplitude: number) {
  const frames = Math.round(sampleRate * seconds)
  const pcm = new Float32Array(frames * 2 * 2)
  for (let frame = 0; frame < frames; frame++) {
    const sample = amplitude * Math.sin((2 * Math.PI * 440 * frame) / sampleRate)
    pcm[frame * 2] = sample
    pcm[frame * 2 + 1] = sample
  }
  return pcm
}

// ffmpeg's h:mm:ss, for whole seconds.
const clock = (seconds: number) =>
  [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')

export const m4aProbeLog = (durationSeconds: number) => [
  "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/in/source.m4a':",
  `  Duration: ${clock(durationSeconds)}.00, start: 0.000000, bitrate: 85 kb/s`,
  '  Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 83 kb/s (default)',
  'At least one output file must be specified',
]

// The same file as MP3.
export const mp3ProbeLog = (durationSeconds: number) =>
  m4aProbeLog(durationSeconds).map((line) =>
    line
      .replace('mov,mp4,m4a,3gp,3g2,mj2', 'mp3')
      .replace('aac (LC) (mp4a / 0x6134706D)', 'mp3 (mp3float)'),
  )

// The same file as Vorbis in Ogg: readable, but not a supported format.
export const vorbisProbeLog = (durationSeconds: number) =>
  m4aProbeLog(durationSeconds).map((line) =>
    line
      .replace('mov,mp4,m4a,3gp,3g2,mj2', 'ogg')
      .replace('aac (LC) (mp4a / 0x6134706D)', 'vorbis'),
  )
