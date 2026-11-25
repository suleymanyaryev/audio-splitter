import type { Confidence } from './confidence-band.ts'

/*
The items that still have a confidence, least deep first; equal depths keep the order given, which
is time order for the splits. Each is put after the last one no deeper than it, so the sort is
stable, and no array sort is needed.
*/
export function confidenceQueue<T extends { confidence: Confidence | null }>(
  items: readonly T[],
): T[] {
  const queue: T[] = []
  for (const item of items) {
    if (item.confidence === null) continue
    const { depth } = item.confidence
    const deeper = queue.findIndex((queued) => (queued.confidence?.depth ?? 0) > depth)
    queue.splice(deeper === -1 ? queue.length : deeper, 0, item)
  }
  return queue
}
