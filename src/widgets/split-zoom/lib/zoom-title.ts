import { formatHundredths } from '@/shared/lib/time/format-hundredths.ts'

/*
The zoom view panel's title, its largest reading: the selected split's time. With nothing
selected it says why (the window was moved onto empty ground, or the file has no splits at all).
*/
export function zoomTitle(selectedSeconds: number | null, splitCount: number): string {
  if (selectedSeconds !== null) return formatHundredths(selectedSeconds)
  return splitCount === 0 ? 'No splits found' : 'No split selected'
}
