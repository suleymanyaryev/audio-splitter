import { LIKELY_CONTRAST_DB, LIKELY_DEPTH_DB, SURE_DEPTH_DB } from '../config/confidence-bands.ts'
import type { Proposal } from './propose-splits.ts'

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

// The band of a contrast: likely from 6.5 dB, doubtful under it, never sure.
export function contrastBandOf(contrast: number): ConfidenceBand {
  return contrast >= LIKELY_CONTRAST_DB ? 'likely' : 'doubtful'
}

// One band surer: doubtful to likely, likely to sure; sure stays.
function liftedBand(band: ConfidenceBand): ConfidenceBand {
  return band === 'doubtful' ? 'likely' : 'sure'
}

/*
A proposal's confidence: the band of the measure it was proposed by, and that measure. A dip that a
contrast peak agrees with is one band surer and keeps both measures.
*/
export function confidenceOf(proposal: Proposal): Confidence {
  if (proposal.kind === 'contrast') {
    return { band: contrastBandOf(proposal.contrast), depth: null, contrast: proposal.contrast }
  }
  const band = bandOf(proposal.depth)
  const contrast = proposal.contrast ?? null
  return { band: contrast === null ? band : liftedBand(band), depth: proposal.depth, contrast }
}

const BAND_RANK: Record<ConfidenceBand, number> = { doubtful: 0, likely: 1, sure: 2 }

/*
The order of review, for `{` and `}`: by band, doubtful first. Within a band, the splits that only
contrast proposed come first, least contrast first, then the others, least deep first. Equal splits
are left to the caller's order (time).
*/
export function compareConfidence(first: Confidence, second: Confidence): number {
  if (first.band !== second.band) return BAND_RANK[first.band] - BAND_RANK[second.band]
  const isFirstOnlyContrast = first.depth === null
  if (isFirstOnlyContrast !== (second.depth === null)) return isFirstOnlyContrast ? -1 : 1
  return isFirstOnlyContrast
    ? (first.contrast ?? 0) - (second.contrast ?? 0)
    : (first.depth ?? 0) - (second.depth ?? 0)
}
