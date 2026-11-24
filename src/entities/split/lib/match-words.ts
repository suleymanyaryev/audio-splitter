import { padTrackNumber } from './pad-track-number.ts'

/*
What a duplicate's row and block say (GLOSSARY.md: Duplicate): "duplicate of 01". The number is the
kept copy's place in the file as it is now, padded as the track list pads its numbers, so it
points at the right track after a split is added elsewhere.
*/
export function duplicateWords(keptNumber: number, trackCount: number): string {
  return `duplicate of ${padTrackNumber(keptNumber, trackCount)}`
}
