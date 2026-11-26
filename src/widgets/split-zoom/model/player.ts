import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { useSplitStore, type Split } from '@/entities/split/model/split.ts'
import { createAudioElement, type Clip, type ReadyClip } from '../api/audio-element.ts'
import { readSavedPlaySpeed, savePlaySpeed } from '../api/saved-play-speed.ts'
import { readSavedVolume, saveVolume } from '../api/saved-volume.ts'
import { MAX_PLAY_SPEED, MIN_PLAY_SPEED } from '../config/play-speed.ts'
import { MAX_VOLUME_DB, MIN_VOLUME_DB } from '../config/volume.ts'
import { decodeWindow, nextWindow, windowHolds } from '../lib/decode-window.ts'
import { snapPlaySpeed } from '../lib/snap-play-speed.ts'
import { trackExtent } from '../lib/track-extent.ts'

// How far the audition reaches either side of the split.
const REACH_SECONDS = 4

// Who holds the one status: the audition across the selected split, or a stretch (the range or a track).
type Owner = 'audition' | 'stretch'

type Status = 'idle' | 'loading' | 'playing' | 'paused'

// What a failure says could not be played, and which view shows it.
type Subject = 'split' | 'range' | 'track'

// What is on show, which the verbs act on: who plays it and the playhead's span.
interface OnShow {
  owner: Owner
  subject: Subject
  extent: TimeRange
  // The split an audition is of; null for a stretch.
  split: Split | null
}

// The two subjects a stretch can be.
type StretchSubject = 'range' | 'track'

// A start and an end in the file: what the player plays besides the audition. The range or a track.
interface Stretch extends TimeRange {
  subject: StretchSubject
}

const isSameStretch = (a: Stretch, b: Stretch) =>
  a.subject === b.subject && a.startSeconds === b.startSeconds && a.endSeconds === b.endSeconds

// The stretch the range or the track on show is.
const stretchFor = (shown: OnShow): Stretch => ({
  ...shown.extent,
  subject: shown.subject === 'track' ? 'track' : 'range',
})

