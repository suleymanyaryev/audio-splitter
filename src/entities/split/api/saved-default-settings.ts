import {
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
median loudness, so it suits files of any loudness, the minimum gap length and the depth.
*/
export interface DefaultSettings {
  offsetDb: number
  minimumGapSeconds: number
  depthDb: number
}

/*
The shape in storage: a version, so a later shape can tell this one from its own. Version 1 had no
depth, so it is still read, with the depth at its start.
*/
const VERSION = 2
const VERSION_WITHOUT_DEPTH = 1

function isOnTenthGrid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && roundToTenth(value) === value
}

// The distance is any value on the 0.1 grid; the length and the depth are also inside their sliders' ranges.
function isDefaultSettings(saved: Record<string, unknown>, hasDepth: boolean) {
  const { offsetDb, minimumGapSeconds, depthDb } = saved
  return (
    isOnTenthGrid(offsetDb) &&
    isOnTenthGrid(minimumGapSeconds) &&
    minimumGapSeconds >= MINIMUM_GAP_MIN_SECONDS &&
    minimumGapSeconds <= MINIMUM_GAP_MAX_SECONDS &&
    (!hasDepth || (isOnTenthGrid(depthDb) && depthDb >= DEPTH_MIN_DB && depthDb <= DEPTH_MAX_DB))
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
      const hasDepth = saved.version === VERSION
      if (
        (hasDepth || saved.version === VERSION_WITHOUT_DEPTH) &&
        isDefaultSettings(fields, hasDepth)
      ) {
        return {
          offsetDb: fields.offsetDb as number,
          minimumGapSeconds: fields.minimumGapSeconds as number,
          depthDb: hasDepth ? (fields.depthDb as number) : DEFAULT_DEPTH_DB,
        }
      }
    }
  } catch {
    // Blocked storage, or text that is no JSON: none saved.
  }
  return null
}

export function saveDefaultSettings({ offsetDb, minimumGapSeconds, depthDb }: DefaultSettings) {
  try {
    localStorage.setItem(
      DEFAULT_SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: VERSION, offsetDb, minimumGapSeconds, depthDb }),
    )
  } catch {
    // Blocked or full: the default settings last for this visit only.
  }
}
