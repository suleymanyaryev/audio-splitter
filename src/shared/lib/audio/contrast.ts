import { median } from './median.ts'
import { SPECTRUM_BOTTOM_HZ, bandDecibels, type Spectrogram } from './spectrogram-builder.ts'

/*
How far apart the sound of the minute before each point and the minute after it are, in dB
(GLOSSARY.md: Contrast). The idea and the numbers are in docs/concepts/15-contrast.md.

The curve has one point every 0.5 s, which is 10 windows (see loudness-builder.ts). Point i is the
start of block i: its stretch before is the 120 blocks ahead of it, its stretch after the 120 from
it on.
*/

// A block is 10 windows, 0.5 s.
const BLOCK_WINDOWS = 10
// Each stretch is 60 s, 120 blocks.
const STRETCH_SECONDS = 60
// A peak is the highest point within 15 s on either side.
const PEAK_RADIUS_SECONDS = 15
// The bands whose top edge is over this are left out: the encoder cut them away (note 14).
const TOP_KEPT_HZ = 15_000
/*
A window under the median loudness minus this many dB counts in neither stretch. It is the built-in
silence threshold (entities/split/config/defaults.ts), not the user's slider, so the curve depends
on no setting.
*/
const QUIET_OFFSET_DB = 18
// A stretch needs this much sound, in seconds of loud windows, or its point scores 0.
const MINIMUM_SOUND_SECONDS = 2

// How many bands of the spectrogram are kept: those whose top edge is at or under 15 kHz.
function keptBandCount({ bandCount, topHz }: Spectrogram) {
  const ratio = topHz / SPECTRUM_BOTTOM_HZ
  let kept = 0
  while (
    kept < bandCount &&
    SPECTRUM_BOTTOM_HZ * ratio ** ((kept + 1) / bandCount) <= TOP_KEPT_HZ
  ) {
    kept++
  }
  return kept
}

// How long one point of the curve lasts: a block of windows.
export function contrastStepSeconds(windowSeconds: number): number {
  return BLOCK_WINDOWS * windowSeconds
}

// A stored byte as power, relative to full scale: 10^(dB / 10), for each of the 256 values.
const POWER_OF_BYTE = Float64Array.from(
  { length: 256 },
  (_, value) => 10 ** (bandDecibels(value) / 10),
)

/*
Running sums over the blocks, one entry before the first block: `power[block * kept + band]` is the
sum, over the loud windows of every block before `block`, of that band's power, and `loud[block]` is
the count of those windows. The sum of a stretch is then a difference of two entries, so no point
adds up a minute again. Float64, as the sums grow far past a float32's precision.
*/
function blockSums(spectrogram: Spectrogram, isLoud: Uint8Array, kept: number) {
  const { bands, bandCount } = spectrogram
  const blocks = Math.ceil(isLoud.length / BLOCK_WINDOWS)
  const power = new Float64Array((blocks + 1) * kept)
  const loud = new Float64Array(blocks + 1)
  for (let block = 0; block < blocks; block++) {
    const into = (block + 1) * kept
    power.copyWithin(into, block * kept, into)
    loud[block + 1] = loud[block] ?? 0
    const end = Math.min(isLoud.length, (block + 1) * BLOCK_WINDOWS)
    for (let window = block * BLOCK_WINDOWS; window < end; window++) {
      if (isLoud[window] === 0) continue
      loud[block + 1] = (loud[block + 1] ?? 0) + 1
      for (let band = 0; band < kept; band++) {
        const at = into + band
        power[at] = (power[at] ?? 0) + (POWER_OF_BYTE[bands[window * bandCount + band] ?? 0] ?? 0)
      }
    }
  }
  return { power, loud, blocks }
}

/*
The contrast curve of a file, one value in dB per 0.5 s, from its spectrogram and loudness curve
(which share their windows).

At each point, each band's mean power over the loud windows of the stretch before and of the stretch
after goes back to dB. The change of each band is after minus before; contrast is the RMS of those
changes once their mean is taken away, so a whole sound getting louder reads 0 and a change of its
shape does not. A point with under 2 s of loud windows on either side scores 0.
*/
export function buildContrast(
  spectrogram: Spectrogram,
  loudness: Float32Array,
  windowSeconds: number,
): Float32Array {
  if (loudness.length === 0) return new Float32Array(0)

  const kept = keptBandCount(spectrogram)
  const quietUnder = median(loudness) - QUIET_OFFSET_DB
  const isLoud = Uint8Array.from(loudness, (decibels) => (decibels >= quietUnder ? 1 : 0))
  const { power, loud, blocks } = blockSums(spectrogram, isLoud, kept)
  const stretchBlocks = Math.round(STRETCH_SECONDS / contrastStepSeconds(windowSeconds))
  const minimumLoud = Math.ceil(MINIMUM_SOUND_SECONDS / windowSeconds)

  const curve = new Float32Array(blocks)
  const change = new Float64Array(kept)
  for (let point = 0; point < blocks; point++) {
    const from = Math.max(0, point - stretchBlocks)
    const to = Math.min(blocks, point + stretchBlocks)
    const loudBefore = (loud[point] ?? 0) - (loud[from] ?? 0)
    const loudAfter = (loud[to] ?? 0) - (loud[point] ?? 0)
    if (loudBefore < minimumLoud || loudAfter < minimumLoud) continue

    let mean = 0
    for (let band = 0; band < kept; band++) {
      const before =
        ((power[point * kept + band] ?? 0) - (power[from * kept + band] ?? 0)) / loudBefore
      const after = ((power[to * kept + band] ?? 0) - (power[point * kept + band] ?? 0)) / loudAfter
      change[band] = 10 * Math.log10(after / before)
      mean += (change[band] ?? 0) / kept
    }
    let squares = 0
    for (let band = 0; band < kept; band++) squares += ((change[band] ?? 0) - mean) ** 2
    curve[point] = Math.sqrt(squares / kept)
  }
  return curve
}

// A contrast peak: where it is and how high it reaches.
export interface ContrastPeak {
  seconds: number
  contrast: number
}

/*
The contrast peaks of a curve: each point at or over the threshold that is the highest within 15 s
on either side (the earlier of equal ones), and has a full minute either side of it, so none is
within 60 s of the file's start or end, where one stretch is cut short. The end is checked in
seconds, as the last point's block is cut short when the file does not end on a whole block.
*/
export function findContrastPeaks(
  contrast: Float32Array,
  threshold: number,
  stepSeconds: number,
  durationSeconds: number,
): ContrastPeak[] {
  const radius = Math.round(PEAK_RADIUS_SECONDS / stepSeconds)
  const margin = Math.round(STRETCH_SECONDS / stepSeconds)
  const peaks: ContrastPeak[] = []
  for (
    let index = margin;
    index + margin <= contrast.length && (index + margin) * stepSeconds <= durationSeconds;
    index++
  ) {
    const value = contrast[index] ?? 0
    if (value < threshold) continue
    let isHighest = true
    for (let at = Math.max(0, index - radius); isHighest && at <= index + radius; at++) {
      const other = contrast[at] ?? 0
      // Of equal points the earlier is kept, so an equal one before this one beats it.
      isHighest = at < index ? other < value : other <= value
    }
    if (isHighest) peaks.push({ seconds: index * stepSeconds, contrast: value })
  }
  return peaks
}