/*
The one player. One hidden `<audio>` element (`api/audio-element.ts`) plays a WAV the source-file
store decodes (tickets 14 and 19: every format goes through ffmpeg, because Chrome seeks a VBR MP3
seconds off; docs/concepts/06-seeking-compressed-audio.md), and the WAV held is one decoded window
of one stretch, or the audition's clip.

The player acts on what is on show, which it reads from the split store: the audition of the
selected split in the Split view, the selected track in the Track view, the range in the Range
view, or nothing, when every verb does nothing. `extent` is the playhead's span for it. `toggle`
(the button and the Space key): a press while it decodes takes it back, while it plays pauses it,
and otherwise plays it from its place. `status` is where it is (idle, loading, playing or paused),
`playheadSeconds` where the playhead is: the sound while it plays, else the resting place, else the
extent's start. `seek` moves it (held to the extent), `backToStart` takes it to the extent's start,
and a pointer drag pauses a playing subject on `grabPlayhead` and plays it on from `dropPlayhead`.

The audition is the 8 s across the selected split, its extent: the split plus and minus 4 s, held
to the file, worked out from the split each time. Its resting place is a time in the file, tied to
the split it was made for, so another split never draws it. A pause keeps it with the WAV. A stop
(the view change, the export) and a stretch that takes over keep it and let go of the WAV. Playing
to the end clears it, and so does selecting another split, none, or deleting the selected one;
these also end the audition. Moving the split pauses a playing audition where the sound was and
lets go of the WAV, whose 8 s moved: the place is held into the moved extent when it is read, and
the next play decodes the moved 8 s and starts there.

A stretch (docs/concepts/08-listening-to-a-range.md) is the range or the selected track, a start and
an end. Its failure is worded "range" or "track" from the view (`stretchSubject`). A stretch of
10 min or less is one window, decoded once and kept, tied to the stretch it was decoded for: a
pause only stops the element and keeps the place, so playing again sets `currentTime` inside the
WAV (exact, where a compressed file is not) and plays at once, while a different stretch releases
the WAV and decodes its own.

A longer stretch is heard through a moving window (`lib/decode-window.ts`): the 10 min from the
playhead, or to the stretch's end. A seek inside the window sets `currentTime`; a seek outside it
releases the windows and decodes one from the seek point. While a window plays, the next is decoded
ahead once the playhead is 30 s from its end (on `timeupdate`), and when the window ends the
element is pointed at the next one and plays on, so the hand-over is no decode wait. At most two
windows are held, the playing one and the one ahead.

A stretch's resting place is the stretch's start for a new stretch and after it has ended, and is
tied to its stretch too, so a view of another stretch never draws it. A playhead moved before a
stretch's first play is kept, and it moves without a new decode inside the window: `seek` sets
`currentTime` while the stretch plays and the resting place otherwise (which the next play, or a
clip still being decoded, starts from).

The status has one owner, the audition or a stretch. Starting one takes the status from the other,
and a new range, or another selected track, or a selected track whose start or end moved, stops and
releases whatever is held.

Every press takes a number, and a clip that arrives for an older number is dropped: a press that
was stopped, or a selection or range that changed while ffmpeg was working, must never start sound
later. The window ahead has its own guard, the fetch itself: releasing the windows, or `stop`,
forgets it and stops its decode, so a seek's window or an export's cut does not wait behind it.

The volume (docs/concepts/09-volume-is-gain.md) is the player's too: `volumeDecibels` and `isMuted`,
applied to the element as a linear gain when it is made and on every change, and kept in
`localStorage`. It is playback only: an export never passes through the element.

The play speed (docs/concepts/10-speed-without-pitch.md, docs/adr/0004-time-stretching-by-the-browser.md)
is the player's too: `playSpeed`, 0.5 to 2.0 in steps of 0.1, applied to the element when it is made
and on every change, with the pitch kept: the browser does the time-stretching. Like the volume, it
is kept in `localStorage` between visits. The playhead and the window logic stay in media time (the
time in the file), which is the same at any speed. It is playback only too.
*/
export const usePlayerStore = defineStore('player', () => {
  const sourceFile = useSourceFileStore()
  const splitStore = useSplitStore()

  /*
  The one status, and whose it is: the audition or a stretch (the range or a track). Starting one
  takes the status from the other, so at most one of them is not idle. Paused keeps the WAV and the
  place. `status` and `stretchStatus` are what each reads of it: idle when the other owns it.
  */
  const state = ref<Status>('idle')
  const owner = ref<Owner>('audition')
  const auditionStatus = computed(() => (owner.value === 'audition' ? state.value : 'idle'))
  const stretchStatus = computed(() => (owner.value === 'stretch' ? state.value : 'idle'))

  /*
  What is on show: the audition of the selected split in the Split view, the selected track in the
  Track view, the range in the Range view, or nothing. The verbs act on it.
  */
  const onShow = computed<OnShow | null>(() => {
    const { view, selectedSplit, selectedTrack, range } = splitStore
    if (view === 'split' && selectedSplit !== null) {
      return {
        owner: 'audition',
        subject: 'split',
        extent: auditionExtent(selectedSplit),
        split: selectedSplit,
      }
    }
    if (view === 'track' && selectedTrack !== null) {
      return { owner: 'stretch', subject: 'track', extent: trackExtent(selectedTrack), split: null }
    }
    return view === 'range' && range !== null
      ? { owner: 'stretch', subject: 'range', extent: { ...range }, split: null }
      : null
  })

  // The playhead's span: the audition's 8 s, the track's ends or the range; null with nothing on show.
  const extent = computed(() => onShow.value?.extent ?? null)

  /*
  The status of what is on show: idle while the other owner holds it. Writable because the view
  specs set it: a write is a take of the status for what is on show, and idle only ends it when that
  owns it.
  */
  const status = computed<Status>({
    get: () => (onShow.value?.owner === owner.value ? state.value : 'idle'),
    set: (next) => {
      const shown = onShow.value
      if (shown === null) return
      if (next !== 'idle') {
        if (shown.owner === 'stretch') activeSubject = stretchFor(shown).subject
        take(shown.owner, next)
      } else if (owner.value === shown.owner) state.value = 'idle'
    },
  })
  // Where the audition resumes, in the file, and the split it was made for. A ref, so the view follows it.
  const auditionResting = ref<{ splitId: number; seconds: number } | null>(null)
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
  // The button reads "Stop" while a clip is being made and "Pause" while it plays (ticket 14).
  const isActive = computed(() => status.value === 'loading' || status.value === 'playing')

  let press = 0
  // The hidden element and its clip (api/audio-element.ts); the store says when to hold, play and seek.
  const audio = createAudioElement({
    ended: () => {
      if (auditionStatus.value === 'playing') endAudition()
      else if (stretchStatus.value === 'playing') void carryOn()
    },
    timeUpdate: () => {
      if (stretchStatus.value === 'playing') void fetchAhead()
    },
  })
  // The stretch the held WAV is a window of, and the window, which a press can play again without decoding.
  let held: { stretch: Stretch; window: TimeRange } | null = null
  // The stretch that last played, or is decoding: the one the status belongs to when a stretch owns it.
  let activeSubject: StretchSubject | null = null
  // The window after the held one, decoded while the held one plays, and the fetch that made it.
  let upcoming: { ready: ReadyClip; window: TimeRange } | undefined
  let ahead: { done: Promise<void>; stopper: AbortController } | undefined
  // The split the audition's clip is of, kept apart from the selection, which may have moved on.
  let auditionSplitId: number | undefined
  // Who was playing when the playhead was grabbed, so the drop plays it on; null if none was.
  let grabbedOwner: Owner | null = null

  // How loud it is heard, set on the page and kept between visits. Playback only: an export never
  // passes through the element.
  const saved = readSavedVolume()
  const volumeDecibels = ref(saved.volumeDecibels)
  const isMuted = ref(saved.isMuted)

  // Whole dB from the quietest to full: the slider's own range, held here too.
  function setVolume(decibels: number) {
    // Not a number (the element's `volume` would throw on it): nothing changes.
    if (!Number.isFinite(decibels)) return
    volumeDecibels.value = Math.min(Math.max(Math.round(decibels), MIN_VOLUME_DB), MAX_VOLUME_DB)
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  audio.setVolume(volumeDecibels.value, isMuted.value)

  // Sync, so sound that is playing changes at once.
  watch(
    [volumeDecibels, isMuted],
    () => {
      audio.setVolume(volumeDecibels.value, isMuted.value)
      saveVolume({ volumeDecibels: volumeDecibels.value, isMuted: isMuted.value })
    },
    { flush: 'sync' },
  )

  // How fast it is heard, from half speed to double, a tenth a step, with the pitch kept. Set on
  // the page and kept between visits, like the volume.
  const playSpeed = ref(readSavedPlaySpeed())

  function setPlaySpeed(speed: number) {
    // Not a number: nothing changes.
    if (!Number.isFinite(speed)) return
    playSpeed.value = Math.min(Math.max(snapPlaySpeed(speed), MIN_PLAY_SPEED), MAX_PLAY_SPEED)
  }

  audio.setPlaySpeed(playSpeed.value)

  // Sync, like the volume's: sound that is playing changes at once.
  watch(
    playSpeed,
    () => {
      audio.setPlaySpeed(playSpeed.value)
      savePlaySpeed(playSpeed.value)
    },
    { flush: 'sync' },
  )

  function release() {
    audio.release()
    held = null
    forgetAhead()
  }

  /*
  Lets go of the window ahead. A fetch still on its way is stopped, and if its clip arrives anyway
  it finds `ahead` gone and drops it.
  */
  function forgetAhead() {
    ahead?.stopper.abort()
    if (upcoming !== undefined) audio.discard(upcoming.ready)
    upcoming = undefined
    ahead = undefined
  }

  // The place `stretch` resumes from, or null when it has none and starts at its start.
  function restingSecondsOf(stretch: Stretch) {
    const place = resting.value
    return place !== null && isSameStretch(place.stretch, stretch) ? place.seconds : null
  }

  /*
  Every new press, pause and stop takes a number here. A pause that interrupts a pending `play()`
  makes it stale, so its rejection is not reported.
  */
  const takePress = () => ++press

  /*
  Takes a new press number and returns its guard: true once a later press (or a stop) took over, so
  a clip that arrives for this one must be dropped.
  */
  function beginPress() {
    const thisPress = takePress()
    return () => thisPress !== press
  }

  /*
  Starts or goes on with a subject's status and makes it the owner: the status is taken from the
  other. Stopping and pausing set `state` itself, since they act on whoever owns it.
  */
  function take(subject: Owner, next: Exclude<Status, 'idle'>) {
    owner.value = subject
    state.value = next
  }

  // The audition still holds its WAV: paused as it was, and not let go of for a split that moved.
  const auditionHoldsWav = () => owner.value === 'audition' && audio.hasClip()

  // Stops the sound and keeps the stretch's place and its WAV, so a press resumes at once.
  function pauseStretch() {
    takePress()
    if (held !== null) resting.value = { stretch: held.stretch, seconds: audio.positionSeconds() }
    audio.pause()
    state.value = 'paused'
  }

  /*
  Ends everything audible, for the page: the export, a view change, a moved selection, leaving. A
  stretch that plays is paused, so its playhead stays where it was; one still being decoded is taken
  back, and a paused one stays paused. The window ahead goes: the export's cuts must not wait
  behind its decode, and playing on decodes it again in time (30 s before the window ends).
  */
  function stop() {
    takePress()
    if (stretchStatus.value === 'playing') pauseStretch()
    else if (stretchStatus.value === 'loading') state.value = 'idle'
    forgetAhead()
    letGoOfAudition()
    failure.value = null
  }

  /*
  The audition's clip goes, as the stretch's does when it gives way: only one WAV is held. Its
  place stays, and a sound that plays leaves it where it stopped.
  */
  function letGoOfAudition() {
    if (auditionStatus.value === 'idle') return
    if (auditionStatus.value === 'playing') restAuditionHere()
    release()
    state.value = 'idle'
  }

  function restAuditionHere() {
    if (auditionSplitId !== undefined) {
      auditionResting.value = { splitId: auditionSplitId, seconds: audio.positionSeconds() }
    }
  }

  // The audition played to its end: back at its start, with nothing held.
  function endAudition() {
    takePress()
    auditionResting.value = null
    release()
    state.value = 'idle'
  }

  // The selected split's 8 s: 4 s either side, held to the file's start and end.
  function auditionExtent(selected: Split): TimeRange {
    const lastTrack = splitStore.tracks.at(-1)
    const fileEnd = lastTrack ? lastTrack.startSeconds + lastTrack.lengthSeconds : Infinity
    return {
      startSeconds: Math.max(0, selected.seconds - REACH_SECONDS),
      endSeconds: Math.min(fileEnd, selected.seconds + REACH_SECONDS),
    }
  }

  // The place the audition resumes from, held to the extent, or null when the split has none.
  function auditionPlace(selected: Split, extent: TimeRange) {
    const place = auditionResting.value
    return place?.splitId === selected.id
      ? Math.min(Math.max(place.seconds, extent.startSeconds), extent.endSeconds)
      : null
  }

  // The stretch played to its end: back at its start, with its WAV kept for the next press.
  function endStretch() {
    state.value = 'idle'
    resting.value = null
  }

  // The stretch gives way to the audition or to a new range: its sound and its WAV go, its place stays.
  function letGoOfStretch() {
    if (held !== null && stretchStatus.value === 'playing') {
      resting.value = { stretch: held.stretch, seconds: audio.positionSeconds() }
    }
    if (held !== null) release()
    if (stretchStatus.value !== 'idle') state.value = 'idle'
  }

  function fail(reason: unknown, subject: Subject) {
    release()
    state.value = 'idle'
    // A DOMException (what `play()` rejects with) is no `Error` in every realm, but it has a message.
    const hasMessage = typeof reason === 'object' && reason !== null && 'message' in reason
    const message = String(hasMessage ? reason.message : reason)
    failure.value = `Couldn't play this ${subject}: ${message}`
  }

  async function start(selected: Split) {
    const extent = auditionExtent(selected)
    const isStale = beginPress()
    failure.value = null
    letGoOfStretch()
    auditionSplitId = selected.id
    take('audition', 'loading')

    /*
    The request reaches 4 s past the split even where the file ends sooner: ffmpeg cuts the clip
    short, and the clip says what it really has.
    */
    const startSeconds = Math.max(0, selected.seconds - REACH_SECONDS)
    const clip = await decode(
      startSeconds,
      selected.seconds + REACH_SECONDS - startSeconds,
      isStale,
      'split',
    )
    if (clip === null) return
    hold(clip)
    await playAuditionFromPlace(selected, extent, isStale)
  }

  /*
  Sets the sound at the resting place and plays. A place at the very end has nothing to play from,
  so it plays from the start, as a media element does when it is played after its end.
  */
  async function playAuditionFromPlace(selected: Split, extent: TimeRange, isStale: () => boolean) {
    const place = auditionPlace(selected, extent)
    const from = place !== null && place < extent.endSeconds ? place : extent.startSeconds
    audio.seek(from)
    take('audition', 'playing')
    await playElement(isStale, 'split')
  }

  // A pause keeps the WAV, and the place is where the sound stopped.
  function pauseAudition() {
    takePress()
    restAuditionHere()
    audio.pause()
    state.value = 'paused'
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
        state.value = 'idle'
      } else {
        fail(error, subject)
      }
      return null
    }
  }

  // Makes the clip the one held, dropping the previous ones (note 06: 1.4 MB each) and loading it.
  function hold(clip: Clip) {
    held = null
    forgetAhead()
    audio.hold(clip)
  }

  async function playElement(isStale: () => boolean, subject: Subject) {
    try {
      await audio.play()
    } catch (error) {
      // The browser can refuse to start sound (its autoplay policy), and then there is no playback.
      if (!isStale()) fail(error, subject)
    }
  }

  /*
  Plays the audition on from its resting place. A paused audition that still holds its WAV plays at
  once; one whose split moved has none, so it decodes the moved 8 s first, as an idle one does.
  */
  function playAudition(selected: Split) {
    if (auditionHoldsWav() && auditionStatus.value === 'paused') {
      failure.value = null
      void playAuditionFromPlace(selected, auditionExtent(selected), beginPress())
    } else {
      void start(selected)
    }
  }

  /*
  Moves the audition's resting place, or while the audition plays its sound, to a time already held
  to the extent. The sound jumps there at once (an exact `currentTime` inside the WAV) and goes on;
  otherwise only the resting place moves, which a later play, or the clip still being decoded,
  starts from.
  */
  function seekAudition(selected: Split, target: number) {
    if (auditionStatus.value === 'playing') {
      audio.seek(target)
    } else {
      auditionResting.value = { splitId: selected.id, seconds: target }
    }
  }

  /*
  Plays the stretch from the playhead. The first press decodes the window that holds the playhead;
  later ones set the place in it, and a playhead outside the held window decodes another.
  */
  async function playStretch(stretch: Stretch) {
    const isStale = beginPress()
    failure.value = null
    letGoOfAudition()
    const { subject } = stretch
    activeSubject = subject
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
      take('stretch', 'loading')
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
    audio.seek(placeNow())
    take('stretch', 'playing')
    await playElement(isStale, subject)
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
      audio.seek(target)
    } else if (target >= stretch.endSeconds) {
      // The very end of a stretch whose last window is not held: there is nothing to hear after it.
      audio.pause()
      endStretch()
    } else {
      audio.pause()
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
    const window = nextWindow(held.stretch, held.window, audio.positionSeconds())
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
        if (ahead === asked) upcoming = { ready: audio.prepare(clip), window }
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
    const isStale = beginPress()
    const { subject } = stretch
    let place = window.endSeconds
    if (upcoming === undefined) {
      // The place is kept, so a seek made while the window is decoded is heard from.
      resting.value = { stretch: { ...stretch }, seconds: place }
      take('stretch', 'loading')
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
        upcoming = { ready: audio.prepare(clip), window: missing }
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
    upcoming = undefined
    ahead = undefined
    held = { stretch, window: next.window }
    audio.handOver(next.ready, place)
    take('stretch', 'playing')
    await playElement(isStale, subject)
  }

  /*
  The button and Space key: a press while the subject on show decodes takes it back, while it plays
  pauses it, and otherwise plays it from its place. Nothing on show, nothing happens.
  */
  function toggle() {
    const shown = onShow.value
    if (shown === null) return
    if (status.value === 'loading') stop()
    else if (status.value === 'playing') pauseOnShow(shown)
    else if (shown.split === null) {
      void playStretch(stretchFor(shown))
    } else {
      playAudition(shown.split)
    }
  }

  function pauseOnShow(shown: OnShow) {
    if (shown.split === null) {
      pauseStretch()
    } else {
      pauseAudition()
    }
  }

  /*
  Moves the playhead to a time, held to the extent. While the subject plays, the sound jumps there
  at once and goes on; otherwise only the resting place moves, which a later play, or a clip still
  being decoded, starts from.
  */
  function seek(seconds: number) {
    const shown = onShow.value
    if (shown === null) return
    const target = Math.min(Math.max(seconds, shown.extent.startSeconds), shown.extent.endSeconds)
    if (shown.split === null) {
      seekStretch(stretchFor(shown), target)
    } else {
      seekAudition(shown.split, target)
    }
  }

  function backToStart() {
    if (extent.value !== null) seek(extent.value.startSeconds)
  }

  /*
  A drag of the playhead pauses a playing subject, so the sound does not jump under the pointer, and
  `dropPlayhead` plays it on from where the playhead was dropped. A paused, idle or loading subject
  stays so.
  */
  function grabPlayhead() {
    const shown = onShow.value
    grabbedOwner = shown !== null && status.value === 'playing' ? shown.owner : null
    if (shown !== null && grabbedOwner !== null) pauseOnShow(shown)
  }

  function dropPlayhead() {
    const shown = onShow.value
    // Only a subject still paused is played on: another sound or another subject may have taken over.
    const canResume = shown !== null && grabbedOwner === shown.owner && status.value === 'paused'
    grabbedOwner = null
    if (!canResume) return
    if (shown.split === null) {
      void playStretch(stretchFor(shown))
    } else {
      playAudition(shown.split)
    }
  }

  /*
  Where the playhead is, for a view to draw each animation frame: the sound while it plays
  (`currentTime` moves without Vue knowing), else the resting place it resumes from, which the
  view's watch does follow, else the extent's start. Null with nothing on show.
  */
  function playheadSeconds() {
    const shown = onShow.value
    if (shown === null) return null
    if (status.value === 'playing') return audio.positionSeconds()
    const place =
      shown.split === null
        ? restingSecondsOf(stretchFor(shown))
        : auditionPlace(shown.split, shown.extent)
    return place ?? shown.extent.startSeconds
  }

  /*
  Selecting another split, deselecting, deleting and a setting change (which re-selects) end the
  audition, and the place goes with the split it was made for. Moving the selected split keeps both
  the split and the place: a playing audition is paused where it is, a paused one stays paused, and
  either lets go of its WAV, since the 8 s it was decoded for moved. A press still decoding is taken
  back. Sync: a clip that arrives right after must already find its press gone.
  */
  watch(
    () => [splitStore.selectedSplit?.id, splitStore.selectedSplit?.seconds] as const,
    ([id], [previousId]) => {
      if (id === previousId) {
        moveAudition()
      } else {
        resetAudition()
      }
    },
    { flush: 'sync' },
  )

  /*
  The split moved in time: a playing audition pauses where it is and lets go of its WAV, a paused one
  lets go of it, and a decode is taken back, since the 8 s it was made for moved.
  */
  function moveAudition() {
    switch (auditionStatus.value) {
      case 'playing': {
        pauseAudition()
        release()
        break
      }
      case 'paused': {
        if (auditionHoldsWav()) release()
        break
      }
      case 'loading': {
        takePress()
        letGoOfAudition()
        failure.value = null
        break
      }
      default: {
        failure.value = null
      }
    }
  }

  // Ends the audition, if it has the status, and drops its place: the playhead is back at the start.
  function resetAudition() {
    if (auditionStatus.value !== 'idle') {
      takePress()
      letGoOfAudition()
    }
    auditionResting.value = null
    failure.value = null
  }

  /*
  Ends a stretch, if it is this subject's, and drops its place and its decoded WAV: the playhead is
  back at the start. A stretch of the other subject plays on. A clip still on its way is stale by the
  press number.
  */
  function resetStretch(subject: StretchSubject) {
    if (activeSubject === subject) {
      if (stretchStatus.value !== 'idle') takePress()
      letGoOfStretch()
    }
    if (resting.value?.stretch.subject === subject) resting.value = null
    failure.value = null
  }

  /*
  A new range, or none, ends the range: the playhead is back at the new range's start. Sync, like
  the watch above, so a clip that arrives right after finds its press gone.
  */
  watch(
    () => splitStore.range,
    () => {
      resetStretch('range')
    },
    { flush: 'sync' },
  )

  /*
  The same for the selected track: another track, none, or one whose start or end moved is no longer
  the stretch that was heard. The source is a string, so a split that moves elsewhere, which
  recomputes the tracks, changes nothing here. A track's change leaves the range alone: a split
  added at the Range view's mark shortens the selected track, and the range plays on.
  */
  watch(
    () => {
      const track = splitStore.selectedTrack
      return track === null
        ? null
        : `${track.startSplit?.id ?? 'first'}/${track.startSeconds}/${track.lengthSeconds}`
    },
    () => {
      resetStretch('track')
    },
    { flush: 'sync' },
  )

  /*
  Sound belongs to the view it was started in. A new view pauses a playing stretch where it was,
  takes back a decode and lets go of the audition's WAV, which keeps its place. Sync, so the sound
  is already stopped when the view shows.
  */
  watch(
    () => splitStore.view,
    () => {
      stop()
    },
    { flush: 'sync' },
  )

  return {
    status,
    isActive,
    failure,
    extent,
    volumeDecibels,
    isMuted,
    playSpeed,
    setPlaySpeed,
    setVolume,
    toggleMute,
    toggle,
    seek,
    backToStart,
    grabPlayhead,
    dropPlayhead,
    stop,
    playheadSeconds,
  }
})
