import {
  DEFAULT_SETTINGS_STORAGE_KEY,
  MINIMUM_GAP_MAX_SECONDS,
  MINIMUM_GAP_MIN_SECONDS,
} from '../config/defaults.ts'
import { roundToTenth } from '../lib/round-to-tenth.ts'

/*
The default settings (GLOSSARY.md): the silence threshold as a distance under the source file's
median loudness, so it suits files of any loudness, and the minimum gap length.
*/
export interface DefaultSettings {
  offsetDb: number
  minimumGapSeconds: number
}

// The shape in storage: a version, so a later shape can tell this one from its own.
const VERSION = 1

function isOnTenthGrid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && roundToTenth(value) === value
}

// The distance is any value on the 0.1 grid; the length is also inside its slider's range.
function isDefaultSettings(saved: unknown): saved is DefaultSettings {
  if (typeof saved !== 'object' || saved === null) return false
  const { offsetDb, minimumGapSeconds } = saved as Record<string, unknown>
  return (
    isOnTenthGrid(offsetDb) &&
    isOnTenthGrid(minimumGapSeconds) &&
    minimumGapSeconds >= MINIMUM_GAP_MIN_SECONDS &&
    minimumGapSeconds <= MINIMUM_GAP_MAX_SECONDS
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
    if (
      typeof saved === 'object' &&
      saved !== null &&
      'version' in saved &&
      saved.version === VERSION &&
      isDefaultSettings(saved)
    ) {
      return { offsetDb: saved.offsetDb, minimumGapSeconds: saved.minimumGapSeconds }
    }
  } catch {
    // Blocked storage, or text that is no JSON: none saved.
  }
  return null
}

export function saveDefaultSettings({ offsetDb, minimumGapSeconds }: DefaultSettings) {
  try {
    localStorage.setItem(
      DEFAULT_SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: VERSION, offsetDb, minimumGapSeconds }),
    )
  } catch {
    // Blocked or full: the default settings last for this visit only.
  }
}
