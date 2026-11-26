import { LIKELY_DEPTH_DB, SURE_DEPTH_DB } from '../config/confidence-bands.ts'

// How sure a detected split is (GLOSSARY.md: Confidence).
export type ConfidenceBand = 'sure' | 'likely' | 'doubtful'

/*
The band and the measures behind it, in dB, which a tooltip shows: the depth of a gap or a dip, the
contrast of a contrast split, or both; none for a measure the split was not proposed by.
*/
export interface Confidence {
  band: ConfidenceBand
  depth: number | null
  contrast: number | null
}

// What a tooltip says of a confidence: each measure it has, in dB.
export function describeMeasures({ depth, contrast }: Confidence): string {
  const measures: string[] = []
  if (depth !== null) measures.push(`${depth.toFixed(1)} dB under its surroundings`)
  if (contrast !== null) measures.push(`${contrast.toFixed(1)} dB of contrast`)
  return measures.join(' and ')
}

// The band of a depth: sure from 15 dB, likely from 9 dB, doubtful under it.
export function bandOf(depth: number): ConfidenceBand {
  if (depth >= SURE_DEPTH_DB) return 'sure'
  return depth >= LIKELY_DEPTH_DB ? 'likely' : 'doubtful'
}
