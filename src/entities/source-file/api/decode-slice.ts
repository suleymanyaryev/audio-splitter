import type { FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'
import type { TrackFormat } from './probe.ts'

const OUTPUT_PATH = '/slice.pcm'

/*
A slice is 21 MB of floats (at most 115 MB for an MP3 slice) and takes a second or so, except an
MP3 slice late in a long file: ffmpeg reads the MP3 from the start to find the spot, 1 to 2 s in a
3 h file (docs/concepts/02-long-files.md). 300 s is far above that, and a call that really hangs
still fails in five minutes.
*/
const SLICE_TIMEOUT_MS = 300_000

/*
ffmpeg seeks an MP3 by reading from the start, so every slice costs a seek that grows with its
position. Fewer, longer slices mean fewer seeks (docs/concepts/02-long-files.md). The
other formats seek for free, and longer slices would only cost memory.
*/
function sliceSeconds(format: TrackFormat): number {
  return format === 'mp3' ? 300 : 60
}

export function sliceCount(durationSeconds: number, format: TrackFormat): number {
  return Math.ceil(durationSeconds / sliceSeconds(format))
}

/*
Decodes one slice (60 s, or 300 s for an MP3) of the first audio stream to raw PCM: 32-bit floats
between −1 and 1, interleaved L R L R …, at the file's own sample rate and channel count. The last
slice is shorter.

Slice 0 starts at 0. Any later slice starts decoding 1 s early (the pre-roll) and drops that second,
because a decoder that jumps into the middle of a file starts cold
(docs/concepts/02-long-files.md). The `-ss` before `-i` is a fast seek that lands near the spot; the
`-ss 1` after it is exact, and cuts the pre-roll off the decoded audio.
*/
export async function decodeSlice(
  ffmpeg: FfmpegSession,
  index: number,
  format: TrackFormat,
): Promise<Float32Array> {
  const seconds = sliceSeconds(format)
  const cut =
    index === 0
      ? ['-i', ffmpeg.inputPath, '-t', String(seconds)]
      : [
          '-ss',
          String(index * seconds - 1),
          '-i',
          ffmpeg.inputPath,
          '-ss',
          '1',
          '-t',
          String(seconds),
        ]

  const { exitCode, log } = await ffmpeg.run(
    // `-v error` leaves only errors in the log, so its last line is the reason for a failure.
    ['-v', 'error', ...cut, '-map', '0:a:0', '-f', 'f32le', OUTPUT_PATH],
    SLICE_TIMEOUT_MS,
  )
  if (exitCode !== 0) throw new Error(log.at(-1) ?? `ffmpeg exited with code ${exitCode}`)

  const bytes = await ffmpeg.takeFile(OUTPUT_PATH)
  // The same bytes read as floats: four bytes per sample, no copy.
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
}
