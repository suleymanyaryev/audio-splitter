import { LIKELY_DEPTH_DB, SURE_DEPTH_DB } from '../config/confidence-bands.ts'

// How sure a detected split is (GLOSSARY.md: Confidence).
export type ConfidenceBand = 'sure' | 'likely' | 'doubtful'

// The band and the depth behind it, in dB, which a tooltip shows.
export interface Confidence {
  band: ConfidenceBand
  depth: number
}

// The band of a depth: sure from 15 dB, likely from 9 dB, doubtful under it.
export function bandOf(depth: number): ConfidenceBand {
  if (depth >= SURE_DEPTH_DB) return 'sure'
  return depth >= LIKELY_DEPTH_DB ? 'likely' : 'doubtful'
}
