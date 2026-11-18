import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'

// How far the audition reaches either side of the split.
const REACH_SECONDS = 4

/*
Hearing the selected split: one hidden `<audio>` element plays the 8 s WAV the source-file store
decodes around it (tickets 14 and 19: every format goes through ffmpeg, because Chrome seeks a VBR
MP3 seconds off; docs/concepts/06-seeking-compressed-audio.md). The button and the Space key on the
split handle both call `toggle`; the zoom view draws the playhead from `playheadSeconds`.

Every press takes a number, and a clip that arrives for an older number is dropped: a press that
was stopped, or a selection that changed while ffmpeg was working, must never start sound later.
*/
export const useAuditionStore = defineStore('audition', () => {
  const sourceFile = useSourceFileStore()
  const splitStore = useSplitStore()

  const status = ref<'idle' | 'loading' | 'playing'>('idle')
  // One line for the page to show, or null. A new press, a stop or a selection change clears it.
  const failure = ref<string | null>(null)
  // The button reads "Stop" while a clip is being made as well as while it plays (ticket 14).
  const isActive = computed(() => status.value !== 'idle')

  let press = 0
  /*
  A hidden element needs no place in the page; it is made on the first press, so loading the
  page creates no media element.
  */
  let element: HTMLAudioElement | undefined
  let url: string | undefined
  let clipStartSeconds = 0
  let clipLengthSeconds = 0

  function release() {
    if (element !== undefined) {
      element.pause()
      // Without `load()` the element keeps the old resource open after its src is gone.
      element.removeAttribute('src')
      element.load()
    }
    if (url !== undefined) URL.revokeObjectURL(url)
    url = undefined
  }

  function stop() {
    press++
    release()
    status.value = 'idle'
    failure.value = null
  }

  function fail(reason: unknown) {
    release()
    status.value = 'idle'
    // A DOMException (what `play()` rejects with) is no `Error` in every realm, but it has a message.
    const hasMessage = typeof reason === 'object' && reason !== null && 'message' in reason
    const message = String(hasMessage ? reason.message : reason)
    failure.value = `Couldn't play this split: ${message}`
  }

  function audioElement() {
    if (element === undefined) {
      element = new Audio()
      element.addEventListener('ended', () => {
        if (status.value === 'playing') stop()
      })
    }
    return element
  }

  async function start(splitSeconds: number) {
    const startSeconds = Math.max(0, splitSeconds - REACH_SECONDS)
    const thisPress = ++press
    const isStale = () => thisPress !== press
    failure.value = null
    status.value = 'loading'

    let clip
    try {
      clip = await sourceFile.clip(startSeconds, splitSeconds + REACH_SECONDS - startSeconds)
    } catch (error) {
      if (isStale()) return
      // The file was replaced: this page is going away, so there is nothing to tell the user.
      if (error instanceof FileReplacedError) {
        status.value = 'idle'
        return
      }
      fail(error)
      return
    }
    if (isStale()) return

    // The previous press's clip is dropped when the next one plays (note 06: 1.4 MB each).
    release()
    clipStartSeconds = clip.startSeconds
    clipLengthSeconds = clip.lengthSeconds
    url = URL.createObjectURL(new Blob([clip.wav as BlobPart], { type: 'audio/wav' }))
    const audio = audioElement()
    audio.src = url
    status.value = 'playing'
    try {
      await audio.play()
    } catch (error) {
      // The browser can refuse to start sound (its autoplay policy), and then there is no playback.
      if (!isStale()) fail(error)
    }
  }

  function toggle() {
    if (status.value !== 'idle') {
      stop()
      return
    }
    const selected = splitStore.selectedSplit
    if (selected === null) return
    void start(selected.seconds)
  }

  /*
  Where the audio is in the file, for the zoom view to draw each animation frame. A plain function,
  not state: `currentTime` moves without Vue knowing. Clamped, because the element can report a
  hair past the end before `ended` arrives.
  */
  function playheadSeconds() {
    return element !== undefined && status.value === 'playing'
      ? clipStartSeconds + Math.min(element.currentTime, clipLengthSeconds)
      : null
  }

  /*
  Moving the split, selecting another and deselecting all end the audition (ticket 14); so do
  deleting and a setting change, which change the selection. Sync: a clip that arrives right
  after must already find its press gone.
  */
  watch(
    () => [splitStore.selectedSplitId, splitStore.selectedSplit?.seconds],
    () => {
      if (status.value !== 'idle' || failure.value !== null) stop()
    },
    { flush: 'sync' },
  )

  return { status, failure, isActive, toggle, stop, playheadSeconds }
})
