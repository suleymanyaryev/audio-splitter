import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'

// How far the audition reaches either side of the split.
const REACH_SECONDS = 4

// What a failure says could not be played.
type Subject = 'split' | 'range' | 'track'

// A start and an end in the file: what the player plays besides the audition. The range or a track.
type Stretch = TimeRange

const isSameStretch = (a: Stretch, b: Stretch) =>
  a.startSeconds === b.startSeconds && a.endSeconds === b.endSeconds

/*
The one player, for two kinds of listening. One hidden `<audio>` element plays a WAV the source-file
store decodes (tickets 14 and 19: every format goes through ffmpeg, because Chrome seeks a VBR MP3
seconds off; docs/concepts/06-seeking-compressed-audio.md), and at most one decoded stretch is held.

The audition is the 8 s across the selected split: the button and the Space key on the split handle
call `toggle`, `status` is where it is and the zoom view draws its playhead from `playheadSeconds`.

Playing a stretch (docs/concepts/08-listening-to-a-range.md) is a second state, `stretchStatus`,
which adds `paused`. A stretch is a start and an end the caller hands in with every call: the range
(the Range view's button and Space key call `toggleStretch(range)`) or the selected track (the Track
view's, with `trackStretch(track)`, which holds a long track to its first 10 min), so the player
reads no store for it. The whole stretch is decoded once and kept, tied to the stretch it was
decoded for: a pause only stops the element and keeps the place, so playing again sets `currentTime`
inside the WAV (exact, where a compressed file is not) and plays at once, while a different stretch
releases the WAV and decodes its own. The playhead is `stretchPlayheadSeconds`: the sound while it
plays and the resting place otherwise, which is the stretch's start for a new stretch and after it
has ended. The resting place is tied to its stretch too, so a view of another stretch never draws
it, and a playhead moved before a stretch's first play is kept. The
playhead moves without a new decode: `seekStretch` sets `currentTime` while the stretch plays and
the resting place otherwise (which the next play, or a clip still being decoded, starts from), and a
drag of it pauses a playing stretch (`grabPlayhead`) and plays it on from the drop
(`dropPlayhead`). The audition and the stretch stop each other, and a new range, or another selected
track, or a selected track whose start or end moved, stops and releases whatever is held.

Every press takes a number, and a clip that arrives for an older number is dropped: a press that
was stopped, or a selection or range that changed while ffmpeg was working, must never start sound
later.
*/
export const useAuditionStore = defineStore('audition', () => {
  const sourceFile = useSourceFileStore()
  const splitStore = useSplitStore()

  // The audition's state.
  const status = ref<'idle' | 'loading' | 'playing'>('idle')
  // The stretch's: it can also be paused, with its WAV and its place kept.
  const stretchStatus = ref<'idle' | 'loading' | 'playing' | 'paused'>('idle')
  /*
  Where a stretch resumes, or null for its start: a ref, so a view that draws it can follow it. It
  names its stretch, so the playhead of another stretch is not drawn at a place in this one.
  */
  const resting = ref<{ stretch: Stretch; seconds: number } | null>(null)
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
  // The stretch the held WAV was decoded for, which a press can play again without decoding.
  let heldStretch: Stretch | null = null
  // Whether the stretch was playing when the playhead was grabbed, so the drop plays it on.
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
    heldStretch = null
  }

  // The place `stretch` resumes from, or null when it has none and starts at its start.
  function restingSecondsOf(stretch: Stretch) {
    const place = resting.value
    return place !== null && isSameStretch(place.stretch, stretch) ? place.seconds : null
  }

  // Where a time in the file is in the held WAV, clamped: a stretch's WAV starts at its start.
  function offsetOf(seconds: number) {
    return Math.min(Math.max(seconds - clipStartSeconds, 0), clipLengthSeconds)
  }

  // Where the stretch's sound is in the file, clamped: the element can report a hair past the end.
  function stretchPosition() {
    return element === undefined
      ? clipStartSeconds
      : clipStartSeconds + Math.min(element.currentTime, clipLengthSeconds)
  }

  // Stops the sound and keeps the stretch's place and its WAV, so a press resumes at once.
  function pauseStretch() {
    // A pause that interrupts a pending `play()` makes it stale, so its rejection is not reported.
    press++
    if (heldStretch !== null) resting.value = { stretch: heldStretch, seconds: stretchPosition() }
    element?.pause()
    stretchStatus.value = 'paused'
  }

  /*
  Ends everything audible, for the page: the export, a view change, a moved selection, leaving. A
  stretch that plays is paused, so its playhead stays where it was; one still being decoded is taken
  back, and a paused one stays paused.
  */
  function stop() {
    press++
    if (stretchStatus.value === 'playing') pauseStretch()
    else if (stretchStatus.value === 'loading') stretchStatus.value = 'idle'
    letGoOfAudition()
    failure.value = null
  }

  // The audition's clip goes, as the stretch's does when it gives way: only one WAV is held.
  function letGoOfAudition() {
    if (status.value === 'idle') return
    release()
    status.value = 'idle'
  }

  // The stretch played to its end: back at its start, with its WAV kept for the next press.
  function endStretch() {
    stretchStatus.value = 'idle'
    resting.value = null
  }

  // The stretch gives way to the audition or to a new range: its sound and its WAV go, its place stays.
  function letGoOfStretch() {
    if (heldStretch !== null && stretchStatus.value === 'playing') {
      resting.value = { stretch: heldStretch, seconds: stretchPosition() }
    }
    if (heldStretch !== null) release()
    stretchStatus.value = 'idle'
  }

  function fail(reason: unknown, subject: Subject) {
    release()
    status.value = 'idle'
    stretchStatus.value = 'idle'
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
        else if (stretchStatus.value === 'playing') endStretch()
      })
    }
    return element
  }

  async function start(splitSeconds: number) {
    const startSeconds = Math.max(0, splitSeconds - REACH_SECONDS)
    const thisPress = ++press
    const isStale = () => thisPress !== press
    failure.value = null
    letGoOfStretch()
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
    subject: Subject,
  ) {
    try {
      const clip = await sourceFile.clip(startSeconds, lengthSeconds)
      return isStale() ? null : clip
    } catch (error) {
      if (isStale()) return null
      if (error instanceof FileReplacedError) {
        status.value = 'idle'
        stretchStatus.value = 'idle'
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

  async function playElement(isStale: () => boolean, subject: Subject) {
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

  /*
  What a failure to play the stretch calls it: the view says which stretch is on show, and a view
  change stops the sound, so no failure is worded for the wrong one.
  */
  function stretchSubject(): Subject {
    return splitStore.view === 'track' ? 'track' : 'range'
  }

  // Plays the stretch from the playhead: decodes it on the first press, and later sets the place.
  async function playStretch(stretch: Stretch) {
    const thisPress = ++press
    const isStale = () => thisPress !== press
    failure.value = null
    letGoOfAudition()
    // A WAV decoded for another stretch is no use here. Its place is no place in this stretch.
    if (heldStretch !== null && !isSameStretch(heldStretch, stretch)) release()
    const subject = stretchSubject()
    /*
    Read when the sound starts, so a playhead moved while the clip was decoded counts. A playhead
    left at the very end has nothing to play from, so it plays from the start, as a media element
    does when it is played after its end.
    */
    const offset = () => {
      const place = restingSecondsOf(stretch)
      const hasRoom = place !== null && place < stretch.endSeconds
      return offsetOf(hasRoom ? place : stretch.startSeconds)
    }

    if (heldStretch !== null) {
      audioElement().currentTime = offset()
      stretchStatus.value = 'playing'
      await playElement(isStale, subject)
      return
    }

    stretchStatus.value = 'loading'
    const clip = await decode(
      stretch.startSeconds,
      stretch.endSeconds - stretch.startSeconds,
      isStale,
      subject,
    )
    if (clip === null) return
    hold(clip)
    heldStretch = { startSeconds: stretch.startSeconds, endSeconds: stretch.endSeconds }
    audioElement().currentTime = offset()
    stretchStatus.value = 'playing'
    await playElement(isStale, subject)
  }

  /*
  The button and Space key of the Range view and the Track view: a press while the stretch decodes
  takes it back, while it plays pauses it, and otherwise plays it from the playhead.
  */
  function toggleStretch(stretch: Stretch) {
    if (stretchStatus.value === 'loading') stop()
    else if (stretchStatus.value === 'playing') pauseStretch()
    else void playStretch(stretch)
  }

  /*
  Moves the stretch's playhead to a time, held to the stretch. While the stretch plays, the sound
  jumps there at once (an exact `currentTime` inside the WAV) and goes on; otherwise only the
  resting place moves, which a later play, or the clip still being decoded, starts from.
  */
  function seekStretch(stretch: Stretch, seconds: number) {
    const target = Math.min(Math.max(seconds, stretch.startSeconds), stretch.endSeconds)
    if (stretchStatus.value === 'playing') audioElement().currentTime = offsetOf(target)
    else resting.value = { stretch: { ...stretch }, seconds: target }
  }

  function backToStretchStart(stretch: Stretch) {
    seekStretch(stretch, stretch.startSeconds)
  }

  /*
  A drag of the playhead pauses a playing stretch, so the sound does not jump under the pointer, and
  `dropPlayhead` plays it on from where the playhead was dropped. A paused or idle stretch stays so.
  */
  function grabPlayhead() {
    shouldResume = stretchStatus.value === 'playing'
    if (shouldResume) pauseStretch()
  }

  function dropPlayhead(stretch: Stretch) {
    // Only a stretch still paused is played on: a new range or the audition may have taken over.
    const canResume = shouldResume && stretchStatus.value === 'paused'
    shouldResume = false
    if (canResume) void playStretch(stretch)
  }

  /*
  Where the stretch's playhead is, for a view to draw each animation frame: the sound while it
  plays (`currentTime` moves without Vue knowing), else the resting place it resumes
  from, which the view's watch does follow.
  */
  function stretchPlayheadSeconds(stretch: Stretch) {
    return stretchStatus.value === 'playing'
      ? stretchPosition()
      : (restingSecondsOf(stretch) ?? stretch.startSeconds)
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
    () => [splitStore.selectedSplit?.id, splitStore.selectedSplit?.seconds],
    () => {
      if (status.value !== 'idle' || failure.value !== null) stop()
    },
    { flush: 'sync' },
  )

  // Ends all sound and drops the decoded stretch and its place: the playhead is back at the start.
  function resetStretch() {
    press++
    letGoOfStretch()
    resting.value = null
    letGoOfAudition()
    failure.value = null
  }

  /*
  A new range, or none, ends all sound and drops the decoded range: a clip still on its way is stale
  by the press number, and the playhead is back at the new range's start. Sync, like the watch
  above, so a clip that arrives right after finds its press gone.
  */
  watch(() => splitStore.range, resetStretch, { flush: 'sync' })

  /*
  The same for the selected track: another track, none, or one whose start or end moved is no longer
  the stretch that was heard. The source is a string, so a split that moves elsewhere, which
  recomputes the tracks, changes nothing here.
  */
  watch(
    () => {
      const track = splitStore.selectedTrack
      return track === null
        ? null
        : `${track.startSplit?.id ?? 'first'}/${track.startSeconds}/${track.lengthSeconds}`
    },
    resetStretch,
    { flush: 'sync' },
  )

  return {
    status,
    stretchStatus,
    failure,
    isActive,
    toggle,
    toggleStretch,
    seekStretch,
    backToStretchStart,
    grabPlayhead,
    dropPlayhead,
    stop,
    playheadSeconds,
    stretchPlayheadSeconds,
  }
})
