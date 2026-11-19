import { MAXIMUM_RANGE_SECONDS } from '@/entities/split/config/range-limits.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'

// The most WAV the player decodes at a time: the limit of note 08, 10 min.
const WINDOW_SECONDS = MAXIMUM_RANGE_SECONDS
// The next window is decoded ahead once the playhead is this close to the end of the one playing.
const AHEAD_SECONDS = 30

/*
The part of a stretch the player decodes for a playhead (docs/concepts/08-listening-to-a-range.md).
A stretch of 10 min or less is one window, the whole of it, wherever the playhead is. A longer one
is heard through a window that starts at the playhead and runs 10 min, held to the stretch's end.
*/
export function decodeWindow(stretch: TimeRange, playheadSeconds: number): TimeRange {
  if (stretch.endSeconds - stretch.startSeconds <= WINDOW_SECONDS) return stretch
  const startSeconds = Math.min(Math.max(playheadSeconds, stretch.startSeconds), stretch.endSeconds)
  return { startSeconds, endSeconds: Math.min(startSeconds + WINDOW_SECONDS, stretch.endSeconds) }
}

/*
Whether a time is inside the window, so a seek there sets `currentTime` and decodes nothing. A
window's end belongs to the next window, unless the window runs to the stretch's end: a seek to the
very end of a stretch is a seek to its last sample.
*/
export function windowHolds(window: TimeRange, stretch: TimeRange, seconds: number) {
  const isLast = window.endSeconds >= stretch.endSeconds
  return (
    seconds >= window.startSeconds &&
    (seconds < window.endSeconds || (isLast && seconds <= window.endSeconds))
  )
}

/*
The window to decode ahead, or null: while the window plays and its playhead is 30 s from its end,
the next one starts where it ends. The last window has no next.
*/
export function nextWindow(
  stretch: TimeRange,
  window: TimeRange,
  playheadSeconds: number,
): TimeRange | null {
  const isDue =
    window.endSeconds < stretch.endSeconds && playheadSeconds >= window.endSeconds - AHEAD_SECONDS
  return isDue ? decodeWindow(stretch, window.endSeconds) : null
}
