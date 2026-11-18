import { onBeforeUnmount, watch } from 'vue'

/*
Keeps a playhead moving. It follows the audio, which Vue does not see, so while `isPlaying` is
true `draw` runs on every animation frame (a few hundred bars and a few lines: cheap). When
playback ends the loop stops and `draw` runs once more, which takes the line away or parks it. The
frame is cancelled when the component unmounts.
*/
export function usePlayheadFrames(isPlaying: () => boolean, draw: () => void) {
  const loop: { frameId: number | undefined } = { frameId: undefined }

  function onFrame() {
    if (!isPlaying()) return
    loop.frameId = requestAnimationFrame(onFrame)
    draw()
  }

  function stopFrames() {
    if (loop.frameId === undefined) return
    cancelAnimationFrame(loop.frameId)
    loop.frameId = undefined
  }

  watch(isPlaying, (playing) => {
    stopFrames()
    if (playing) loop.frameId = requestAnimationFrame(onFrame)
    else draw()
  })

  onBeforeUnmount(stopFrames)
}
