import { createFft } from './fft.ts'
import { loudnessWindowSeconds } from './loudness-builder.ts'

// Concept note 14: 2048 samples are 46 ms at 44.1 kHz, with a step of 21.5 Hz between tones.
const FRAME_SIZE = 2048
export const SPECTRUM_BAND_COUNT = 128
// The bottom of the log axis; the top is half the sample rate.
export const SPECTRUM_BOTTOM_HZ = 50
// The app's floor, as for the loudness curve; a band is held between it and 0 dB.
const FLOOR_DB = -100
const BYTE_MAX = 255

export type Spectrogram = {
  // One column per loudness window, `bandCount` bytes each, band 0 (50 Hz) first.
  bands: Uint8Array
  bandCount: number
  // Half the sample rate, the top of the log axis.
  topHz: number
}

// A stored byte as dB: 0 is -100 dB and 255 is 0 dB, about 0.4 dB a level.
export function bandDecibels(value: number): number {
  return FLOOR_DB + (value / BYTE_MAX) * -FLOOR_DB
}

function byteOf(decibels: number): number {
  const held = Math.min(0, Math.max(FLOOR_DB, decibels))
  return Math.round(((held - FLOOR_DB) / -FLOOR_DB) * BYTE_MAX)
}

/*
Which steps each band sums. Band b runs from 50 × r^b to 50 × r^(b+1) Hz, r being the 128th root
of (top / 50), so every band is the same ratio wide and each octave gets the same number of bands.
A band holds the steps whose centres fall in it; a band too narrow to hold any (the bass) takes
the one step it lies in, the step nearest its middle, so neighbouring bands repeat it: the blocky
bass of concept note 14.
*/
function bandSteps(sampleRate: number) {
  const step = sampleRate / FRAME_SIZE
  const top = sampleRate / 2
  const edge = (band: number) =>
    SPECTRUM_BOTTOM_HZ * (top / SPECTRUM_BOTTOM_HZ) ** (band / SPECTRUM_BAND_COUNT)
  const first = new Uint16Array(SPECTRUM_BAND_COUNT)
  const end = new Uint16Array(SPECTRUM_BAND_COUNT)
  for (let band = 0; band < SPECTRUM_BAND_COUNT; band++) {
    const low = edge(band)
    const high = edge(band + 1)
    const firstStep = Math.ceil(low / step)
    // The top edge is half the rate, whose step is the last one, and belongs to the top band.
    const endStep = band === SPECTRUM_BAND_COUNT - 1 ? FRAME_SIZE / 2 + 1 : Math.ceil(high / step)
    if (endStep > firstStep) {
      first[band] = firstStep
      end[band] = endStep
      continue
    }
    const nearest = Math.round((low + high) / 2 / step)
    first[band] = nearest
    end[band] = nearest + 1
  }
  return { first, end }
}

/*
The Hann window, one cycle of a cosine from 0 at the frame's ends to 1 in its middle, so the
frame has no jump where its end meets its start (concept note 14).
*/
function hannWindow() {
  return Float64Array.from(
    { length: FRAME_SIZE },
    (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / FRAME_SIZE),
  )
}

/*
Builds the spectrogram of a mono signal: one spectrum per loudness window, as 128 bands on a log
axis from 50 Hz to half the sample rate, one byte each from -100 to 0 dB. The column count is the
loudness curve's, so column i belongs to window i.

Each frame is 2048 samples centred on its window's middle, so it reaches past its window on both
sides at 22.05 kHz and falls a little short of it at 44.1 and 48 kHz. A frame that reaches before
the file's start or past its end reads zeros there.

The signal arrives slice by slice with `push`, and a frame can need samples of the next slice. The
builder keeps the samples from the next frame's start on (the leftover, as in
docs/concepts/02-long-files.md) and works out a column once every sample of its frame has arrived;
`finish` works out the rest with zeros past the end. The slice size therefore never changes the
result.
*/
export function createSpectrogramBuilder(sampleRate: number) {
  const windowSize = Math.round(sampleRate * loudnessWindowSeconds(sampleRate))
  const fft = createFft(FRAME_SIZE)
  const hann = hannWindow()
  const { first, end } = bandSteps(sampleRate)
  /*
  The power of a full-scale sine through the same window, summed over the steps from 0 Hz to half
  the rate: N × Σw² / 4. Dividing by it makes that sine read 0 dB (concept note 14).
  */
  let sumOfSquares = 0
  for (const weight of hann) sumOfSquares += weight * weight
  const fullScalePower = (FRAME_SIZE * sumOfSquares) / 4

  const re = new Float64Array(FRAME_SIZE)
  const im = new Float64Array(FRAME_SIZE)
  // One array of columns per push, joined once in `finish`.
  const chunks: Uint8Array[] = []
  let length = 0

  // The leftover: the samples from `keptStart` on, by their index in the whole signal.
  let kept = new Float32Array(0)
  let keptStart = 0
  let received = 0
  let nextColumn = 0

  const frameStart = (index: number) =>
    index * windowSize + Math.floor(windowSize / 2) - FRAME_SIZE / 2

  // Works out column `index` into `out` at `offset`. A sample outside `kept` is a zero.
  function writeColumn(index: number, out: Uint8Array, offset: number) {
    const start = frameStart(index)
    for (let position = 0; position < FRAME_SIZE; position++) {
      const at = start + position - keptStart
      re[position] = (kept[at] ?? 0) * (hann[position] ?? 0)
      im[position] = 0
    }
    fft(re, im)
    for (let band = 0; band < SPECTRUM_BAND_COUNT; band++) {
      let power = 0
      for (let step = first[band] ?? 0; step < (end[band] ?? 0); step++) {
        const stepRe = re[step] ?? 0
        const stepIm = im[step] ?? 0
        power += stepRe * stepRe + stepIm * stepIm
      }
      out[offset + band] = power > 0 ? byteOf(10 * Math.log10(power / fullScalePower)) : 0
    }
  }

  // Works out the columns before `columnEnd`, then drops the samples no later frame reads.
  function writeColumns(columnEnd: number) {
    const count = Math.max(0, columnEnd - nextColumn)
    const chunk = new Uint8Array(count * SPECTRUM_BAND_COUNT)
    for (let done = 0; done < count; done++) {
      writeColumn(nextColumn + done, chunk, done * SPECTRUM_BAND_COUNT)
    }
    nextColumn += count
    chunks.push(chunk)
    length += chunk.length

    const dropped = Math.min(kept.length, Math.max(0, frameStart(nextColumn) - keptStart))
    if (dropped <= 0) return

    kept = kept.slice(dropped)
    keptStart += dropped
  }

  return {
    push(mono: Float32Array): void {
      const joined = new Float32Array(kept.length + mono.length)
      joined.set(kept)
      joined.set(mono, kept.length)
      kept = joined
      received += mono.length
      // A column is ready once its frame's last sample has arrived.
      let ready = nextColumn
      while (frameStart(ready) + FRAME_SIZE <= received) ready++
      writeColumns(ready)
    },

    // Works out the columns still open, one per loudness window, with zeros past the end.
    finish(): Spectrogram {
      writeColumns(Math.ceil(received / windowSize))
      const bands = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) {
        bands.set(chunk, offset)
        offset += chunk.length
      }
      return { bands, bandCount: SPECTRUM_BAND_COUNT, topHz: sampleRate / 2 }
    },
  }
}
