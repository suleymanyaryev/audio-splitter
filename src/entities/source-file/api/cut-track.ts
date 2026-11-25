import type { FfmpegSession } from '@/shared/api/ffmpeg/ffmpeg.ts'
import { roundToMillisecond } from '@/shared/lib/time/round-to-millisecond.ts'
import type { SeekMethod, TrackFormat } from './probe.ts'

/*
A copy runs at disk speed: a long track of a 3 h file takes about a second in native ffmpeg
(docs/concepts/07-cutting-without-re-encoding.md), and ffmpeg.wasm reading through WORKERFS is
slower, but nowhere near minutes. 300 s is far above that, and a call that really hangs still
fails in five minutes, like a decode slice's.
*/
const CUT_TIMEOUT_MS = 300_000

export interface TrackTags {
  title: string
  // "N/TOTAL", as the tag is written; null for a file that is no track (a range), which then
  // carries none, not even one the source had.
  track: string | null
  album: string
}

export interface TrackCut {
  // Sets the file's extension and where its tags go.
  format: TrackFormat
  // Sets how the cut seeks.
  seek: SeekMethod
  // 0 for the first track, which then needs no seek.
  startSeconds: number
  // Undefined for the last track, which runs to the end of the file.
  endSeconds: number | undefined
  tags: TrackTags
}

// How far before a track's start the first of two seeks lands, so the decoder starts warm.
const JUMP_BACK_SECONDS = 2

// The seek and stop of one cut: what goes before `-i`, and what goes after it.
interface SeekArguments {
  beforeInput: string[]
  afterInput: string[]
}

/*
The seek and stop of one seek method. A container with an index of every frame (MP4, which holds
`.m4a`) needs one jump before the input: it lands on the frame that holds the time, and the edit
list trims the rest. The `-ss` and `-to` both go before `-i`: after the jump the clock restarts at
0, and `-to` before the input counts on the source's clock again (the note's "Why -ss and -to
both go before -i").

Containers with no such index (MP3, Ogg) seek twice (the note's "Why .mp3 and .opus seek twice"),
and so does Matroska, whose Opus a single seek before the input breaks (ticket 01 of
video-and-more-formats). The first `-ss` jumps to 2 s before the start, never before 0, and the second, after
the input, is the exact start counted from there. The stop is `-t`, a length, and never `-to`:
the clock restarts after the input seek, so a `-to` would count from the jump and not from the
file's start. The first track starts with the file and needs neither seek. Both numbers are made
from the rounded start, so no float error creeps into the offset.
*/
function seekArguments(cut: TrackCut): SeekArguments {
  const start = roundToMillisecond(cut.startSeconds)
  const end = cut.endSeconds === undefined ? undefined : roundToMillisecond(cut.endSeconds)

  switch (cut.seek) {
    case 'once': {
      return {
        beforeInput: [
          ...(start > 0 ? ['-ss', String(start)] : []),
          ...(end === undefined ? [] : ['-to', String(end)]),
        ],
        afterInput: [],
      }
    }
    case 'twice': {
      const jump = roundToMillisecond(Math.max(0, start - JUMP_BACK_SECONDS))
      return {
        beforeInput: jump > 0 ? ['-ss', String(jump)] : [],
        afterInput: [
          ...(start > 0 ? ['-ss', String(roundToMillisecond(start - jump))] : []),
          ...(end === undefined ? [] : ['-t', String(roundToMillisecond(end - start))]),
        ],
      }
    }
  }
}

/*
The tags and format options of one format. `.mp3` keeps its tags in the file's own tag header, so
the file-level keys are the ones that land. `.opus` and `.ogg` (Vorbis) keep them in the stream's
comment header, and a file-level key would not replace the tags the source's stream already
carries, so they go on the stream (tickets 03 and 12). `+faststart` moves an `.m4a` index in front
of the audio.
*/
function tagArguments(cut: TrackCut): string[] {
  const key = cut.format === 'opus' || cut.format === 'ogg' ? '-metadata:s:a:0' : '-metadata'
  return [
    key,
    `title=${cut.tags.title}`,
    key,
    `track=${cut.tags.track ?? ''}`,
    key,
    `album=${cut.tags.album}`,
    ...(cut.format === 'm4a' ? ['-movflags', '+faststart'] : []),
  ]
}

/*
Copies the frames of one track into a new file of the source's own format, without decoding
them, and writes the tags in the same run. Returns the file's bytes. `-map 0:a:0` keeps the first
audio stream only (no cover image), and `-map_chapters -1` copies no chapter list into every
track.
*/
export async function cutTrack(ffmpeg: FfmpegSession, cut: TrackCut): Promise<Uint8Array> {
  const outputPath = `/track.${cut.format}`
  const seek = seekArguments(cut)

  const { exitCode, log } = await ffmpeg.run(
    [
      /*
      `-v error` leaves only errors in the log, so its last line is the reason for a failure. `-y`
      overwrites: a track that failed halfway can leave the file behind, and without it the next
      cut would stop with "File exists".
      */
      '-v',
      'error',
      '-y',
      ...seek.beforeInput,
      '-i',
      ffmpeg.inputPath,
      ...seek.afterInput,
      '-map',
      '0:a:0',
      '-c',
      'copy',
      '-map_chapters',
      '-1',
      ...tagArguments(cut),
      outputPath,
    ],
    CUT_TIMEOUT_MS,
  )
  if (exitCode !== 0) throw new Error(log.at(-1) ?? `ffmpeg exited with code ${exitCode}`)

  return ffmpeg.takeFile(outputPath)
}
