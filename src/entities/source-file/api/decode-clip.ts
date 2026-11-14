import type { FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'

const OUTPUT_PATH = '/clip.wav'

/*
A clip is 8 s: about 1.5 MB, and well under a second even late in a 3 h MP3, where ffmpeg reads
from the start to find the spot (docs/concepts/06-seeking-compressed-audio.md, "What it costs").
30 s is far above that, and short enough that a call that really hangs fails while the user is
still waiting for the press to do something.
*/
const CLIP_TIMEOUT_MS = 30_000

// How far the clip reaches either side of the split.
const REACH_SECONDS = 4
// Decoding starts this early, because a decoder that jumps into the middle of a file starts cold.
const PRE_ROLL_SECONDS = 1

/*
Seconds go on the command line, and back to the caller, rounded to the millisecond: 329.05 − 4 is
325.04999999999995 in floats, and the clip's start is also what the playhead adds to the audio's
`currentTime`, so the caller must get the number the command used.
*/
const toMilliseconds = (seconds: number) => Math.round(seconds * 1000) / 1000

/*
Decodes the 8 s around a split (4 s either side, less where the file ends) to a WAV: 16-bit PCM at
the file's own rate and channel count, which every browser plays exactly, unlike a VBR MP3 it
seeks in (docs/concepts/06-seeking-compressed-audio.md). `startSeconds` is the file time of the
clip's first sample, so the playhead is `startSeconds + currentTime`.

The pre-roll is the room before the start, up to 1 s, so a clip at 0 s has none. The `-ss` before
`-i` jumps near the spot; the `-ss` after it is exact and drops the pre-roll from the output.
*/
export async function decodeClip(
  ffmpeg: FfmpegSession,
  splitSeconds: number,
  durationSeconds: number,
): Promise<{ wav: Uint8Array; startSeconds: number; lengthSeconds: number }> {
  const startSeconds = toMilliseconds(Math.max(0, splitSeconds - REACH_SECONDS))
  const endSeconds = toMilliseconds(Math.min(durationSeconds, splitSeconds + REACH_SECONDS))
  const lengthSeconds = toMilliseconds(endSeconds - startSeconds)
  const preRoll = Math.min(PRE_ROLL_SECONDS, startSeconds)

  const cut =
    preRoll > 0
      ? [
          '-ss',
          String(toMilliseconds(startSeconds - preRoll)),
          '-i',
          ffmpeg.inputPath,
          '-ss',
          String(preRoll),
          '-t',
          String(lengthSeconds),
        ]
      : ['-i', ffmpeg.inputPath, '-t', String(lengthSeconds)]

  const { exitCode, log } = await ffmpeg.run(
    /*
    `-v error` leaves only errors in the log, so its last line is the reason for a failure. `-y`
    overwrites: a clip that failed halfway can leave /clip.wav behind, and without it the next
    clip would stop with "File exists".
    */
    ['-v', 'error', '-y', ...cut, '-map', '0:a:0', '-c:a', 'pcm_s16le', '-f', 'wav', OUTPUT_PATH],
    CLIP_TIMEOUT_MS,
  )
  if (exitCode !== 0) throw new Error(log.at(-1) ?? `ffmpeg exited with code ${exitCode}`)

  return { wav: await ffmpeg.takeFile(OUTPUT_PATH), startSeconds, lengthSeconds }
}
