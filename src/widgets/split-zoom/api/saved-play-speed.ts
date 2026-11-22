import {
  DEFAULT_PLAY_SPEED,
  MAX_PLAY_SPEED,
  MIN_PLAY_SPEED,
  PLAY_SPEED_STEP,
  PLAY_SPEED_STORAGE_KEY,
} from '../config/play-speed.ts'

// How many steps from zero a play speed is: 1.3 is 13, where 1.3 / 0.1 is 13.000000000000002.
const stepsOf = (speed: number) => Math.round(speed / PLAY_SPEED_STEP)

// A number on the slider's grid, from the slowest to the fastest: anything else was not saved by this app.
function isPlaySpeed(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  const steps = stepsOf(value)
  return (
    Math.abs(value - steps * PLAY_SPEED_STEP) < 1e-9 &&
    steps >= stepsOf(MIN_PLAY_SPEED) &&
    steps <= stepsOf(MAX_PLAY_SPEED)
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
