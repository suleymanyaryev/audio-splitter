import { roundToMillisecond } from '@/shared/lib/time/round-to-millisecond.ts'
import { usePlayerStore } from '../model/player.ts'

// Left and Right move the playhead 1 s, with Shift 10 s.
const STEP_SECONDS = 1
const SHIFT_STEP_SECONDS = 10

/*
The keys the Range view and the Track view share, on the player's playhead: Space plays or pauses,
Home takes the playhead back to the start, Left and Right move it. A view asks `isStretchKeyActedOn`
first and then its own keys, and still registers its page keys and says `acted` itself (ADR 0002).
It answers true only for a key it used, so any other key is left to the view, or to the browser. A
held Space is taken but ignored, so it does not start and stop the sound over and over.
*/
export function useStretchKeys() {
  const player = usePlayerStore()

  function moveBy(direction: -1 | 1, isShifted: boolean) {
    const step = isShifted ? SHIFT_STEP_SECONDS : STEP_SECONDS
    player.seek(roundToMillisecond((player.playheadSeconds() ?? 0) + direction * step))
  }

  function isStretchKeyActedOn(event: KeyboardEvent) {
    switch (event.key) {
      case ' ': {
        if (!event.repeat) player.toggle()
        return true
      }
      case 'Home': {
        player.backToStart()
        return true
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        moveBy(event.key === 'ArrowLeft' ? -1 : 1, event.shiftKey)
        return true
      }
      default: {
        return false
      }
    }
  }

  return { isStretchKeyActedOn }
}
