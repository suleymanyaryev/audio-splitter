import {
  CONTRAST_MAX_DB,
  CONTRAST_MIN_DB,
  DEFAULT_CONTRAST_DB,
  DEFAULT_DEPTH_DB,
  DEFAULT_SETTINGS_STORAGE_KEY,
  DEPTH_MAX_DB,
  DEPTH_MIN_DB,
  MINIMUM_GAP_MAX_SECONDS,
  MINIMUM_GAP_MIN_SECONDS,
} from '../config/defaults.ts'
import { roundToTenth } from '../lib/round-to-tenth.ts'

/*
The default settings (GLOSSARY.md): the silence threshold as a distance under the source file's
median loudness, so it suits files of any loudness, the minimum gap length, the depth, and
whether contrast is on with the contrast it must reach.
*/
export interface DefaultSettings {
  offsetDb: number
  minimumGapSeconds: number
  depthDb: number
  contrastOn: boolean
  contrastDb: number
}

/*
The shape in storage: a version, so a later shape can tell this one from its own. Version 1 had no
depth and version 2 no contrast, so both are still read, with what they lack at its start (the
depth 15 dB, contrast off at 5.4 dB).
*/
const VERSION = 3
const VERSION_WITHOUT_CONTRAST = 2
const VERSION_WITHOUT_DEPTH = 1

function isOnTenthGrid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && roundToTenth(value) === value
}

/*
The distance is any value on the 0.1 grid; the length, the depth and the contrast threshold are also
inside their sliders' ranges, and contrast on or off is a boolean. A version that lacks the depth or
the contrast is not asked for them.
*/
function isDefaultSettings(
  saved: Record<string, unknown>,
  { hasDepth, hasContrast }: { hasDepth: boolean; hasContrast: boolean },
) {
  const { offsetDb, minimumGapSeconds, depthDb, contrastOn, contrastDb } = saved
  return (
    isOnTenthGrid(offsetDb) &&
    isOnTenthGrid(minimumGapSeconds) &&
    minimumGapSeconds >= MINIMUM_GAP_MIN_SECONDS &&
    minimumGapSeconds <= MINIMUM_GAP_MAX_SECONDS &&
    (!hasDepth || (isOnTenthGrid(depthDb) && depthDb >= DEPTH_MIN_DB && depthDb <= DEPTH_MAX_DB)) &&
    (!hasContrast ||
      (typeof contrastOn === 'boolean' &&
        isOnTenthGrid(contrastDb) &&
        contrastDb >= CONTRAST_MIN_DB &&
        contrastDb <= CONTRAST_MAX_DB))
  )
}

/*
What the user saved, or null: the first time, a value that is not what `saveDefaultSettings`
writes (any other version included), or a browser that blocks storage (reading `localStorage`
itself can throw).
*/
export function readSavedDefaultSettings(): DefaultSettings | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(DEFAULT_SETTINGS_STORAGE_KEY) ?? 'null')
    if (typeof saved === 'object' && saved !== null && 'version' in saved) {
      const fields = saved as Record<string, unknown>
      const hasContrast = saved.version === VERSION
      const hasDepth = hasContrast || saved.version === VERSION_WITHOUT_CONTRAST
      if (
        (hasDepth || saved.version === VERSION_WITHOUT_DEPTH) &&
        isDefaultSettings(fields, { hasDepth, hasContrast })
      ) {
        return {
          offsetDb: fields.offsetDb as number,
          minimumGapSeconds: fields.minimumGapSeconds as number,
          depthDb: hasDepth ? (fields.depthDb as number) : DEFAULT_DEPTH_DB,
          contrastOn: hasContrast && (fields.contrastOn as boolean),
          contrastDb: hasContrast ? (fields.contrastDb as number) : DEFAULT_CONTRAST_DB,
        }
      }
    }
  } catch {
    // Blocked storage, or text that is no JSON: none saved.
  }
  return null
}

export function saveDefaultSettings({
  offsetDb,
  minimumGapSeconds,
  depthDb,
  contrastOn,
  contrastDb,
}: DefaultSettings) {
  try {
    localStorage.setItem(
      DEFAULT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        offsetDb,
        minimumGapSeconds,
        depthDb,
        contrastOn,
        contrastDb,
      }),
    )
  } catch {
    // Blocked or full: the default settings last for this visit only.
  }
}
