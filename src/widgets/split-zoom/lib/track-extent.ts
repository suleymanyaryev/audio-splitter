import { MAXIMUM_RANGE_SECONDS } from '@/entities/split/config/range-limits.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import type { Track } from '@/entities/split/model/split.ts'

// Where a track lies in the file, as the start and end the views map onto their canvas.
export function trackExtent(track: Track): TimeRange {
  return { startSeconds: track.startSeconds, endSeconds: track.startSeconds + track.lengthSeconds }
}

/*
The stretch the player plays for a track: all of it, or its first 10 min when it is longer, which is
the most the player decodes at a time (docs/concepts/08-listening-to-a-range.md).
*/
export function trackStretch(track: Track): TimeRange {
  const { startSeconds, endSeconds } = trackExtent(track)
  return { startSeconds, endSeconds: Math.min(endSeconds, startSeconds + MAXIMUM_RANGE_SECONDS) }
}
