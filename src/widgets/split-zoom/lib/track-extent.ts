import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import type { Track } from '@/entities/split/model/split.ts'

/*
Where a track lies in the file, as the start and end the views map onto their canvas and the
stretch the player is asked to play: all of it, however long (a long one is heard through a moving
window, `decode-window.ts`).
*/
export function trackExtent(track: Track): TimeRange {
  return { startSeconds: track.startSeconds, endSeconds: track.startSeconds + track.lengthSeconds }
}
