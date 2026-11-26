import { computed, ref } from 'vue'

import { usePlayerStore } from '../model/player.ts'
import { usePlayheadFrames } from './use-playhead-frames.ts'

/*
The playhead slider's value for the view on show, and the frames that keep its playhead moving.
While the player plays the playhead follows the audio, which Vue does not see, so each frame copies
it here to the whole second, and `draw` runs: a screen reader hears a new value once a second, not on
every frame. That second is never under the extent's start, the slider's minimum, which can be
fractional. Otherwise the value is the resting place, which Vue does see, to the hundredth; with
nothing on show it is 0.
*/
export function usePlayheadSlider(draw: () => void) {
  const player = usePlayerStore()
  const heardSeconds = ref(0)

  usePlayheadFrames(
    () => player.status === 'playing',
    () => {
      heardSeconds.value = Math.max(
        player.extent?.startSeconds ?? 0,
        Math.floor(player.playheadSeconds() ?? 0),
      )
      draw()
    },
  )

  return computed(() =>
    player.status === 'playing' ? heardSeconds.value : (player.playheadSeconds() ?? 0),
  )
}
