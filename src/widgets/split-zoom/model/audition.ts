import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'

// How far the audition reaches either side of the split.
const REACH_SECONDS = 4

/*
The one player, for two kinds of listening. One hidden `<audio>` element plays a WAV the source-file
store decodes (tickets 14 and 19: every format goes through ffmpeg, because Chrome seeks a VBR MP3
seconds off; docs/concepts/06-seeking-compressed-audio.md), and at most one decoded stretch is held.

The audition is the 8 s across the selected split: the button and the Space key on the split handle
call `toggle`, `status` is where it is and the zoom view draws its playhead from `playheadSeconds`.

Playing the range (docs/concepts/08-listening-to-a-range.md) is a second state, `rangeStatus`, which
adds `paused`. The Range view's button and Space key call `toggleRange`. The whole range is decoded
once and kept: a pause only stops the element and keeps the place, so playing again sets
`currentTime` inside the WAV (exact, where a compressed file is not) and plays at once. The range's
playhead is `rangePlayheadSeconds`: the sound while it plays and the resting place otherwise, which
is the range's start for a new range and after the range has ended. The playhead moves without a
new decode: `seekRange` sets `currentTime` while the range plays and the resting place otherwise
(which the next play, or a clip still being decoded, starts from), and a drag of it pauses a playing
range (`grabPlayhead`) and plays it on from the drop (`dropPlayhead`). The two kinds stop each
other, and a new range stops and releases whatever is held.

Every press takes a number, and a clip that arrives for an older number is dropped: a press that
was stopped, or a selection or range that changed while ffmpeg was working, must never start sound
later.
*/
export const useAuditionStore = defineStore('audition', () => {
  const sourceFile = useSourceFileStore()
  const splitStore = useSplitStore()

  // The audition's state.
  const status = ref<'idle' | 'loading' | 'playing'>('idle')
  // The range's: it can also be paused, with its WAV and its place kept.
  const rangeStatus = ref<'idle' | 'loading' | 'playing' | 'paused'>('idle')
  // Where the range resumes, or null for its start: a ref, so a view that draws it can follow it.
  const restingSeconds = ref<number | null>(null)
  /*
  One line for the page to show, or null. A new press, a stop, a selection change and a new range
  clear it.
  */
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
  // Whether the held WAV is the range's, which a press can play again without decoding.
  let isRangeHeld = false
  // Whether the range was playing when the playhead was grabbed, so the drop plays it on.
  let shouldResume = false

  function release() {
    if (element !== undefined) {
      element.pause()
      // Without `load()` the element keeps the old resource open after its src is gone.
      element.removeAttribute('src')
      element.load()
    }
    if (url !== undefined) URL.revokeObjectURL(url)
    url = undefined
    isRangeHeld = false
  }

  // Where a time in the file is in the held WAV, clamped: the range's WAV starts at its start.
  function offsetOf(seconds: number) {
    return Math.min(Math.max(seconds - clipStartSeconds, 0), clipLengthSeconds)
  }

  // Where the range's sound is in the file, clamped: the element can report a hair past the end.
  function rangePosition() {
    return element === undefined
      ? clipStartSeconds
      : clipStartSeconds + Math.min(element.currentTime, clipLengthSeconds)
  }

  // Stops the sound and keeps the range's place and its WAV, so a press resumes at once.
  function pauseRange() {
    // A pause that interrupts a pending `play()` makes it stale, so its rejection is not reported.
    press++
    restingSeconds.value = rangePosition()
    element?.pause()
    rangeStatus.value = 'paused'
  }

  /*
  Ends everything audible, for the page: the export, a view change, a moved selection, leaving. A
  range that plays is paused, so its playhead stays where it was; one still being decoded is taken
  back, and a paused one stays paused.
  */
  function stop() {
    press++
    if (rangeStatus.value === 'playing') pauseRange()
    else if (rangeStatus.value === 'loading') rangeStatus.value = 'idle'
    letGoOfAudition()
    failure.value = null
  }

  // The audition's clip goes, as the range's does when it gives way: only one stretch is held.
  function letGoOfAudition() {
    if (status.value === 'idle') return
    release()
    status.value = 'idle'
  }

  // The range played to its end: back at its start, with its WAV kept for the next press.
  function endRange() {
    rangeStatus.value = 'idle'
    restingSeconds.value = null
  }

  // The range gives way to the audition or to a new range: its sound and its WAV go, its place stays.
  function letGoOfRange() {
    if (rangeStatus.value === 'playing') restingSeconds.value = rangePosition()
    if (isRangeHeld) release()
    rangeStatus.value = 'idle'
  }

  function fail(reason: unknown, subject: 'split' | 'range') {
    release()
    status.value = 'idle'
    rangeStatus.value = 'idle'
    // A DOMException (what `play()` rejects with) is no `Error` in every realm, but it has a message.
    const hasMessage = typeof reason === 'object' && reason !== null && 'message' in reason
    const message = String(hasMessage ? reason.message : reason)
    failure.value = `Couldn't play this ${subject}: ${message}`
  }

  function audioElement() {
    if (element === undefined) {
      element = new Audio()
      element.addEventListener('ended', () => {
        if (status.value === 'playing') stop()
        else if (rangeStatus.value === 'playing') endRange()
      })
    }
    return element
  }

  async function start(splitSeconds: number) {
    const startSeconds = Math.max(0, splitSeconds - REACH_SECONDS)
    const thisPress = ++press
    const isStale = () => thisPress !== press
    failure.value = null
    letGoOfRange()
    status.value = 'loading'

    const clip = await decode(
      startSeconds,
      splitSeconds + REACH_SECONDS - startSeconds,
      isStale,
      'split',
    )
    if (clip === null) return
    hold(clip)
    status.value = 'playing'
    await playElement(isStale, 'split')
  }

  /*
  Asks the source-file store for a stretch. Null when there is nothing to play: the press went
  stale meanwhile, the file was replaced (this page is going away, so there is nothing to tell the
  user) or the decode failed, which is shown as the failure.
  */
  async function decode(
    startSeconds: number,
    lengthSeconds: number,
    isStale: () => boolean,
    subject: 'split' | 'range',
  ) {
    try {
      const clip = await sourceFile.clip(startSeconds, lengthSeconds)
      return isStale() ? null : clip
    } catch (error) {
      if (isStale()) return null
      if (error instanceof FileReplacedError) {
        status.value = 'idle'
        rangeStatus.value = 'idle'
      } else {
        fail(error, subject)
      }
      return null
    }
  }

  // Makes the clip the one held, dropping the previous one (note 06: 1.4 MB each) and loading it.
  function hold(clip: { wav: Uint8Array; startSeconds: number; lengthSeconds: number }) {
    release()
    clipStartSeconds = clip.startSeconds
    clipLengthSeconds = clip.lengthSeconds
    url = URL.createObjectURL(new Blob([clip.wav as BlobPart], { type: 'audio/wav' }))
    audioElement().src = url
  }

  async function playElement(isStale: () => boolean, subject: 'split' | 'range') {
    try {
      await audioElement().play()
    } catch (error) {
      // The browser can refuse to start sound (its autoplay policy), and then there is no playback.
      if (!isStale()) fail(error, subject)
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

  // Plays the range from the playhead: decodes it on the first press, and later sets the place.
  async function playRange(range: TimeRange) {
    const thisPress = ++press
    const isStale = () => thisPress !== press
    failure.value = null
    letGoOfAudition()
    /*
    Read when the sound starts, so a playhead moved while the clip was decoded counts. A playhead
    left at the very end has nothing to play from, so it plays from the start, as a media element
    does when it is played after its end.
    */
    const offset = () => {
      const place = restingSeconds.value
      const hasRoom = place !== null && place < range.endSeconds
      return offsetOf(hasRoom ? place : range.startSeconds)
    }

    if (isRangeHeld) {
      audioElement().currentTime = offset()
      rangeStatus.value = 'playing'
      await playElement(isStale, 'range')
      return
    }

    rangeStatus.value = 'loading'
    const clip = await decode(
      range.startSeconds,
      range.endSeconds - range.startSeconds,
      isStale,
      'range',
    )
    if (clip === null) return
    hold(clip)
    isRangeHeld = true
    audioElement().currentTime = offset()
    rangeStatus.value = 'playing'
    await playElement(isStale, 'range')
  }

  /*
  The Range view's button and Space key: a press while the range decodes takes it back, while it
  plays pauses it, and otherwise plays it from the playhead.
  */
  function toggleRange() {
    const range = splitStore.range
    if (range === null) return
    if (rangeStatus.value === 'loading') stop()
    else if (rangeStatus.value === 'playing') pauseRange()
    else void playRange(range)
  }

  /*
  Moves the range's playhead to a time, held to the range. While the range plays, the sound jumps
  there at once (an exact `currentTime` inside the WAV) and goes on; otherwise only the resting
  place moves, which a later play, or the clip still being decoded, starts from.
  */
  function seekRange(seconds: number) {
    const range = splitStore.range
    if (range === null) return
    const target = Math.min(Math.max(seconds, range.startSeconds), range.endSeconds)
    if (rangeStatus.value === 'playing') audioElement().currentTime = offsetOf(target)
    else restingSeconds.value = target
  }

  function backToRangeStart() {
    const range = splitStore.range
    if (range !== null) seekRange(range.startSeconds)
  }

  /*
  A drag of the playhead pauses a playing range, so the sound does not jump under the pointer, and
  `dropPlayhead` plays it on from where the playhead was dropped. A paused or idle range stays so.
  */
  function grabPlayhead() {
    shouldResume = rangeStatus.value === 'playing'
    if (shouldResume) pauseRange()
  }

  function dropPlayhead() {
    // Only a range still paused is played on: a new range or the audition may have taken over.
    const canResume = shouldResume && rangeStatus.value === 'paused'
    shouldResume = false
    const range = splitStore.range
    if (canResume && range !== null) void playRange(range)
  }

  /*
  Where the range's playhead is, for the Range view to draw each animation frame: the sound while
  it plays (`currentTime` moves without Vue knowing), else `restingSeconds`, the place it resumes
  from, which the view's watch does follow. Null without a range.
  */
  function rangePlayheadSeconds() {
    const range = splitStore.range
    if (range === null) return null
    return rangeStatus.value === 'playing'
      ? rangePosition()
      : (restingSeconds.value ?? range.startSeconds)
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

  /*
  A new range, or none, ends all sound and drops the decoded range: a clip still on its way is stale
  by the press number, and the playhead is back at the new range's start. Sync, like the watch
  above, so a clip that arrives right after finds its press gone.
  */
  watch(
    () => splitStore.range,
    () => {
      press++
      letGoOfRange()
      restingSeconds.value = null
      letGoOfAudition()
      failure.value = null
    },
    { flush: 'sync' },
  )

  return {
    status,
    rangeStatus,
    failure,
    isActive,
    toggle,
    toggleRange,
    seekRange,
    backToRangeStart,
    grabPlayhead,
    dropPlayhead,
    stop,
    playheadSeconds,
    rangePlayheadSeconds,
  }
})
