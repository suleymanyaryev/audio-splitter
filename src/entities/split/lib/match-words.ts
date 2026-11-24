import { padTrackNumber } from './pad-track-number.ts'

/*
What a duplicate's row and block say (GLOSSARY.md: Duplicate): "duplicate of 01", and "duplicate of
01 Opening" when the kept copy has a name of its own. The number is the kept copy's place in the
file as it is now, padded as the track list pads its numbers, so it points at the right track after
a split is added elsewhere.
*/
export function duplicateWords(
  kept: { number: number; ownName: string | null },
  trackCount: number,
): string {
  const words = `duplicate of ${padTrackNumber(kept.number, trackCount)}`
  return kept.ownName === null ? words : `${words} ${kept.ownName}`
}
