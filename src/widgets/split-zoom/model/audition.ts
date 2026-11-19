import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { decodeWindow, nextWindow, windowHolds } from '../lib/decode-window.ts'

// How far the audition reaches either side of the split.
const REACH_SECONDS = 4

// What a failure says could not be played.
type Subject = 'split' | 'range' | 'track'

// A start and an end in the file: what the player plays besides the audition. The range or a track.
type Stretch = TimeRange

// What the source-file store gives for a clip.
interface Clip {
  wav: Uint8Array
  startSeconds: number
  lengthSeconds: number
}

const isSameStretch = (a: Stretch, b: Stretch) =>
  a.startSeconds === b.startSeconds && a.endSeconds === b.endSeconds

/*
The one player, for two kinds of listening. One hidden `<audio>` element plays a WAV the source-file
store decodes (tickets 14 and 19: every format goes through ffmpeg, because Chrome seeks a VBR MP3
seconds off; docs/concepts/06-seeking-compressed-audio.md), and the WAV held is one decoded window
of one stretch, or the audition's clip.

The audition is the 8 s across the selected split: the button and the Space key on the split handle
call `toggle`, `status` is where it is and the zoom view draws its playhead from `playheadSeconds`.

Playing a stretch (docs/concepts/08-listening-to-a-range.md) is a second state, `stretchStatus`,
which adds `paused`. A stretch is a start and an end the caller hands in with every call: the range
(the Range view's button and Space key call `toggleStretch(range)`) or the selected track (the Track
view's, with its whole extent). The player reads the split store only to word a failure (`stretchSubject`)
and to stop when the range or the selected track changes. A stretch of 10 min or less is one window,
decoded once and kept, tied to the stretch it was decoded for: a pause only stops the element and
keeps the place, so playing again sets `currentTime` inside the WAV (exact, where a compressed file
is not) and plays at once, while a different stretch releases the WAV and decodes its own.

A longer stretch is heard through a moving window (`lib/decode-window.ts`): the 10 min from the
playhead, or to the stretch's end. A seek inside the window sets `currentTime`; a seek outside it
releases the windows and decodes one from the seek point. While a window plays, the next is decoded
ahead once the playhead is 30 s from its end (on `timeupdate`), and when the window ends the
element is pointed at the next one and plays on, so the hand-over is no decode wait. At most two
windows are held, the playing one and the one ahead.

The playhead is `stretchPlayheadSeconds`: the sound while it plays and the resting place otherwise,
which is the stretch's start for a new stretch and after it has ended. The resting place is tied to
its stretch too, so a view of another stretch never draws it, and a playhead moved before a
stretch's first play is kept. The playhead moves without a new decode inside the window:
`seekStretch` sets `currentTime` while the stretch plays and the resting place otherwise (which the
next play, or a clip still being decoded, starts from), and a drag of it pauses a playing stretch
(`grabPlayhead`) and plays it on from the drop (`dropPlayhead`). The audition and the stretch stop
each other, and a new range, or another selected track, or a selected track whose start or end
moved, stops and releases whatever is held.

Every press takes a number, and a clip that arrives for an older number is dropped: a press that
was stopped, or a selection or range that changed while ffmpeg was working, must never start sound
later. The window ahead has its own guard, the fetch itself: releasing the windows, or `stop`,
forgets it and stops its decode, so a seek's window or an export's cut does not wait behind it.
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
  // The stretch the held WAV is a window of, and the window, which a press can play again without decoding.
  let held: { stretch: Stretch; window: TimeRange } | null = null
  // The window after the held one, decoded while the held one plays, and the fetch that made it.
  let upcoming: { url: string; clip: Clip; window: TimeRange } | undefined
  let ahead: { done: Promise<void>; stopper: AbortController } | undefined
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
    held = null
    forgetAhead()
  }

  /*
  Lets go of the window ahead. A fetch still on its way is stopped, and if its clip arrives anyway
  it finds `ahead` gone and drops it.
  */
  function forgetAhead() {
    ahead?.stopper.abort()
    if (upcoming !== undefined) URL.revokeObjectURL(upcoming.url)
    upcoming = undefined
    ahead = undefined
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
    if (held !== null) resting.value = { stretch: held.stretch, seconds: stretchPosition() }
    element?.pause()
    stretchStatus.value = 'paused'
  }

  /*
  Ends everything audible, for the page: the export, a view change, a moved selection, leaving. A
  stretch that plays is paused, so its playhead stays where it was; one still being decoded is taken
  back, and a paused one stays paused. The window ahead goes: the export's cuts must not wait
  behind its decode, and playing on decodes it again in time (30 s before the window ends).
  */
  function stop() {
    press++
    if (stretchStatus.value === 'playing') pauseStretch()
    else if (stretchStatus.value === 'loading') stretchStatus.value = 'idle'
    forgetAhead()
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
    if (held !== null && stretchStatus.value === 'playing') {
      resting.value = { stretch: held.stretch, seconds: stretchPosition() }
    }
    if (held !== null) release()
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
        else if (stretchStatus.value === 'playing') void carryOn()
      })
      element.addEventListener('timeupdate', () => {
        if (stretchStatus.value === 'playing') void fetchAhead()
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

  const urlOf = (clip: Clip) =>
    URL.createObjectURL(new Blob([clip.wav as BlobPart], { type: 'audio/wav' }))

  // Makes the clip the one held, dropping the previous ones (note 06: 1.4 MB each) and loading it.
  function hold(clip: Clip) {
    release()
    clipStartSeconds = clip.startSeconds
    clipLengthSeconds = clip.lengthSeconds
    url = urlOf(clip)
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

  /*
  Plays the stretch from the playhead. The first press decodes the window that holds the playhead;
  later ones set the place in it, and a playhead outside the held window decodes another.
  */
  async function playStretch(stretch: Stretch) {
    const thisPress = ++press
    const isStale = () => thisPress !== press
    failure.value = null
    letGoOfAudition()
    const subject = stretchSubject()
    /*
    Where the sound starts. Read when it starts, so a playhead moved while a clip was decoded
    counts. A playhead left at the very end has nothing to play from, so it plays from the start, as
    a media element does when it is played after its end.
    */
    const placeNow = () => {
      const place = restingSecondsOf(stretch)
      return place !== null && place < stretch.endSeconds ? place : stretch.startSeconds
    }
    const holdsPlace = (place: number) =>
      held !== null &&
      isSameStretch(held.stretch, stretch) &&
      windowHolds(held.window, stretch, place)

    for (let place = placeNow(); !holdsPlace(place); place = placeNow()) {
      // A WAV decoded for another stretch, or another part of this one, is no use here.
      if (held !== null) release()
      stretchStatus.value = 'loading'
      const window = decodeWindow(stretch, place)
      const clip = await decode(
        window.startSeconds,
        window.endSeconds - window.startSeconds,
        isStale,
        subject,
      )
      if (clip === null) return
      hold(clip)
      held = { stretch: { ...stretch }, window }
      // A playhead moved while the clip was decoded may be outside it: the loop decodes again.
      if (placeNow() === place) break
    }
    audioElement().currentTime = offsetOf(placeNow())
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
  jumps there at once (an exact `currentTime` inside the WAV) and goes on, unless the time is
  outside the held window, which is let go for a window decoded from there; otherwise only the
  resting place moves, which a later play, or the clip still being decoded, starts from.
  */
  function seekStretch(stretch: Stretch, seconds: number) {
    const target = Math.min(Math.max(seconds, stretch.startSeconds), stretch.endSeconds)
    if (stretchStatus.value !== 'playing') {
      resting.value = { stretch: { ...stretch }, seconds: target }
    } else if (held !== null && windowHolds(held.window, stretch, target)) {
      audioElement().currentTime = offsetOf(target)
    } else if (target >= stretch.endSeconds) {
      // The very end of a stretch whose last window is not held: there is nothing to hear after it.
      audioElement().pause()
      endStretch()
    } else {
      audioElement().pause()
      release()
      resting.value = { stretch: { ...stretch }, seconds: target }
      void playStretch(stretch)
    }
  }

  /*
  Decodes the window after the held one, once the playhead is 30 s from the held one's end. Asked
  again for the same held window it is the same fetch, even after it failed: the hand-over asks
  once more, and says why if it fails too.
  */
  function fetchAhead() {
    if (ahead !== undefined) return ahead.done
    if (held === null) return Promise.resolve()
    const window = nextWindow(held.stretch, held.window, stretchPosition())
    if (window === null) return Promise.resolve()
    const asked = { done: Promise.resolve(), stopper: new AbortController() }
    ahead = asked
    asked.done = (async () => {
      try {
        const clip = await sourceFile.clip(
          window.startSeconds,
          window.endSeconds - window.startSeconds,
          asked.stopper.signal,
        )
        // Releasing the windows, or handing over, forgot this fetch: its clip is of no use.
        if (ahead === asked) upcoming = { url: urlOf(clip), clip, window }
      } catch {
        // Nothing is lost yet: the hand-over decodes the window itself if it is still missing.
      }
    })()
    return asked.done
  }

  /*
  A window of a stretch ended while playing: the stretch is over after its last window, and
  otherwise the element is pointed at the window ahead and plays on. When that is not decoded yet
  (a seek close to the end of the window) the stretch reads as decoding until it is.
  */
  async function carryOn() {
    if (held === null || held.window.endSeconds >= held.stretch.endSeconds) {
      endStretch()
      return
    }
    const { stretch, window } = held
    const thisPress = ++press
    const isStale = () => thisPress !== press
    const subject = stretchSubject()
    let place = window.endSeconds
    if (upcoming === undefined) {
      // The place is kept, so a seek made while the window is decoded is heard from.
      resting.value = { stretch: { ...stretch }, seconds: place }
      stretchStatus.value = 'loading'
      await fetchAhead()
      if (isStale()) return
      if (upcoming === undefined) {
        const missing = decodeWindow(stretch, place)
        const clip = await decode(
          missing.startSeconds,
          missing.endSeconds - missing.startSeconds,
          isStale,
          subject,
        )
        if (clip === null) return
        upcoming = { url: urlOf(clip), clip, window: missing }
      }
      place = restingSecondsOf(stretch) ?? place
    }
    const next = upcoming
    if (!windowHolds(next.window, stretch, place)) {
      // The playhead was moved away while the window was decoded: a window from there is the one to play.
      release()
      void playStretch(stretch)
      return
    }
    const finished = url
    upcoming = undefined
    ahead = undefined
    url = next.url
    clipStartSeconds = next.clip.startSeconds
    clipLengthSeconds = next.clip.lengthSeconds
    held = { stretch, window: next.window }
    audioElement().src = next.url
    audioElement().currentTime = offsetOf(place)
    if (finished !== undefined) URL.revokeObjectURL(finished)
    stretchStatus.value = 'playing'
    await playElement(isStale, subject)
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
  recomputes the tracks, changes nothing here. In the Range view the stretch is the range, which a
  track's change leaves alone: a split added at the mark shortens the selected track, and the range
  plays on.
  */
  watch(
    () => {
      const track = splitStore.selectedTrack
      return track === null
        ? null
        : `${track.startSplit?.id ?? 'first'}/${track.startSeconds}/${track.lengthSeconds}`
    },
    () => {
      if (splitStore.view !== 'range') resetStretch()
    },
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
