import { decibelsToGain } from '@/shared/lib/audio/decibels-to-gain.ts'

// What the source-file store gives for a clip.
export interface Clip {
  wav: Uint8Array
  startSeconds: number
  lengthSeconds: number
}

// A clip whose WAV is behind an object URL: ready to be held now or handed over to later.
export interface ReadyClip {
  url: string
  startSeconds: number
  lengthSeconds: number
}

/*
Puts a clip's WAV behind an object URL (1.4 MB each, docs/concepts/06-seeking-compressed-audio.md)
without holding it.
*/
function prepare(clip: Clip): ReadyClip {
  const wav = new Blob([clip.wav as BlobPart], { type: 'audio/wav' })
  return {
    url: URL.createObjectURL(wav),
    startSeconds: clip.startSeconds,
    lengthSeconds: clip.lengthSeconds,
  }
}

// Lets go of a clip that was made ready and not held.
function discard(ready: ReadyClip) {
  URL.revokeObjectURL(ready.url)
}

/*
The one hidden `<audio>` element and everything that touches it. It holds one clip, a WAV, and maps
times in the file to times in the WAV (a clip starts at `startSeconds` of the file, so the element's
`currentTime` is the file's time minus that). It knows nothing of presses, windows or stretches:
those stay in the player store, which says when to hold, play, seek and release.

The element is made on first use, so loading the page creates no media element. Volume and play
speed (docs/adr/0004-time-stretching-by-the-browser.md) are applied when it is made, on every hold
and on every change: loading a source resets the element's rate to its default rate, so both the
default and the current rate are set.
*/
export function createAudioElement(on: { ended: () => void; timeUpdate: () => void }) {
  let element: HTMLAudioElement | undefined
  let url: string | undefined
  let clipStartSeconds = 0
  let clipLengthSeconds = 0
  let gain = 1
  let shouldMute = false
  let playSpeed = 1

  // `volume` is the element's linear gain and `muted` a second switch, so unmuting keeps the level.
  function applyVolume(target: HTMLAudioElement) {
    target.volume = gain
    target.muted = shouldMute
  }

  function applyPlaySpeed(target: HTMLAudioElement) {
    target.preservesPitch = true
    target.defaultPlaybackRate = playSpeed
    target.playbackRate = playSpeed
  }

  function made() {
    if (element === undefined) {
      element = new Audio()
      applyVolume(element)
      applyPlaySpeed(element)
      element.addEventListener('ended', on.ended)
      element.addEventListener('timeupdate', on.timeUpdate)
    }
    return element
  }

  // Sync, so sound that is playing changes at once. An element not made yet gets it when it is.
  function setVolume(decibels: number, isMuted: boolean) {
    gain = decibelsToGain(decibels)
    shouldMute = isMuted
    if (element !== undefined) applyVolume(element)
  }

  function setPlaySpeed(speed: number) {
    playSpeed = speed
    if (element !== undefined) applyPlaySpeed(element)
  }

  // Lets go of the held clip. Without `load()` the element keeps the old resource open after its src is gone.
  function release() {
    if (element !== undefined) {
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
    if (url !== undefined) URL.revokeObjectURL(url)
    url = undefined
  }

  // Makes the clip the only one held, dropping the previous one, and loads it.
  function hold(clip: Clip) {
    release()
    const ready = prepare(clip)
    url = ready.url
    clipStartSeconds = clip.startSeconds
    clipLengthSeconds = clip.lengthSeconds
    const target = made()
    target.src = url
    applyVolume(target)
    applyPlaySpeed(target)
  }

  /*
  Points the element at a clip made ready, at a time in the file, and lets go of the clip it
  finished: the hand-over to the window ahead, with no decode wait.
  */
  function handOver(next: ReadyClip, seconds: number) {
    const finished = url
    url = next.url
    clipStartSeconds = next.startSeconds
    clipLengthSeconds = next.lengthSeconds
    const target = made()
    target.src = next.url
    seek(seconds)
    applyVolume(target)
    applyPlaySpeed(target)
    if (finished !== undefined) URL.revokeObjectURL(finished)
  }

  // Where a time in the file is in the held WAV, clamped: a clip's WAV starts at its start.
  const offsetOf = (seconds: number) =>
    Math.min(Math.max(seconds - clipStartSeconds, 0), clipLengthSeconds)

  // Moves the sound to a time in the file, held to the clip.
  function seek(seconds: number) {
    made().currentTime = offsetOf(seconds)
  }

  // Where the sound is in the file, clamped: the element can report a hair past the end.
  function positionSeconds() {
    return element === undefined
      ? clipStartSeconds
      : clipStartSeconds + Math.min(element.currentTime, clipLengthSeconds)
  }

  const hasClip = () => url !== undefined

  // The element's own promise: the browser can refuse to start sound (its autoplay policy).
  const play = () => made().play()

  function pause() {
    element?.pause()
  }

  return {
    setVolume,
    setPlaySpeed,
    prepare,
    discard,
    hold,
    handOver,
    release,
    hasClip,
    seek,
    positionSeconds,
    play,
    pause,
  }
}
