import { describe, it, expect } from 'vitest'

import { buildContrast, contrastStepSeconds, findContrastPeaks } from '../contrast.ts'
import { SPECTRUM_BAND_COUNT, type Spectrogram } from '../spectrogram-builder.ts'

const WINDOW_SECONDS = 0.05
// 44.1 kHz: half the rate, the top of the log axis. 119 of its 128 bands end at or under 15 kHz.
const TOP_HZ = 22_050
const KEPT_BANDS = 119
// 51 stored levels are exactly 20 dB (a level is 100 / 255 dB).
const TWENTY_DB = 51
const LOUD = -20
const QUIET = -60

// 8000 windows are 400 s, 800 points; the point at index 400 is the 200 s mark, window 4000.
const COLUMNS = 8000
const MIDDLE = 400
const middleWindow = MIDDLE * 10

// A spectrogram of the file whose stored level is `level(column, band)`.
function spectrogramOf(level: (column: number, band: number) => number) {
  const bands = new Uint8Array(COLUMNS * SPECTRUM_BAND_COUNT)
  for (let column = 0; column < COLUMNS; column++) {
    for (let band = 0; band < SPECTRUM_BAND_COUNT; band++) {
      bands[column * SPECTRUM_BAND_COUNT + band] = level(column, band)
    }
  }
  return { bands, bandCount: SPECTRUM_BAND_COUNT, topHz: TOP_HZ } satisfies Spectrogram
}

const loudnessOf = (level: (column: number) => number) =>
  Float32Array.from({ length: COLUMNS }, (_, column) => level(column))

// The contrast at window 2000 when only the first `loud` windows after it are loud, bands changing.
function contrastWithLoudAfter(loud: number) {
  const isLoud = (column: number) => column < 2000 || column >= 3200 || column < 2000 + loud
  const curve = buildContrast(
    spectrogramOf((column, band) =>
      column >= 2000 && column < 3200 && band < CHANGED_BANDS ? 100 + TWENTY_DB : 100,
    ),
    loudnessOf((column) => (isLoud(column) ? LOUD : QUIET)),
    WINDOW_SECONDS,
  )
  return curve[200] ?? NaN
}

// One window in ten is quiet in the test of the quiet windows.
const isQuiet = (column: number) => column % 10 === 3

/*
The contrast at the middle of a file whose bands at `level` change from `before` to `after` there,
the loudness `loudness` throughout.
*/
function contrastAtMiddle(
  level: (column: number, band: number) => number,
  loudness: (column: number) => number = () => LOUD,
) {
  const curve = buildContrast(spectrogramOf(level), loudnessOf(loudness), WINDOW_SECONDS)
  return curve[MIDDLE] ?? NaN
}

/*
The RMS of a change of 20 dB in 60 of the 119 bands, the others unchanged: the mean change is 20 × f
with f = 60 / 119, and what is left of the changed bands and the rest has the RMS 20 × √(f × (1 − f)).
*/
const CHANGED_BANDS = 60
const RMS_OF_PARTIAL_CHANGE =
  20 * Math.sqrt((CHANGED_BANDS / KEPT_BANDS) * (1 - CHANGED_BANDS / KEPT_BANDS))

