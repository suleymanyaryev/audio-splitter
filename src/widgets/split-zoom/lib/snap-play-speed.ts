import { PLAY_SPEED_STEP } from '../config/play-speed.ts'

const STEPS_PER_UNIT = Math.round(1 / PLAY_SPEED_STEP)

/*
The speed on the slider's grid nearest to `speed`. The whole step count is divided by the steps in
one unit, not multiplied by the step, so 1.3 comes out as 1.3 and not 1.3000000000000003. A speed
that is already on the grid comes back unchanged, which is how the saved value is checked.
*/
export function snapPlaySpeed(speed: number): number {
  return Math.round(speed / PLAY_SPEED_STEP) / STEPS_PER_UNIT
}
