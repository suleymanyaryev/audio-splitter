import type { Track } from '@/entities/split/model/split.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'

/*
The Track view panel's title, in the zoom title's place: the track's name and where it starts and
ends, with hundredths, like `4 · 0:03:00.93 – 0:04:50.02`.
*/
export function trackTitle(track: Track): string {
  const end = track.startSeconds + track.lengthSeconds
  return `${track.name} · ${formatHundredths(track.startSeconds)} – ${formatHundredths(end)}`
}