describe('contrast', () => {
  it('has one point every 0.5 s', () => {
    const curve = buildContrast(
      spectrogramOf(() => 100),
      loudnessOf(() => LOUD),
      WINDOW_SECONDS,
    )

    expect(curve).toHaveLength(800)
    expect(contrastStepSeconds(WINDOW_SECONDS)).toBeCloseTo(0.5, 9)
  })

  it('is 0 everywhere in a sound that never changes', () => {
    const curve = buildContrast(
      spectrogramOf((_, band) => 20 + band),
      loudnessOf(() => LOUD),
      WINDOW_SECONDS,
    )

    for (const value of curve) expect(value).toBeCloseTo(0, 4)
  })

  it('is 0 where the same sound gets 20 dB louder', () => {
    const contrast = contrastAtMiddle((column, band) =>
      column < middleWindow ? 20 + band : 20 + band + TWENTY_DB,
    )

    expect(contrast).toBeCloseTo(0, 4)
  })

  it('is the RMS of a change in some bands and not the others, worked out for 119 bands', () => {
    // 60 bands 20 dB louder: the mean change is 20 × 60 / 119, the RMS of the rest 20 × √(f × (1 − f)).
    const contrast = contrastAtMiddle((column, band) =>
      column >= middleWindow && band < CHANGED_BANDS ? 100 + TWENTY_DB : 100,
    )

    expect(contrast).toBeCloseTo(RMS_OF_PARTIAL_CHANGE, 3)
    expect(contrast).toBeCloseTo(9.9995, 3)
  })

  it('does not hear a change over 15 kHz', () => {
    const contrast = contrastAtMiddle((column, band) =>
      column >= middleWindow && band >= KEPT_BANDS ? 100 + TWENTY_DB : 100,
    )

    expect(contrast).toBeCloseTo(0, 4)
  })

  it('leaves the windows under the median minus 18 dB out of both stretches', () => {
    // One window in ten is quiet, with a spectrum unlike the loud ones; the loud ones never change.
    const contrast = contrastAtMiddle(
      (column, band) => (isQuiet(column) && band < CHANGED_BANDS ? 100 + TWENTY_DB : 100),
      (column) => (isQuiet(column) ? QUIET : LOUD),
    )

    expect(contrast).toBeCloseTo(0, 4)
  })

  it('scores 0 with under 2 s of loud windows on a side, and reads it from 2 s', () => {
    // The 60 s after the point (windows 2000 to 3199) are quiet but for their first `loud`.
    expect(contrastWithLoudAfter(39)).toBe(0)
    expect(contrastWithLoudAfter(40)).toBeCloseTo(RMS_OF_PARTIAL_CHANGE, 3)
  })
})

// A curve of 800 points (400 s), 0 but for `at`: value.
function curveWith(at: Record<number, number>) {
  const curve = new Float32Array(800)
  for (const [index, value] of Object.entries(at)) curve[Number(index)] = value
  return curve
}

describe('contrast peaks', () => {
  const STEP = 0.5

  it('is the point itself, with its time and contrast, for a single peak', () => {
    expect(findContrastPeaks(curveWith({ 400: 7 }), 5.4, STEP)).toEqual([
      { seconds: 200, contrast: 7 },
    ])
  })

  it('is the highest point within 15 s on either side', () => {
    // 30 points are 15 s: 430 is the edge of 400's reach, 431 beyond it.
    const peaks = findContrastPeaks(curveWith({ 400: 7, 430: 8, 500: 6 }), 5.4, STEP)

    expect(peaks.map((peak) => peak.seconds)).toEqual([215, 250])
    expect(findContrastPeaks(curveWith({ 400: 7, 431: 8 }), 5.4, STEP)).toHaveLength(2)
  })

  it('takes the earlier of equal points', () => {
    const peaks = findContrastPeaks(curveWith({ 400: 7, 410: 7 }), 5.4, STEP)

    expect(peaks.map((peak) => peak.seconds)).toEqual([200])
  })

  it('has none under the threshold, and one at it', () => {
    expect(findContrastPeaks(curveWith({ 400: 5.3 }), 5.4, STEP)).toEqual([])
    expect(findContrastPeaks(curveWith({ 400: 5.4 }), 5.4, STEP)).toHaveLength(1)
  })

  it('has none within 60 s of the file ends', () => {
    // 60 s are 120 points: the first with a full minute either side is 120, the last length - 120.
    const edges = { 0: 9, 119: 7, 681: 7, 799: 9 }

    expect(findContrastPeaks(curveWith(edges), 5.4, STEP)).toEqual([])
    expect(findContrastPeaks(curveWith({ 120: 7, 680: 7 }), 5.4, STEP)).toEqual([
      { seconds: 60, contrast: 7 },
      { seconds: 340, contrast: 7 },
    ])
  })
})
