import type { TimeRange } from '@/entities/split/lib/range-between.ts'

// `h.mm.ss`: dots, because a colon is no use in a file name. Rounded first, so 59.6 s carries.
function dotted(seconds: number): string {
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const secs = String(total % 60).padStart(2, '0')
  return `${hours}.${minutes}.${secs}`
}

// What the name dialog opens with for a range: `Evening Set 0.42.03–0.44.10`.
export function rangeDefaultName(sourceStem: string, range: TimeRange): string {
  return `${sourceStem} ${dotted(range.startSeconds)}–${dotted(range.endSeconds)}`
}
