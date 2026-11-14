import type { FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'

const OUTPUT_PATH = '/decoded.pcm'

// Ample for the 30 s fixtures; a long file runs out of memory long before this.
const DECODE_TIMEOUT_MS = 120_000

/*
Decodes the first audio stream of the whole file to raw PCM: 32-bit floats between −1 and 1,
interleaved L R L R …, at the file's own sample rate and channel count (no `-ar` or `-ac`).

Deliberately naive: one call for the whole file. An hour of stereo at 44.1 kHz is about 1.3 GB
of floats, which ffmpeg.wasm cannot hold. Milestone 2 decodes in 60 s slices instead.
*/
export async function decodeWholeFile(ffmpeg: FfmpegSession): Promise<Float32Array> {
  const { exitCode, log } = await ffmpeg.run(
    // `-v error` leaves only errors in the log, so its last line is the reason for a failure.
    ['-v', 'error', '-i', ffmpeg.inputPath, '-map', '0:a:0', '-f', 'f32le', OUTPUT_PATH],
    DECODE_TIMEOUT_MS,
  )
  if (exitCode !== 0) throw new Error(log.at(-1) ?? `ffmpeg exited with code ${exitCode}`)

  const bytes = await ffmpeg.takeFile(OUTPUT_PATH)
  // The same bytes read as floats: four bytes per sample, no copy.
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
}
