import { vi } from 'vitest'

import type { FfmpegSession } from '../ffmpeg.ts'

/*
A stand-in for one ffmpeg.wasm session, which cannot run outside a browser. It answers the probe
with `probeLog` and the decode with `pcm` (interleaved floats), or with `decodeError` as ffmpeg's
last log line and exit code 1.
*/
export function fakeFfmpegSession(options: {
  probeLog: string[]
  pcm?: Float32Array
  decodeError?: string
}) {
  const session = {
    inputPath: '/in/source.m4a',
    run: vi.fn<FfmpegSession['run']>(async (command) => {
      if (!command.includes('f32le')) return { exitCode: 1, log: options.probeLog }
      return options.decodeError
        ? { exitCode: 1, log: [options.decodeError] }
        : { exitCode: 0, log: [] }
    }),
    takeFile: vi.fn<FfmpegSession['takeFile']>(async () => {
      const pcm = options.pcm ?? new Float32Array(0)
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

export const m4aProbeLog = (durationSeconds: number) => [
  "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/in/source.m4a':",
  `  Duration: 00:00:${String(durationSeconds).padStart(2, '0')}.00, start: 0.000000, bitrate: 85 kb/s`,
  '  Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 83 kb/s (default)',
  'At least one output file must be specified',
]

// The same file as Vorbis in Ogg: readable, but not a supported format.
export const vorbisProbeLog = (durationSeconds: number) =>
  m4aProbeLog(durationSeconds).map((line) =>
    line
      .replace('mov,mp4,m4a,3gp,3g2,mj2', 'ogg')
      .replace('aac (LC) (mp4a / 0x6134706D)', 'vorbis'),
  )
