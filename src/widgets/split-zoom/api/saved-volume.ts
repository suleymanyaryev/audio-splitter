import { MAX_VOLUME_DB, MIN_VOLUME_DB, VOLUME_STORAGE_KEY } from '../config/volume.ts'

export interface SavedVolume {
  volumeDecibels: number
  isMuted: boolean
}

// Whole dB on the slider's scale and a real boolean: anything else was not saved by this app.
function isVolume(value: unknown): value is SavedVolume {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('volumeDecibels' in value) ||
    !('isMuted' in value)
  )
    return false
  const { volumeDecibels, isMuted } = value
  return (
    typeof volumeDecibels === 'number' &&
    Number.isSafeInteger(volumeDecibels) &&
    volumeDecibels >= MIN_VOLUME_DB &&
    volumeDecibels <= MAX_VOLUME_DB &&
    typeof isMuted === 'boolean'
  )
}

/*
What the last visit left, or full volume and unmuted: the first time, a value that is not what
`saveVolume` writes, or a browser that blocks storage (reading `localStorage` itself can throw).
*/
export function readSavedVolume(): SavedVolume {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(VOLUME_STORAGE_KEY) ?? 'null')
    if (isVolume(saved)) return { volumeDecibels: saved.volumeDecibels, isMuted: saved.isMuted }
  } catch {
    // Blocked storage, or text that is no JSON: the defaults below.
  }
  return { volumeDecibels: MAX_VOLUME_DB, isMuted: false }
}

export function saveVolume(volume: SavedVolume) {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify(volume))
  } catch {
    // Blocked or full: the setting lasts for this visit only.
  }
}
