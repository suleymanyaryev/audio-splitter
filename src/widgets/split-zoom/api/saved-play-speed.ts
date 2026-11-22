import {
  DEFAULT_PLAY_SPEED,
  MAX_PLAY_SPEED,
  MIN_PLAY_SPEED,
  PLAY_SPEED_STORAGE_KEY,
} from '../config/play-speed.ts'
import { snapPlaySpeed } from '../lib/snap-play-speed.ts'

// A number on the slider's grid, from the slowest to the fastest: anything else was not saved by this app.
function isPlaySpeed(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    value >= MIN_PLAY_SPEED &&
    value <= MAX_PLAY_SPEED &&
    snapPlaySpeed(value) === value
  )
}

/*
What the last visit left, or real time: the first time, a value that is not what `savePlaySpeed`
writes, or a browser that blocks storage (reading `localStorage` itself can throw).
*/
export function readSavedPlaySpeed(): number {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PLAY_SPEED_STORAGE_KEY) ?? 'null')
    if (typeof saved === 'object' && saved !== null && 'playSpeed' in saved) {
      const { playSpeed } = saved
      if (isPlaySpeed(playSpeed)) return playSpeed
    }
  } catch {
    // Blocked storage, or text that is no JSON: the default below.
  }
  return DEFAULT_PLAY_SPEED
}

export function savePlaySpeed(playSpeed: number) {
  try {
    localStorage.setItem(PLAY_SPEED_STORAGE_KEY, JSON.stringify({ playSpeed }))
  } catch {
    // Blocked or full: the setting lasts for this visit only.
  }
}
