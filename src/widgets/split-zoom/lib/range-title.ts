import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'

/*
The Range view panel's title, in the zoom title's place: where the range starts and ends and how
long it is, all with hundredths, like `0:42:03.25 – 0:44:10.00 · 2:06.75`. A range is at most 10
min, so its length drops the hour and the minutes' leading zero (`2:06.75`, `10:00.00`).
*/
export function rangeTitle(range: TimeRange): string {
  const length = formatHundredths(range.endSeconds - range.startSeconds).replace(/^0:0?/, '')
  return `${formatHundredths(range.startSeconds)} – ${formatHundredths(range.endSeconds)} · ${length}`
}
