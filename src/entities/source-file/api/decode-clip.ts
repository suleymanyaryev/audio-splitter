import type { FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'
import { roundToMillisecond } from '@/shared/lib/time/round-to-millisecond.ts'

const OUTPUT_PATH = '/clip.wav'

/*
A clip is up to 10 min (a range, GLOSSARY.md) or as little as the 8 s of an audition. The 8 s is
about 1.4 MB, and its decode grows with its position in an MP3, where ffmpeg reads from the start
to find the spot (docs/concepts/06-seeking-compressed-audio.md); a 10 min range is
106 MB (docs/concepts/08-listening-to-a-range.md). 30 s is far above the first and short enough
that a call that really hangs fails while the user is still waiting for the press to do something.
*/
const CLIP_TIMEOUT_MS = 30_000

// Decoding starts this early, because a decoder that jumps into the middle of a file starts cold.
const PRE_ROLL_SECONDS = 1

/*
Decodes `lengthSeconds` from `startSeconds` to a WAV (less where the file ends): 16-bit PCM at the
file's own rate and channel count, which every browser plays exactly, unlike a VBR MP3 it seeks in
(docs/concepts/06-seeking-compressed-audio.md). The result's `startSeconds` is the file time of
the clip's first sample, so the playhead is `startSeconds + currentTime`: it is the rounded number
the command used, and the caller gets that one, with the length the clip really has.

The pre-roll is the room before the start, up to 1 s, so a clip at 0 s has none. The `-ss` before
`-i` jumps near the spot; the `-ss` after it is exact and drops the pre-roll from the output.
*/
export async function decodeClip(
  ffmpeg: FfmpegSession,
  startSeconds: number,
  lengthSeconds: number,
  durationSeconds: number,
): Promise<{ wav: Uint8Array; startSeconds: number; lengthSeconds: number }> {
  // The end comes from the asked start, so a clip asked to begin before the file ends up shorter.
  const endSeconds = roundToMillisecond(Math.min(durationSeconds, startSeconds + lengthSeconds))
  const clipStart = roundToMillisecond(Math.max(0, startSeconds))
  const clipLength = roundToMillisecond(endSeconds - clipStart)
  const preRoll = Math.min(PRE_ROLL_SECONDS, clipStart)

  const cut =
    preRoll > 0
      ? [
          '-ss',
          String(roundToMillisecond(clipStart - preRoll)),
          '-i',
          ffmpeg.inputPath,
          '-ss',
          String(preRoll),
          '-t',
          String(clipLength),
        ]
      : ['-i', ffmpeg.inputPath, '-t', String(clipLength)]

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

  return {
    wav: await ffmpeg.takeFile(OUTPUT_PATH),
    startSeconds: clipStart,
    lengthSeconds: clipLength,
  }
}
