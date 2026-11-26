import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import type { TimeRange } from '@/entities/split/lib/range-between.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { PLAY_SPEED_STORAGE_KEY } from '../../config/play-speed.ts'
import { VOLUME_STORAGE_KEY } from '../../config/volume.ts'
import { usePlayerStore } from '../player.ts'

interface Clip {
  wav: Uint8Array
  startSeconds: number
  lengthSeconds: number
}

const LOUD = -10
const QUIET = -50

function curveOf(...runs: [number, number][]) {
  return Float32Array.from(
    runs.flatMap(([value, count]) => Array.from({ length: count }, () => value)),
  )
}

/*
60 s, median -10 dB. Quiet from 20 s to 24 s and from 40 s to 44 s, so the splits are at 22 s and
42 s: 20 s apart, so the zoom window on one never reaches the other.
*/
const farGaps = () => curveOf([LOUD, 400], [QUIET, 80], [LOUD, 320], [QUIET, 80], [LOUD, 320])

// The clip the source-file store gives for a stretch: the bytes, and the start and length it really has.
const clipOf = (startSeconds: number, lengthSeconds: number): Clip => ({
  wav: Uint8Array.of(1, 2, 3),
  startSeconds,
  lengthSeconds,
})

// A promise the test settles by hand, to hold a clip back while something else happens.
function deferred<T>() {
  const handlers = {} as { resolve: (value: T) => void; reject: (reason: unknown) => void }
  const promise = new Promise<T>((resolve, reject) => {
    handlers.resolve = (value) => {
      resolve(value)
    }
    handlers.reject = (reason) => {
      reject(reason)
    }
  })
  return { promise, ...handlers }
}

// Lets the promise callbacks the store waits on run.
const flush = () => new Promise((done) => setTimeout(done, 0))

// What localStorage does when the browser blocks it: every read and write throws.
function throwBlocked(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

// The first split, at 22 s, selected in the Split view: the audition is 18 s to 26 s.
function setUp() {
  const split = useSplitStore()
  const curve = farGaps()
  split.open(curve, { windowSeconds: 0.05, durationSeconds: 60 })
  split.findSplits()
  // Detection opens on track 1; the clip around a split is for the zoom view's selected split.
  split.selectSplit(split.splits[0]!.id)
  return { split, player: usePlayerStore() }
}

type Parts = ReturnType<typeof setUp>

// The second track selected, 22 s to 42 s, as the Track view shows it. No split is selected.
function setUpTrack(): Parts {
  const parts = setUp()
  parts.split.selectTrack(parts.split.tracks[1]!)
  return parts
}

// The range of 10 s to 30 s: 20 s of the file, and the split at 22 s inside it.
function setUpRange(): Parts {
  const parts = setUp()
  parts.split.setRange(10, 30)
  return parts
}

// A file of 1000 s with no split: one track longer than the 10 min the player decodes at a time.
function setUpLongTrack(): Parts {
  const split = useSplitStore()
  split.open(curveOf([LOUD, 20_000]), { windowSeconds: 0.05, durationSeconds: 1000 })
  split.selectTrack(split.tracks[0]!)
  return { split, player: usePlayerStore() }
}

// A split at 100 s, so the audition is 96 s to 104 s: quiet from 98 s to 102 s in a file of 150 s.
function setUpAtHundred(): Parts {
  const split = useSplitStore()
  split.open(curveOf([LOUD, 1960], [QUIET, 80], [LOUD, 960]), {
    windowSeconds: 0.05,
    durationSeconds: 150,
  })
  split.findSplits()
  split.selectSplit(split.splits[0]!.id)
  expect(split.selectedSplit?.seconds).toBeCloseTo(100, 6)
  return { split, player: usePlayerStore() }
}

/*
What the player can have on show, and what is true of each: the verbs are written once and run for
all three. The extent is also the clip each asks for, since a clip starts where its extent does.
*/
interface Subject {
  name: string
  // What a failure calls it.
  wording: 'split' | 'track' | 'range'
  // The player with the subject on show and nothing played yet.
  setUp: () => Parts
  // Where it lies in the file: the span of its playhead.
  extent: TimeRange
  /*
  An audition lets go of its WAV when it ends or is stopped, and a stop ends it. A track or the
  range keeps its WAV for the next press, and a stop pauses it.
  */
  keepsWav: boolean
  // Puts another split, track or range on show, which ends the subject, and where that one starts.
  replace: (parts: Parts) => void
  replacementStartSeconds: number
  // Puts the subject back on show, as the same split, track or range.
  restore: (parts: Parts) => void
}

const AUDITION: Subject = {
  name: 'the audition',
  wording: 'split',
  setUp,
  extent: { startSeconds: 18, endSeconds: 26 },
  keepsWav: false,
  replace: ({ split }) => {
    split.selectSplit(split.splits[1]!.id)
  },
  replacementStartSeconds: 38,
  restore: ({ split }) => {
    split.selectSplit(split.splits[0]!.id)
  },
}

const TRACK: Subject = {
  name: 'a track',
  wording: 'track',
  setUp: setUpTrack,
  extent: { startSeconds: 22, endSeconds: 42 },
  keepsWav: true,
  replace: ({ split }) => {
    split.selectTrack(split.tracks[2]!)
  },
  replacementStartSeconds: 42,
  restore: ({ split }) => {
    split.selectTrack(split.tracks[1]!)
  },
}

const RANGE: Subject = {
  name: 'the range',
  wording: 'range',
  setUp: setUpRange,
  extent: { startSeconds: 10, endSeconds: 30 },
  keepsWav: true,
  replace: ({ split }) => {
    split.setRange(40, 50)
  },
  replacementStartSeconds: 40,
  restore: ({ split }) => {
    split.setRange(10, 30)
  },
}

const SUBJECTS = [AUDITION, TRACK, RANGE]
const forEachSubject = describe.each(SUBJECTS)

const lengthOf = ({ extent }: Subject) => extent.endSeconds - extent.startSeconds
const clipFor = (subject: Subject) => clipOf(subject.extent.startSeconds, lengthOf(subject))

async function playingOf(subject: Subject) {
  const parts = subject.setUp()
  parts.player.toggle()
  await flush()
  expect(parts.player.status).toBe('playing')
  return parts
}

const playing = () => playingOf(AUDITION)
const playingTrack = () => playingOf(TRACK)
const playingRange = () => playingOf(RANGE)

async function playingLongTrack() {
  const parts = setUpLongTrack()
  parts.player.toggle()
  await flush()
  expect(parts.player.status).toBe('playing')
  return parts
}

async function setUpAtHundredPlaying() {
  const parts = setUpAtHundred()
  parts.player.toggle()
  await flush()
  expect(parts.player.status).toBe('playing')
  return parts
}

// The Split view with no selected split: a click on empty ground in the whole-file view.
function setUpNothing() {
  const parts = setUp()
  parts.split.moveZoomTo(30)
  return parts
}

describe('the player store', () => {
  let play: MockInstance<HTMLMediaElement['play']>
  let pause: MockInstance<HTMLMediaElement['pause']>
  let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>
  let clip: MockInstance<ReturnType<typeof useSourceFileStore>['clip']>

  // The one hidden element the store made: the element `play` was last called on.
  const audio = () => play.mock.contexts.at(-1) as HTMLAudioElement

  // The WAVs held: made and not yet let go of. The player holds at most two.
  const heldWavs = () => createObjectURL.mock.calls.length - revokeObjectURL.mock.calls.length

  // The element's time moves, as it does while playing, and tells the player.
  const timeUpdate = (currentTime: number) => {
    audio().currentTime = currentTime
    audio().dispatchEvent(new Event('timeupdate'))
  }

  // A long track near the end of its first window, whose window ahead is still being decoded.
  async function waitingForTheWindowAhead() {
    const parts = await playingLongTrack()
    const pending = deferred<Clip>()
    clip.mockReturnValueOnce(pending.promise)
    timeUpdate(595)
    timeUpdate(600)
    audio().dispatchEvent(new Event('ended'))
    return { ...parts, pending }
  }

  beforeEach(() => {
    // The volume is kept in localStorage, which a spec must not inherit from another.
    localStorage.clear()
    setActivePinia(createPinia())
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    /*
    Like Chrome, and unlike jsdom: a new source, or a load, resets the element's rate to its default
    rate (the media spec's "load algorithm"; docs/adr/0004-time-stretching-by-the-browser.md).
    */
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      this.playbackRate = this.defaultPlaybackRate
    })
    const setSource = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')!.set!
    vi.spyOn(HTMLMediaElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLMediaElement,
      value: string,
    ) {
      setSource.call(this, value)
      this.playbackRate = this.defaultPlaybackRate
    })
    let urls = 0
    createObjectURL = vi.fn(() => `blob:clip-${++urls}`)
    revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    clip = vi
      .spyOn(useSourceFileStore(), 'clip')
      .mockImplementation(async (startSeconds, lengthSeconds) =>
        clipOf(startSeconds, lengthSeconds),
      )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('with nothing on show', () => {
    it('has no extent and no playhead', () => {
      const { player } = setUpNothing()

      expect(player.status).toBe('idle')
      expect(player.extent).toBeNull()
      expect(player.playheadSeconds()).toBeNull()
    })

    it('does nothing for any verb', async () => {
      const { player } = setUpNothing()

      player.toggle()
      player.seek(20)
      player.backToStart()
      player.grabPlayhead()
      player.dropPlayhead()
      player.stop()
      await flush()

      expect(clip).not.toHaveBeenCalled()
      expect(play).not.toHaveBeenCalled()
      expect(player.status).toBe('idle')
      expect(player.isActive).toBe(false)
      expect(player.failure).toBeNull()
      expect(player.extent).toBeNull()
      expect(player.playheadSeconds()).toBeNull()
    })

    it('has a playhead again once a split is selected', () => {
      const { split, player } = setUpNothing()

      player.seek(20)
      player.backToStart()
      split.selectSplit(split.splits[0]!.id)

      expect(player.playheadSeconds()).toBe(18)
    })
  })

  describe('what is on show', () => {
    forEachSubject('$name', (subject) => {
      it('starts idle, with nothing failed and the playhead at the start of its extent', () => {
        const { player } = subject.setUp()

        expect(player.status).toBe('idle')
        expect(player.isActive).toBe(false)
        expect(player.failure).toBeNull()
        expect(player.extent).toEqual(subject.extent)
        expect(player.playheadSeconds()).toBe(subject.extent.startSeconds)
      })
    })

    it('follows the view: the audition in the Split view, the range in the Range view', () => {
      const { split, player } = setUpRange()
      expect(player.extent).toEqual(RANGE.extent)

      split.showView('split')
      expect(player.extent).toEqual(AUDITION.extent)
      expect(player.playheadSeconds()).toBe(18)

      split.showView('range')
      expect(player.extent).toEqual(RANGE.extent)
      expect(player.playheadSeconds()).toBe(10)
    })

    it('has the track in the Track view', () => {
      const { split, player } = setUpTrack()
      split.setRange(10, 30)
      expect(player.extent).toEqual(RANGE.extent)

      split.showView('track')

      expect(player.extent).toEqual(TRACK.extent)
    })

    it('reads idle for a subject the sound of another subject holds', async () => {
      const { split, player } = await playingRange()

      split.showView('split')

      expect(player.status).toBe('idle')
      expect(player.isActive).toBe(false)
    })
  })

  describe('toggle', () => {
    forEachSubject('$name', (subject) => {
      const { startSeconds, endSeconds } = subject.extent
      const length = lengthOf(subject)

      it('asks for the clip across its extent and plays it as a WAV from its start', async () => {
        const { player } = subject.setUp()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)

        player.toggle()

        expect(clip).toHaveBeenCalledExactlyOnceWith(startSeconds, length)
        expect(player.status).toBe('loading')
        expect(player.isActive).toBe(true)
        expect(play).not.toHaveBeenCalled()

        pending.resolve(clipFor(subject))
        await flush()

        expect(player.status).toBe('playing')
        expect(player.isActive).toBe(true)
        expect(play).toHaveBeenCalledOnce()
        const blob = createObjectURL.mock.calls[0]![0]
        expect(blob.type).toBe('audio/wav')
        expect(blob.size).toBe(3)
        expect(audio().getAttribute('src')).toBe('blob:clip-1')
        expect(audio().currentTime).toBe(0)
      })

      it('reports the playhead as the clip start plus the element time, within the clip', async () => {
        const { player } = await playingOf(subject)

        audio().currentTime = 2.5
        expect(player.playheadSeconds()).toBe(startSeconds + 2.5)
        // The element can report a hair past the end before `ended` arrives.
        audio().currentTime = length + 0.01
        expect(player.playheadSeconds()).toBe(endSeconds)
      })

      it('reads "loading" until the clip arrives, and a press then takes it back for good', async () => {
        const { player } = subject.setUp()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        player.toggle()
        expect(player.isActive).toBe(true)

        player.toggle()
        expect(player.status).toBe('idle')
        pending.resolve(clipFor(subject))
        await flush()

        expect(player.status).toBe('idle')
        expect(play).not.toHaveBeenCalled()
        expect(createObjectURL).not.toHaveBeenCalled()
      })

      it('never plays a stale clip after a later press', async () => {
        const { player } = subject.setUp()
        const first = deferred<Clip>()
        const second = deferred<Clip>()
        clip.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

        player.toggle() // press 1, loading
        player.toggle() // stop
        player.toggle() // press 2, loading
        first.resolve(clipFor(subject))
        await flush()

        expect(player.status).toBe('loading')
        expect(play).not.toHaveBeenCalled()

        second.resolve(clipFor(subject))
        await flush()

        expect(player.status).toBe('playing')
        expect(play).toHaveBeenCalledOnce()
        expect(createObjectURL).toHaveBeenCalledOnce()
      })
    })

    it('revokes the previous audition clip when the next press starts playing', async () => {
      const { player } = setUp()
      player.toggle()
      await flush()
      player.stop()
      player.toggle()
      await flush()

      expect(createObjectURL).toHaveBeenCalledTimes(2)
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(audio().getAttribute('src')).toBe('blob:clip-2')
    })
  })

  describe('pausing', () => {
    forEachSubject('$name', (subject) => {
      const { startSeconds } = subject.extent

      it('pauses on a second press while playing, with the playhead where the sound stopped', async () => {
        const { player } = await playingOf(subject)
        audio().currentTime = 2.5
        pause.mockClear()

        player.toggle()
        // The element's clock keeps whatever it had; the playhead must not follow it any more.
        audio().currentTime = 7

        expect(player.status).toBe('paused')
        expect(player.isActive).toBe(false)
        expect(pause).toHaveBeenCalled()
        expect(player.playheadSeconds()).toBe(startSeconds + 2.5)
        expect(revokeObjectURL).not.toHaveBeenCalled()
      })

      it('resumes from the same time at once, without decoding again', async () => {
        const { player } = await playingOf(subject)
        audio().currentTime = 2.5
        player.toggle()

        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().currentTime).toBe(2.5)
        expect(play).toHaveBeenCalledTimes(2)
        expect(clip).toHaveBeenCalledOnce()
        expect(createObjectURL).toHaveBeenCalledOnce()
        expect(revokeObjectURL).not.toHaveBeenCalled()
      })

      it('does not report the rejected play() of a press that was paused', async () => {
        const { player } = subject.setUp()
        const refused = deferred<void>()
        play.mockReturnValueOnce(refused.promise)
        player.toggle()
        await flush()

        player.toggle()
        refused.reject(new DOMException('The play() request was interrupted', 'AbortError'))
        await flush()

        expect(player.status).toBe('paused')
        expect(player.failure).toBeNull()
      })
    })
  })

  describe('the resting place', () => {
    forEachSubject('$name', (subject) => {
      const { startSeconds } = subject.extent

      it('goes back to the start when the sound plays to its end, and Play then starts there', async () => {
        const { player } = await playingOf(subject)
        audio().currentTime = 7

        audio().dispatchEvent(new Event('ended'))

        expect(player.status).toBe('idle')
        expect(player.playheadSeconds()).toBe(startSeconds)
        expect(revokeObjectURL).toHaveBeenCalledTimes(subject.keepsWav ? 0 : 1)
        expect(heldWavs()).toBe(subject.keepsWav ? 1 : 0)
        expect(audio().hasAttribute('src')).toBe(subject.keepsWav)

        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().currentTime).toBe(0)
        expect(clip).toHaveBeenCalledTimes(subject.keepsWav ? 1 : 2)
      })

      it('is cleared, with the WAV, when another split, track or range replaces the subject', async () => {
        const parts = await playingOf(subject)
        audio().currentTime = 2.5
        parts.player.toggle()

        subject.replace(parts)
        expect(parts.player.status).toBe('idle')
        expect(parts.player.playheadSeconds()).toBe(subject.replacementStartSeconds)
        expect(heldWavs()).toBe(0)

        subject.restore(parts)
        expect(parts.player.playheadSeconds()).toBe(startSeconds)
      })
    })

    it('is cleared when no split is selected, and the playhead has no place', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.toggle()

      split.moveZoomTo(30)
      expect(player.playheadSeconds()).toBeNull()

      split.selectSplit(split.splits[0]!.id)
      expect(player.playheadSeconds()).toBe(18)
    })

    it('is cleared when the selected split is deleted', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.toggle()
      const firstId = split.splits[0]!.id

      split.deleteSplit(firstId)

      // The next split is selected, and its playhead waits at the start of its own 8 s.
      expect(player.playheadSeconds()).toBe(38)
    })
  })

  describe('moving the playhead', () => {
    forEachSubject('$name', (subject) => {
      const { startSeconds, endSeconds } = subject.extent
      const length = lengthOf(subject)

      it('sets the sound inside the WAV while it plays, and goes on playing', async () => {
        const { player } = await playingOf(subject)
        const element = audio()
        play.mockClear()

        player.seek(startSeconds + 4.5)

        expect(element.currentTime).toBe(4.5)
        expect(player.status).toBe('playing')
        expect(player.playheadSeconds()).toBe(startSeconds + 4.5)
        expect(play).not.toHaveBeenCalled()
        expect(clip).toHaveBeenCalledOnce()
      })

      it('moves the playhead of a paused one and leaves it paused, with Play starting there', async () => {
        const { player } = await playingOf(subject)
        player.toggle()
        play.mockClear()

        player.seek(startSeconds + 2)

        expect(player.status).toBe('paused')
        expect(player.playheadSeconds()).toBe(startSeconds + 2)
        expect(play).not.toHaveBeenCalled()

        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().currentTime).toBe(2)
        expect(clip).toHaveBeenCalledOnce()
      })

      it('moves the playhead of one not yet played, and the first Play decodes it and starts there', async () => {
        const { player } = subject.setUp()

        player.seek(startSeconds + 6)

        expect(player.status).toBe('idle')
        expect(player.playheadSeconds()).toBe(startSeconds + 6)
        expect(clip).not.toHaveBeenCalled()

        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().currentTime).toBe(6)
      })

      it('sets where playback starts when the clip arrives, if moved during the decode', async () => {
        const { player } = subject.setUp()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        player.toggle()

        player.seek(startSeconds + 3)

        expect(player.status).toBe('loading')
        expect(player.playheadSeconds()).toBe(startSeconds + 3)
        expect(play).not.toHaveBeenCalled()

        pending.resolve(clipFor(subject))
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().currentTime).toBe(3)
      })

      it('holds the playhead to its extent, whether it plays or not', async () => {
        const { player } = subject.setUp()

        player.seek(startSeconds - 5)
        expect(player.playheadSeconds()).toBe(startSeconds)

        player.seek(endSeconds + 99)
        expect(player.playheadSeconds()).toBe(endSeconds)

        player.toggle()
        await flush()
        player.seek(endSeconds + 99)
        expect(audio().currentTime).toBe(length)
        expect(player.playheadSeconds()).toBe(endSeconds)

        player.seek(startSeconds - 5)
        expect(audio().currentTime).toBe(0)
        expect(player.playheadSeconds()).toBe(startSeconds)
      })

      it('plays from the start when the playhead was left at the very end', async () => {
        const { player } = await playingOf(subject)
        player.toggle()
        player.seek(endSeconds)
        expect(player.playheadSeconds()).toBe(endSeconds)

        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().currentTime).toBe(0)
      })
    })

    describe('near the ends of the file, where the audition is shorter', () => {
      it('asks for less than 8 s when the split is under 4 s from the start of the file', () => {
        // Quiet from 1 s to 5 s, so the only split is at 3 s.
        const split = useSplitStore()
        split.open(curveOf([LOUD, 20], [QUIET, 80], [LOUD, 1100]), {
          windowSeconds: 0.05,
          durationSeconds: 60,
        })
        split.findSplits()
        split.selectSplit(split.splits[0]!.id)
        const player = usePlayerStore()

        player.toggle()

        // 0 to 7 s: 4 s after the split, and only 3 s before it, because the file starts.
        expect(clip).toHaveBeenCalledExactlyOnceWith(0, 7)
      })

      it('still asks for 8 s when the split is under 4 s from the end of the file, which ffmpeg then cuts short', () => {
        // Quiet from 55 s to 59 s, so the only split is at 57 s, in a file of 60 s.
        const split = useSplitStore()
        split.open(curveOf([LOUD, 1100], [QUIET, 80], [LOUD, 20]), {
          windowSeconds: 0.05,
          durationSeconds: 60,
        })
        split.findSplits()
        split.selectSplit(split.splits[0]!.id)
        const player = usePlayerStore()

        player.toggle()

        expect(clip).toHaveBeenCalledExactlyOnceWith(53, 8)
      })

      it('holds the audition to the start of the file, so the playhead waits at 0 s', () => {
        // Quiet from 1 s to 5 s, so the only split is at 3 s and the 8 s start at 0 s.
        const split = useSplitStore()
        split.open(curveOf([LOUD, 20], [QUIET, 80], [LOUD, 1100]), {
          windowSeconds: 0.05,
          durationSeconds: 60,
        })
        split.findSplits()
        split.selectSplit(split.splits[0]!.id)
        const player = usePlayerStore()

        expect(player.playheadSeconds()).toBe(0)
        player.seek(-2)

        expect(player.playheadSeconds()).toBe(0)
      })

      it('holds the playhead to the end of the file, where the 8 s are shorter', () => {
        // Quiet from 55 s to 59 s, so the only split is at 57 s and the 8 s end at 60 s.
        const split = useSplitStore()
        split.open(curveOf([LOUD, 1100], [QUIET, 80], [LOUD, 20]), {
          windowSeconds: 0.05,
          durationSeconds: 60,
        })
        split.findSplits()
        split.selectSplit(split.splits[0]!.id)
        const player = usePlayerStore()

        player.seek(99)

        expect(player.playheadSeconds()).toBe(60)
      })
    })
  })

  describe('back to the start', () => {
    forEachSubject('$name', (subject) => {
      const { startSeconds } = subject.extent

      it('moves a playing one to its start and keeps it playing', async () => {
        const { player } = await playingOf(subject)
        const element = audio()
        element.currentTime = 6
        play.mockClear()

        player.backToStart()

        expect(element.currentTime).toBe(0)
        expect(player.status).toBe('playing')
        expect(player.playheadSeconds()).toBe(startSeconds)
        expect(play).not.toHaveBeenCalled()
      })

      it('moves a paused one to its start and leaves it paused', async () => {
        const { player } = await playingOf(subject)
        audio().currentTime = 6
        player.toggle()
        expect(player.playheadSeconds()).toBe(startSeconds + 6)

        player.backToStart()

        expect(player.status).toBe('paused')
        expect(player.playheadSeconds()).toBe(startSeconds)
      })
    })
  })

  describe('grab and drop', () => {
    forEachSubject('$name', (subject) => {
      const { startSeconds } = subject.extent

      it('pauses a playing one on the grab and plays it on from the drop', async () => {
        const { player } = await playingOf(subject)
        play.mockClear()

        player.grabPlayhead()
        expect(player.status).toBe('paused')

        player.seek(startSeconds + 2)
        player.seek(startSeconds + 6)
        expect(player.status).toBe('paused')
        expect(player.playheadSeconds()).toBe(startSeconds + 6)
        expect(play).not.toHaveBeenCalled()

        player.dropPlayhead()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().currentTime).toBe(6)
        expect(play).toHaveBeenCalledOnce()
        expect(clip).toHaveBeenCalledOnce()
      })

      it('leaves a paused one paused after the drop', async () => {
        const { player } = await playingOf(subject)
        player.toggle()
        play.mockClear()

        player.grabPlayhead()
        player.seek(startSeconds + 2)
        player.dropPlayhead()
        await flush()

        expect(player.status).toBe('paused')
        expect(player.playheadSeconds()).toBe(startSeconds + 2)
        expect(play).not.toHaveBeenCalled()
      })

      it('leaves an idle one idle, and one still decoding decoding', async () => {
        const { player } = subject.setUp()
        player.grabPlayhead()
        player.seek(startSeconds + 2)
        player.dropPlayhead()
        expect(player.status).toBe('idle')
        expect(clip).not.toHaveBeenCalled()

        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        player.toggle()
        player.grabPlayhead()
        player.seek(startSeconds + 3)
        player.dropPlayhead()

        expect(player.status).toBe('loading')
        pending.resolve(clipFor(subject))
        await flush()
        expect(audio().currentTime).toBe(3)
      })

      it('does not play on when another split, track or range replaced it during the drag', async () => {
        const parts = await playingOf(subject)
        parts.player.grabPlayhead()
        play.mockClear()

        subject.replace(parts)
        parts.player.dropPlayhead()
        await flush()

        expect(parts.player.status).toBe('idle')
        expect(play).not.toHaveBeenCalled()
      })

      it('does not play on a second time from a drop with no grab', async () => {
        const { player } = await playingOf(subject)
        player.grabPlayhead()
        player.dropPlayhead()
        player.toggle()
        play.mockClear()

        player.dropPlayhead()
        await flush()

        expect(player.status).toBe('paused')
        expect(play).not.toHaveBeenCalled()
      })
    })
  })

  describe('stop()', () => {
    forEachSubject('$name', (subject) => {
      const { startSeconds } = subject.extent
      const stoppedStatus = subject.keepsWav ? 'paused' : 'idle'
      const heldAfterStop = subject.keepsWav ? 1 : 0

      it('ends or pauses a playing one where it is, and Play starts from that place', async () => {
        const { player } = await playingOf(subject)
        audio().currentTime = 2.5

        player.stop()

        expect(player.status).toBe(stoppedStatus)
        expect(player.isActive).toBe(false)
        expect(player.playheadSeconds()).toBe(startSeconds + 2.5)
        expect(heldWavs()).toBe(heldAfterStop)

        audio().currentTime = 0
        player.toggle()
        await flush()

        expect(audio().currentTime).toBe(2.5)
      })

      it('keeps the place of a paused one, which it ends or leaves paused as it does a playing one', async () => {
        const { player } = await playingOf(subject)
        audio().currentTime = 2.5
        player.toggle()

        player.stop()

        expect(player.status).toBe(stoppedStatus)
        expect(player.playheadSeconds()).toBe(startSeconds + 2.5)
        expect(heldWavs()).toBe(heldAfterStop)
      })

      it('takes back one that is still decoding', async () => {
        const { player } = subject.setUp()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        player.toggle()

        player.stop()
        pending.resolve(clipFor(subject))
        await flush()

        expect(player.status).toBe('idle')
        expect(play).not.toHaveBeenCalled()
      })

      it('lets go of what it should and is safe when idle', async () => {
        const { player } = subject.setUp()
        player.stop()
        expect(revokeObjectURL).not.toHaveBeenCalled()

        player.toggle()
        await flush()
        player.stop()
        player.stop()

        expect(player.status).toBe(stoppedStatus)
        expect(pause).toHaveBeenCalled()
        expect(heldWavs()).toBe(heldAfterStop)
      })
    })
  })

  describe('failures', () => {
    forEachSubject('$name', (subject) => {
      const { wording } = subject

      it('says why the clip could not be made and goes idle', async () => {
        const { player } = subject.setUp()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))

        player.toggle()
        await flush()

        expect(player.status).toBe('idle')
        expect(player.failure).toBe(`Couldn't play this ${wording}: Invalid data found`)
      })

      it('stays silent when the file was replaced before the clip was ready', async () => {
        const { player } = subject.setUp()
        clip.mockRejectedValueOnce(new FileReplacedError())

        player.toggle()
        await flush()

        expect(player.status).toBe('idle')
        expect(player.failure).toBeNull()
      })

      it('ignores the failure of a press that was taken back', async () => {
        const { player } = subject.setUp()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        player.toggle()
        player.toggle()

        pending.reject(new Error('Invalid data found'))
        await flush()

        expect(player.failure).toBeNull()
      })

      it('treats a refused play() as a failure and lets go of the clip', async () => {
        const { player } = subject.setUp()
        play.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))

        player.toggle()
        await flush()

        expect(player.status).toBe('idle')
        expect(player.failure).toBe(`Couldn't play this ${wording}: Not allowed`)
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('says the same when the resumed clip cannot be played', async () => {
        const { player } = await playingOf(subject)
        audio().currentTime = 2.5
        player.toggle()
        play.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))

        player.toggle()
        await flush()

        expect(player.status).toBe('idle')
        expect(player.failure).toBe(`Couldn't play this ${wording}: Not allowed`)
      })

      it('clears the failure on the next press', async () => {
        const { player } = subject.setUp()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))
        player.toggle()
        await flush()

        player.toggle()

        expect(player.failure).toBeNull()
        expect(player.status).toBe('loading')
      })

      it('clears the failure on stop', async () => {
        const { player } = subject.setUp()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))
        player.toggle()
        await flush()

        player.stop()

        expect(player.failure).toBeNull()
      })

      it('clears the failure when another split, track or range replaces the subject', async () => {
        const parts = subject.setUp()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))
        parts.player.toggle()
        await flush()
        expect(parts.player.failure).not.toBeNull()

        subject.replace(parts)

        expect(parts.player.failure).toBeNull()
      })
    })
  })

  describe('when another split, track or range replaces the subject', () => {
    forEachSubject('$name', (subject) => {
      it('stops it, lets go of its WAV and puts the playhead at the start of the new one', async () => {
        const parts = await playingOf(subject)
        audio().currentTime = 4

        subject.replace(parts)

        expect(parts.player.status).toBe('idle')
        expect(pause).toHaveBeenCalled()
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
        expect(parts.player.playheadSeconds()).toBe(subject.replacementStartSeconds)
      })

      it('drops a clip that arrives after it', async () => {
        const parts = subject.setUp()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        parts.player.toggle()

        subject.replace(parts)
        expect(parts.player.status).toBe('idle')
        pending.resolve(clipFor(subject))
        await flush()

        expect(play).not.toHaveBeenCalled()
        expect(parts.player.status).toBe('idle')
      })
    })
  })

  describe('moving the split', () => {
    it('is held to the 8 s of the split when the split moves', async () => {
      const { split, player } = await playing()
      audio().currentTime = 7.5
      player.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)

      expect(player.status).toBe('paused')
      // 25.5 s in the file is past the moved 8 s, 17 s to 25 s, so it waits on the edge.
      expect(player.playheadSeconds()).toBe(25)
    })

    it('pauses a playing audition where the sound was, and lets go of the WAV, whose 8 s moved', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5

      split.moveSplit(split.selectedSplit!.id, 21)

      expect(player.status).toBe('paused')
      expect(player.isActive).toBe(false)
      expect(pause).toHaveBeenCalled()
      expect(player.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(0)
    })

    it('keeps a paused audition paused, with the place and without the WAV', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)

      expect(player.status).toBe('paused')
      expect(player.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(0)
      expect(play).toHaveBeenCalledOnce()
    })

    it('resumes by decoding the moved 8 s, reading "Stop" meanwhile, and starts at the kept time', async () => {
      const { split, player } = await setUpAtHundredPlaying()
      audio().currentTime = 3.5
      player.toggle()

      split.moveSplit(split.selectedSplit!.id, 100.05)
      expect(player.playheadSeconds()).toBeCloseTo(99.5, 6)
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      player.toggle()

      expect(player.status).toBe('loading')
      expect(player.isActive).toBe(true)
      expect(clip).toHaveBeenLastCalledWith(expect.closeTo(96.05, 6), 8)
      expect(play).toHaveBeenCalledOnce()

      pending.resolve(clipOf(96.05, 8))
      await flush()

      expect(player.status).toBe('playing')
      // 99.50 s in a clip that starts at 96.05 s.
      expect(audio().currentTime).toBeCloseTo(3.45, 6)
      expect(player.playheadSeconds()).toBeCloseTo(99.5, 6)
      expect(heldWavs()).toBe(1)
    })

    it('takes back a press that is decoding the moved 8 s, and drops its clip', async () => {
      const { split, player } = await setUpAtHundredPlaying()
      player.toggle()
      split.moveSplit(split.selectedSplit!.id, 100.05)
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      player.toggle()

      player.toggle()
      pending.resolve(clipOf(96.05, 8))
      await flush()

      expect(player.status).toBe('idle')
      expect(play).toHaveBeenCalledOnce()
      expect(heldWavs()).toBe(0)
    })

    it('drops a clip still being decoded when the split moves', async () => {
      const { split, player } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      player.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)
      pending.resolve(clipOf(18, 8))
      await flush()

      expect(play).not.toHaveBeenCalled()
      expect(player.status).toBe('idle')
    })

    it('takes back a press that is decoding when the split moves, keeping the playhead where it was put', async () => {
      const { split, player } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      player.seek(20)
      player.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)
      pending.resolve(clipOf(18, 8))
      await flush()

      expect(player.status).toBe('idle')
      expect(play).not.toHaveBeenCalled()
      expect(heldWavs()).toBe(0)
      expect(player.playheadSeconds()).toBe(20)
    })

    it('decodes the moved 8 s when a drag of the playhead is dropped after the split moved', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.grabPlayhead()
      split.moveSplit(split.selectedSplit!.id, 21)

      player.dropPlayhead()
      await flush()

      expect(clip).toHaveBeenLastCalledWith(17, 8)
      expect(player.status).toBe('playing')
      expect(audio().currentTime).toBe(3.5)
    })
  })

  describe('the audition resets', () => {
    it('ends a paused audition, and lets go of its WAV, when the split is deselected', async () => {
      const { split, player } = await playing()
      player.toggle()

      split.moveZoomTo(30)

      expect(player.status).toBe('idle')
      expect(heldWavs()).toBe(0)
      expect(player.playheadSeconds()).toBeNull()
    })

    it('ends a paused audition, and lets go of its WAV, when the selected split is deleted', async () => {
      const { split, player } = await playing()
      player.toggle()

      split.deleteSplit(split.selectedSplit!.id)

      expect(player.status).toBe('idle')
      expect(heldWavs()).toBe(0)
      expect(player.playheadSeconds()).toBe(38)
    })

    it('stops when the split is deselected', async () => {
      const { split, player } = await playing()

      split.moveZoomTo(30)

      expect(player.status).toBe('idle')
    })

    it('stops when the selected split is deleted', async () => {
      const { split, player } = await playing()

      split.deleteSplit(split.selectedSplit!.id)

      expect(player.status).toBe('idle')
    })

    it('keeps playing when a setting changes, since it changes no split', async () => {
      const { split, player } = await playing()

      split.setMinimumGapLength(3)
      split.setSilenceThreshold(-30)

      expect(player.status).toBe('playing')
    })

    it('keeps playing when a split other than the selected one moves', async () => {
      const { split, player } = await playing()
      split.selectSplit(split.splits[1]!.id)
      player.toggle()
      await flush()
      expect(player.status).toBe('playing')

      split.moveSplit(split.splits[0]!.id, 22.5)

      expect(player.status).toBe('playing')
    })
  })

  describe('a trip to the Range view', () => {
    it('keeps the audition’s place through a trip to the Range view and back, with the same split selected', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.toggle()

      split.setRange(10, 30)
      player.stop()
      split.showView('split')

      expect(split.selectedSplit?.seconds).toBeCloseTo(22, 6)
      expect(player.playheadSeconds()).toBe(20.5)
    })

    it('keeps the audition’s place through a range played and left', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.toggle()
      split.setRange(10, 30)

      player.toggle()
      await flush()
      player.stop()
      expect(player.status).toBe('paused')

      split.showView('split')
      expect(player.playheadSeconds()).toBe(20.5)
    })
  })

  describe('the audition, the track and the range, which take the sound from each other', () => {
    it('lets go of the paused audition’s WAV when the range plays, and keeps its place', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.toggle()

      split.setRange(10, 30)
      player.toggle()
      await flush()
      split.showView('split')

      expect(player.status).toBe('idle')
      expect(player.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(1)
    })

    it('does not play the range on from a drop that grabbed the audition', async () => {
      const { split, player } = await playing()
      player.grabPlayhead()
      split.setRange(10, 30)
      player.toggle()
      await flush()
      player.toggle()
      play.mockClear()

      player.dropPlayhead()
      await flush()

      expect(player.status).toBe('paused')
      expect(play).not.toHaveBeenCalled()
    })

    it('lets go of a paused range for the audition, and plays the audition from its resting place', async () => {
      const { split, player } = await playing()
      audio().currentTime = 2.5
      player.toggle()
      split.setRange(10, 30)
      player.toggle()
      await flush()
      player.toggle()
      split.showView('split')

      player.toggle()
      await flush()

      expect(player.status).toBe('playing')
      expect(audio().currentTime).toBe(2.5)
      expect(heldWavs()).toBe(1)
      split.showView('range')
      expect(player.status).not.toBe('playing')
    })

    it('stops the range, keeping its playhead, and lets go of its clip, when the audition plays', async () => {
      const { split, player } = await playingRange()
      audio().currentTime = 4
      split.showView('split')

      player.toggle()

      expect(player.status).toBe('loading')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      split.showView('range')
      expect(player.status).toBe('idle')
      expect(player.playheadSeconds()).toBe(14)
    })

    it('lets go of a paused range’s clip when the audition plays', async () => {
      const { split, player } = await playingRange()
      player.toggle()
      split.showView('split')

      player.toggle()
      await flush()

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:clip-1')
      expect(player.status).toBe('playing')
      split.showView('range')
      expect(player.status).toBe('idle')
    })

    it('stops the audition, and lets go of its clip, when the range plays', async () => {
      const { split, player } = setUpRange()
      split.showView('split')
      player.toggle()
      await flush()
      expect(player.status).toBe('playing')

      split.showView('range')
      player.toggle()

      expect(player.status).toBe('loading')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      split.showView('split')
      expect(player.status).toBe('idle')
      expect(player.isActive).toBe(false)
    })

    it('decodes the range again after the audition took its clip away', async () => {
      const { split, player } = await playingRange()
      split.showView('split')
      player.toggle()
      await flush()

      split.showView('range')
      player.toggle()
      await flush()

      expect(clip).toHaveBeenCalledTimes(3)
      expect(clip).toHaveBeenLastCalledWith(10, 20)
      expect(player.status).toBe('playing')
    })

    it('stops the audition when a range is made while it plays', async () => {
      const { split, player } = setUp()
      player.toggle()
      await flush()

      split.setRange(10, 30)
      split.showView('split')

      expect(player.status).toBe('idle')
      expect(player.playheadSeconds()).toBe(18)
    })

    it('stops the audition when the track plays, and the track when the audition plays', async () => {
      const { split, player } = setUpTrack()
      split.selectSplit(split.splits[0]!.id)
      player.toggle()
      await flush()
      expect(player.status).toBe('playing')
      split.selectTrack(split.tracks[1]!)
      expect(heldWavs()).toBe(0)

      player.toggle()
      await flush()
      expect(player.status).toBe('playing')

      split.selectSplit(split.splits[0]!.id)
      expect(player.status).toBe('idle')
      expect(heldWavs()).toBe(0)
      player.toggle()
      await flush()
      expect(player.status).toBe('playing')
    })

    it('lets go of a held range WAV and decodes the track, whose playhead is its own start', async () => {
      const { split, player } = setUpTrack()
      split.setRange(10, 30)
      player.toggle()
      await flush()
      audio().currentTime = 5
      player.toggle()
      split.showView('track')

      // The range's resting place, 15 s, is no place in the track.
      expect(player.playheadSeconds()).toBe(22)
      player.toggle()
      await flush()

      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(clip).toHaveBeenLastCalledWith(22, 20)
      expect(audio().currentTime).toBe(0)
    })

    it('lets go of a held track WAV and decodes the range', async () => {
      const { split, player } = await playingTrack()
      player.toggle()
      split.setRange(10, 30)
      // A new range lets go of the stretch held, and the range plays on its own clip.
      player.toggle()
      await flush()

      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(clip).toHaveBeenLastCalledWith(10, 20)
    })

    it('keeps a playhead moved before the first play of the track while the range’s WAV is held', async () => {
      const { split, player } = setUpTrack()
      split.setRange(10, 30)
      player.toggle()
      await flush()
      player.toggle()
      split.showView('track')

      player.seek(30)
      player.toggle()
      await flush()

      expect(clip).toHaveBeenLastCalledWith(22, 20)
      expect(audio().currentTime).toBe(8)
    })
  })

  describe('the range', () => {
    it('decodes the new range, not the old one, on the next press', async () => {
      const { player, split } = await playingRange()
      split.setRange(40, 50)

      player.toggle()
      await flush()

      expect(clip).toHaveBeenLastCalledWith(40, 10)
      expect(clip).toHaveBeenCalledTimes(2)
    })

    it('lets go of the decoded range when the range is cleared', async () => {
      const { player, split } = await playingRange()

      split.reset()

      expect(player.status).toBe('idle')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(player.extent).toBeNull()
      expect(player.playheadSeconds()).toBeNull()
    })

    it('plays on when a split added at the mark shortens the selected track', async () => {
      const { player, split } = setUp()
      split.selectTrack(split.tracks[1]!)
      split.setRange(25, 40)
      player.toggle()
      await flush()
      audio().currentTime = 3
      split.placeMark(30)

      split.addSplitAtMark()

      expect(split.splits).toHaveLength(3)
      expect(player.status).toBe('playing')
      expect(revokeObjectURL).not.toHaveBeenCalled()
      expect(player.playheadSeconds()).toBe(28)
    })
  })

  describe('the track', () => {
    it('stops and lets go of the WAV when a split is selected', async () => {
      const { player, split } = await playingTrack()

      split.selectSplit(split.splits[0]!.id)

      expect(pause).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(player.status).toBe('idle')
    })

    it('stops and lets go of the WAV when the selected track’s start moves', async () => {
      const { player, split } = setUp()
      split.moveZoomTo(22)
      split.selectTrack(split.tracks[1]!)
      player.toggle()
      await flush()

      split.moveSplit(split.splits[0]!.id, 23)

      expect(player.status).toBe('idle')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(player.playheadSeconds()).toBe(23)
    })

    it('stops and lets go of the WAV when the selected track’s end moves', async () => {
      const { player, split } = setUp()
      split.moveZoomTo(42)
      split.selectTrack(split.tracks[1]!)
      player.toggle()
      await flush()

      split.moveSplit(split.splits[1]!.id, 43)

      expect(player.status).toBe('idle')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    })

    it('stops when a split at one of its ends is deleted, and the merged track starts at its own start', async () => {
      const { player, split } = await playingTrack()

      split.deleteSplit(split.splits[1]!.id)

      expect(player.status).toBe('idle')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(player.playheadSeconds()).toBe(22)
    })

    it('keeps playing when a split elsewhere moves', async () => {
      const { player, split } = setUp()
      split.moveZoomTo(42)
      split.selectTrack(split.tracks[0]!)
      player.toggle()
      await flush()

      split.moveSplit(split.splits[1]!.id, 43)

      expect(player.status).toBe('playing')
      expect(revokeObjectURL).not.toHaveBeenCalled()
    })

    it('stops and lets go of the WAV when a new range is drawn', async () => {
      const { split } = await playingTrack()

      split.setRange(40, 50)

      expect(pause).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    })

    it('lets go of the WAV when the page resets the store on unmount', async () => {
      const { player, split } = await playingTrack()

      player.stop()
      split.reset()

      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    })
  })

  describe('a long track, through a moving window', () => {
    // The track of 1000 s: windows of 600 s, so 0 s to 600 s and then 600 s to 1000 s.
    it('decodes the first 10 min from the playhead, and plays from its start', async () => {
      const { player } = setUpLongTrack()

      player.toggle()
      await flush()

      expect(clip).toHaveBeenCalledExactlyOnceWith(0, 600)
      expect(audio().currentTime).toBe(0)
      expect(player.playheadSeconds()).toBe(0)
    })

    it('decodes the window from a playhead moved before the first play', async () => {
      const { player } = setUpLongTrack()
      player.seek(250)

      player.toggle()
      await flush()

      expect(clip).toHaveBeenCalledExactlyOnceWith(250, 600)
      expect(audio().currentTime).toBe(0)
      expect(player.playheadSeconds()).toBe(250)
    })

    it('decodes only what is left when the playhead is near the end', async () => {
      const { player } = setUpLongTrack()
      player.seek(900)

      player.toggle()
      await flush()

      expect(clip).toHaveBeenCalledExactlyOnceWith(900, 100)
    })

    it('seeks inside the held window with no clip call', async () => {
      const { player } = await playingLongTrack()

      player.seek(300)

      expect(audio().currentTime).toBe(300)
      expect(player.status).toBe('playing')
      expect(clip).toHaveBeenCalledOnce()
    })

    it('decodes a new window from the seek point when the playing track is seeked outside it', async () => {
      const { player } = await playingLongTrack()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)

      player.seek(800)

      expect(clip).toHaveBeenLastCalledWith(800, 200)
      expect(player.status).toBe('loading')
      expect(player.playheadSeconds()).toBe(800)
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')

      pending.resolve(clipOf(800, 200))
      await flush()

      expect(player.status).toBe('playing')
      expect(audio().currentTime).toBe(0)
      expect(player.playheadSeconds()).toBe(800)
    })

    it('decodes a new window on Play when a paused track was seeked outside its window', async () => {
      const { player } = await playingLongTrack()
      player.toggle()

      player.seek(700)
      expect(clip).toHaveBeenCalledOnce()
      player.toggle()
      await flush()

      expect(clip).toHaveBeenLastCalledWith(700, 300)
      expect(player.status).toBe('playing')
      expect(player.playheadSeconds()).toBe(700)
    })

    it('resumes a paused track from its window, with no clip call, when the playhead is inside it', async () => {
      const { player } = await playingLongTrack()
      player.toggle()
      player.seek(450)

      player.toggle()
      await flush()

      expect(audio().currentTime).toBe(450)
      expect(clip).toHaveBeenCalledOnce()
    })

    it('plays from the window a playhead left outside it while the first clip was decoded', async () => {
      const { player } = setUpLongTrack()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      player.toggle()

      player.seek(800)
      pending.resolve(clipOf(0, 600))
      await flush()

      expect(clip).toHaveBeenLastCalledWith(800, 200)
      expect(player.status).toBe('playing')
      expect(player.playheadSeconds()).toBe(800)
    })

    it('ends the track, with no clip call, when the playing track is seeked to its very end', async () => {
      const { player } = await playingLongTrack()

      player.seek(1000)

      expect(player.status).toBe('idle')
      expect(player.playheadSeconds()).toBe(0)
      expect(clip).toHaveBeenCalledOnce()
    })

    it('plays from the track’s start when the playhead was left at its very end', async () => {
      const { player } = await playingLongTrack()
      player.toggle()
      player.seek(1000)

      player.toggle()
      await flush()

      expect(clip).toHaveBeenLastCalledWith(0, 600)
      expect(player.playheadSeconds()).toBe(0)
    })

    describe('and the window ahead', () => {
      it('is decoded when the playhead is 30 s from the end of the window, and not before', async () => {
        await playingLongTrack()

        timeUpdate(569)
        expect(clip).toHaveBeenCalledOnce()
        timeUpdate(570)

        expect(clip).toHaveBeenCalledTimes(2)
        expect(clip).toHaveBeenLastCalledWith(600, 400, expect.any(AbortSignal))
      })

      it('is asked for once', async () => {
        await playingLongTrack()

        timeUpdate(570)
        timeUpdate(580)
        await flush()
        timeUpdate(590)

        expect(clip).toHaveBeenCalledTimes(2)
      })

      it('is not asked for while the track is not playing', async () => {
        const { player } = await playingLongTrack()
        player.toggle()

        timeUpdate(590)

        expect(clip).toHaveBeenCalledOnce()
      })

      it('is never asked for by a track of 10 min or less', async () => {
        await playingTrack()

        timeUpdate(19)

        expect(clip).toHaveBeenCalledOnce()
      })

      it('is played on into when the window ends, with no clip call and no wait', async () => {
        const { player } = await playingLongTrack()
        timeUpdate(570)
        await flush()
        const played = play.mock.calls.length

        timeUpdate(600)
        audio().dispatchEvent(new Event('ended'))

        expect(player.status).toBe('playing')
        expect(audio().src).toBe('blob:clip-2')
        expect(audio().currentTime).toBe(0)
        expect(player.playheadSeconds()).toBe(600)
        expect(play).toHaveBeenCalledTimes(played + 1)
        expect(clip).toHaveBeenCalledTimes(2)
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
        audio().currentTime = 100
        expect(player.playheadSeconds()).toBe(700)
      })

      it('is asked for in turn: the window after it is decoded ahead of the hand-over', async () => {
        const longer = setUpLongTrack()
        longer.split.open(curveOf([LOUD, 40_000]), {
          windowSeconds: 0.05,
          durationSeconds: 2000,
        })
        longer.split.selectTrack(longer.split.tracks[0]!)
        longer.player.toggle()
        await flush()
        timeUpdate(570)
        await flush()
        timeUpdate(600)
        audio().dispatchEvent(new Event('ended'))

        timeUpdate(1170)

        expect(clip).toHaveBeenCalledTimes(3)
        expect(clip).toHaveBeenLastCalledWith(1200, 600, expect.any(AbortSignal))
      })

      it('ends the track after its last window, with the playhead back at the start', async () => {
        const { player } = await playingLongTrack()
        timeUpdate(570)
        await flush()
        timeUpdate(600)
        audio().dispatchEvent(new Event('ended'))

        audio().currentTime = 400
        audio().dispatchEvent(new Event('ended'))

        expect(player.status).toBe('idle')
        expect(player.playheadSeconds()).toBe(0)
        player.toggle()
        await flush()
        expect(clip).toHaveBeenLastCalledWith(0, 600)
      })

      it('holds at most two windows: the one playing and the one ahead', async () => {
        const { player } = await playingLongTrack()
        expect(heldWavs()).toBe(1)

        timeUpdate(570)
        await flush()
        expect(heldWavs()).toBe(2)
        player.toggle()
        player.toggle()
        expect(heldWavs()).toBe(2)

        timeUpdate(600)
        audio().dispatchEvent(new Event('ended'))
        expect(heldWavs()).toBe(1)
      })

      it('lets both windows go for a window from a seek outside them', async () => {
        const { player } = await playingLongTrack()
        timeUpdate(570)
        await flush()

        player.seek(900)
        await flush()

        expect(heldWavs()).toBe(1)
        expect(audio().src).toBe('blob:clip-3')
      })

      it('drops a window that arrives after the windows were let go of', async () => {
        const { player } = await playingLongTrack()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        timeUpdate(570)

        player.seek(900)
        await flush()
        pending.resolve(clipOf(600, 400))
        await flush()

        expect(createObjectURL).toHaveBeenCalledTimes(2)
        expect(heldWavs()).toBe(1)
        expect(player.status).toBe('playing')
      })

      it('stops its decode when the windows are let go of, so the seek’s window does not wait behind it', async () => {
        const { player } = await playingLongTrack()
        clip.mockReturnValueOnce(deferred<Clip>().promise)
        timeUpdate(570)
        const signal = clip.mock.lastCall?.[2]
        expect(signal?.aborted).toBe(false)

        player.seek(900)

        expect(signal?.aborted).toBe(true)
      })

      it('stops its decode on stop()', async () => {
        const { player } = await playingLongTrack()
        clip.mockReturnValueOnce(deferred<Clip>().promise)
        timeUpdate(570)
        const signal = clip.mock.lastCall?.[2]

        player.stop()

        expect(signal?.aborted).toBe(true)
        expect(player.status).toBe('paused')
      })

      it('lets go of a window ahead already decoded on stop(), and decodes it again on playing on', async () => {
        const { player } = await playingLongTrack()
        timeUpdate(570)
        await flush()
        expect(heldWavs()).toBe(2)

        player.stop()
        expect(heldWavs()).toBe(1)
        player.toggle()
        await flush()
        timeUpdate(575)

        expect(clip).toHaveBeenCalledTimes(3)
        expect(clip).toHaveBeenLastCalledWith(600, 400, expect.any(AbortSignal))
      })

      it('lets both windows go when a new range is made', async () => {
        const { split } = await playingLongTrack()
        timeUpdate(570)
        await flush()

        split.setRange(10, 30)

        expect(heldWavs()).toBe(0)
      })

      describe('when it is not decoded by the hand-over', () => {
        it('reads "decoding" until it arrives, then plays on from its start', async () => {
          const { player, pending } = await waitingForTheWindowAhead()
          expect(player.status).toBe('loading')
          expect(player.playheadSeconds()).toBe(600)

          pending.resolve(clipOf(600, 400))
          await flush()

          expect(player.status).toBe('playing')
          expect(audio().src).toBe('blob:clip-2')
          expect(player.playheadSeconds()).toBe(600)
          expect(clip).toHaveBeenCalledTimes(2)
        })

        it('is taken back by a press, and does not play when it arrives', async () => {
          const { player, pending } = await waitingForTheWindowAhead()
          const played = play.mock.calls.length

          player.toggle()
          pending.resolve(clipOf(600, 400))
          await flush()

          expect(player.status).toBe('idle')
          expect(play).toHaveBeenCalledTimes(played)
        })

        it('plays on from a place sought inside it meanwhile', async () => {
          const { player, pending } = await waitingForTheWindowAhead()

          player.seek(800)
          pending.resolve(clipOf(600, 400))
          await flush()

          expect(player.status).toBe('playing')
          expect(audio().currentTime).toBe(200)
          expect(player.playheadSeconds()).toBe(800)
        })

        it('decodes a window from a place sought outside it meanwhile', async () => {
          const { player, pending } = await waitingForTheWindowAhead()

          player.seek(300)
          pending.resolve(clipOf(600, 400))
          await flush()

          expect(clip).toHaveBeenLastCalledWith(300, 600)
          expect(player.status).toBe('playing')
          expect(player.playheadSeconds()).toBe(300)
          expect(heldWavs()).toBe(1)
        })
      })

      describe('failures', () => {
        it('stays quiet when decoding it fails, and decodes it again at the hand-over', async () => {
          const { player } = await playingLongTrack()
          clip.mockRejectedValueOnce(new Error('ffmpeg went away'))

          timeUpdate(570)
          await flush()
          expect(player.failure).toBeNull()
          expect(player.status).toBe('playing')
          timeUpdate(600)
          audio().dispatchEvent(new Event('ended'))
          await flush()

          expect(clip).toHaveBeenLastCalledWith(600, 400)
          expect(player.status).toBe('playing')
          expect(audio().src).toBe('blob:clip-2')
        })

        it('says why when the hand-over cannot decode it either', async () => {
          const { player } = await playingLongTrack()
          clip.mockRejectedValueOnce(new Error('ffmpeg went away'))
          timeUpdate(570)
          await flush()
          clip.mockRejectedValueOnce(new Error('still away'))

          timeUpdate(600)
          audio().dispatchEvent(new Event('ended'))
          await flush()

          expect(player.failure).toBe("Couldn't play this track: still away")
          expect(player.status).toBe('idle')
          expect(heldWavs()).toBe(0)
        })
      })
    })
  })

  /*
  The volume (docs/concepts/09-volume-is-gain.md): a level in dB, 0 to -40, and a mute flag, applied
  to the one element as a linear gain and kept in localStorage.
  */
  describe('volume', () => {
    it('starts at 0 dB and unmuted', () => {
      const { player } = setUp()

      expect(player.volumeDecibels).toBe(0)
      expect(player.isMuted).toBe(false)
    })

    it('gives a new element the gain of the level set before it was made', async () => {
      const { player } = setUp()
      player.setVolume(-20)

      player.toggle()
      await flush()

      expect(audio().volume).toBeCloseTo(0.1, 6)
      expect(audio().muted).toBe(false)
    })

    it('gives a new element full gain by default', async () => {
      await playing()

      expect(audio().volume).toBe(1)
    })

    it('changes the gain of sound that is already playing, at once', async () => {
      const { player } = await playing()

      player.setVolume(-6)
      expect(audio().volume).toBeCloseTo(0.5012, 4)

      player.setVolume(-40)
      expect(audio().volume).toBeCloseTo(0.01, 6)
      expect(player.status).toBe('playing')
    })

    it('changes the gain of a playing range and a playing track the same way', async () => {
      const range = await playingRange()
      range.player.setVolume(-10)
      expect(audio().volume).toBeCloseTo(0.3162, 4)
      range.player.stop()

      const track = await playingTrack()
      track.player.setVolume(-30)
      expect(audio().volume).toBeCloseTo(0.03162, 5)
    })

    it('mutes the element without touching its gain, and unmutes to the same level', async () => {
      const { player } = await playing()
      player.setVolume(-12)

      player.toggleMute()
      expect(player.isMuted).toBe(true)
      expect(audio().muted).toBe(true)
      expect(audio().volume).toBeCloseTo(0.2512, 4)
      expect(player.volumeDecibels).toBe(-12)

      player.toggleMute()
      expect(player.isMuted).toBe(false)
      expect(audio().muted).toBe(false)
      expect(audio().volume).toBeCloseTo(0.2512, 4)
    })

    it('keeps the level while muted, and the mute while the level changes', async () => {
      const { player } = await playing()

      player.toggleMute()
      player.setVolume(-3)

      expect(audio().muted).toBe(true)
      expect(audio().volume).toBeCloseTo(0.7079, 4)
    })

    it('holds the level to whole dB from -40 to 0', () => {
      const { player } = setUp()

      player.setVolume(-12.4)
      expect(player.volumeDecibels).toBe(-12)

      player.setVolume(-90)
      expect(player.volumeDecibels).toBe(-40)

      player.setVolume(6)
      expect(player.volumeDecibels).toBe(0)
    })

    it('ignores a level that is not a number, which the element would throw on', async () => {
      const { player } = await playing()
      player.setVolume(-12)

      player.setVolume(NaN)

      expect(player.volumeDecibels).toBe(-12)
      expect(audio().volume).toBeCloseTo(0.2512, 4)
    })

    it('keeps the level and the mute, so a store made later reads them back', () => {
      const first = setUp().player
      first.setVolume(-15)
      first.toggleMute()

      setActivePinia(createPinia())
      const second = usePlayerStore()

      expect(second.volumeDecibels).toBe(-15)
      expect(second.isMuted).toBe(true)
    })

    it('gives the element of a later store the saved gain and mute', async () => {
      const first = setUp().player
      first.setVolume(-20)
      first.toggleMute()

      // A new pinia has a new source-file store, whose clip is stubbed afresh.
      setActivePinia(createPinia())
      vi.spyOn(useSourceFileStore(), 'clip').mockImplementation(async (start, length) =>
        clipOf(start, length),
      )
      const later = setUp().player
      later.toggle()
      await flush()

      expect(audio().volume).toBeCloseTo(0.1, 6)
      expect(audio().muted).toBe(true)
    })

    it.each([
      ['no saved value', null],
      ['text that is no JSON', 'loud'],
      ['a level that is no whole number', '{"volumeDecibels":-12.5,"isMuted":false}'],
      ['a level under -40', '{"volumeDecibels":-41,"isMuted":false}'],
      ['a level over 0', '{"volumeDecibels":3,"isMuted":false}'],
      ['a level that is a string', '{"volumeDecibels":"-12","isMuted":false}'],
      ['a mute flag that is no boolean', '{"volumeDecibels":-12,"isMuted":"yes"}'],
      ['a value that is no object', '7'],
    ])('uses the defaults for %s', (_, saved) => {
      if (saved !== null) localStorage.setItem(VOLUME_STORAGE_KEY, saved)

      const { player } = setUp()

      expect(player.volumeDecibels).toBe(0)
      expect(player.isMuted).toBe(false)
    })

    it('uses the defaults, and still works, when the browser blocks storage', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlocked)
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlocked)

      const { player } = await playing()
      expect(player.volumeDecibels).toBe(0)
      expect(player.isMuted).toBe(false)

      player.setVolume(-10)
      player.toggleMute()

      expect(player.volumeDecibels).toBe(-10)
      expect(audio().volume).toBeCloseTo(0.3162, 4)
      expect(audio().muted).toBe(true)
    })
  })

  /*
  The play speed (docs/concepts/10-speed-without-pitch.md, docs/adr/0004-time-stretching-by-the-browser.md):
  0.5 to 2.0 in steps of 0.1, applied to the one element with the pitch kept. A new source resets an
  element's rate to its default rate, as the fake element does here as Chrome does.
  */
  describe('play speed', () => {
    it('starts at 1.0', () => {
      const { player } = setUp()

      expect(player.playSpeed).toBe(1)
    })

    it('gives a new element the play speed set before it was made, with the pitch kept', async () => {
      const { player } = setUp()
      player.setPlaySpeed(1.5)

      player.toggle()
      await flush()

      expect(audio().playbackRate).toBe(1.5)
      expect(audio().preservesPitch).toBe(true)
    })

    it('gives a new element the normal speed by default, with the pitch kept', async () => {
      await playing()

      expect(audio().playbackRate).toBe(1)
      expect(audio().preservesPitch).toBe(true)
    })

    it('changes the speed of sound that is already playing, at once and without a stop', async () => {
      const { player } = await playing()
      const played = play.mock.calls.length

      player.setPlaySpeed(2)
      expect(audio().playbackRate).toBe(2)

      player.setPlaySpeed(0.5)
      expect(audio().playbackRate).toBe(0.5)
      expect(audio().preservesPitch).toBe(true)
      expect(player.status).toBe('playing')
      expect(play).toHaveBeenCalledTimes(played)
      expect(pause).not.toHaveBeenCalled()
    })

    it('plays a range and a track at the play speed too', async () => {
      const range = await playingRange()
      range.player.setPlaySpeed(1.3)
      expect(audio().playbackRate).toBeCloseTo(1.3, 10)
      range.player.stop()

      const track = await playingTrack()
      expect(audio().playbackRate).toBeCloseTo(1.3, 10)
      track.player.setPlaySpeed(0.7)
      expect(audio().playbackRate).toBeCloseTo(0.7, 10)
      expect(audio().preservesPitch).toBe(true)
    })

    it('holds the speed to 0.5 to 2.0, in steps of 0.1', () => {
      const { player } = setUp()

      player.setPlaySpeed(1.26)
      expect(player.playSpeed).toBeCloseTo(1.3, 10)

      player.setPlaySpeed(1.24)
      expect(player.playSpeed).toBeCloseTo(1.2, 10)

      player.setPlaySpeed(0.3)
      expect(player.playSpeed).toBe(0.5)

      player.setPlaySpeed(-1)
      expect(player.playSpeed).toBe(0.5)

      player.setPlaySpeed(3)
      expect(player.playSpeed).toBe(2)
    })

    it('ignores a value that is not a number, and keeps the speed it had', async () => {
      const { player } = await playing()
      player.setPlaySpeed(1.5)

      player.setPlaySpeed(NaN)
      player.setPlaySpeed(Infinity)

      expect(player.playSpeed).toBe(1.5)
      expect(audio().playbackRate).toBe(1.5)
    })

    describe('survives a new source', () => {
      it('after a new clip: the audition played again', async () => {
        const { player } = await playing()
        player.setPlaySpeed(1.5)

        player.stop()
        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().playbackRate).toBe(1.5)
        expect(audio().preservesPitch).toBe(true)
      })

      it('after the audition gives way to a range', async () => {
        const { player, split } = await playing()
        player.setPlaySpeed(1.5)
        split.setRange(10, 30)

        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().playbackRate).toBe(1.5)
        expect(audio().preservesPitch).toBe(true)
      })

      it('after the held clip is released', async () => {
        const { player } = await playing()
        player.setPlaySpeed(1.8)

        player.stop()

        expect(audio().playbackRate).toBeCloseTo(1.8, 10)
      })

      it('after a new range, and after another track, replaces the held one', async () => {
        const range = await playingRange()
        range.player.setPlaySpeed(0.8)

        range.split.setRange(30, 50)
        range.player.toggle()
        await flush()
        expect(audio().playbackRate).toBeCloseTo(0.8, 10)

        range.split.selectTrack(range.split.tracks[2]!)
        range.player.stop()
        range.player.toggle()
        await flush()
        expect(audio().playbackRate).toBeCloseTo(0.8, 10)
      })

      it('after a seek of a long track outside the window held', async () => {
        const { player } = await playingLongTrack()
        player.setPlaySpeed(2)

        player.seek(800)
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().playbackRate).toBe(2)
        expect(audio().preservesPitch).toBe(true)
      })

      it('after a long track hands over to the window ahead', async () => {
        const { player } = await playingLongTrack()
        player.setPlaySpeed(1.7)
        timeUpdate(570)
        await flush()

        audio().dispatchEvent(new Event('ended'))
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().playbackRate).toBeCloseTo(1.7, 10)
        expect(audio().preservesPitch).toBe(true)
      })

      it('after the hand-over had to wait for its window to be decoded', async () => {
        const { player, pending } = await waitingForTheWindowAhead()
        player.setPlaySpeed(0.6)

        pending.resolve(clipOf(600, 400))
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().playbackRate).toBeCloseTo(0.6, 10)
      })

      it('after a pause and a play of the same track', async () => {
        const { player } = await playingTrack()
        player.setPlaySpeed(1.4)

        player.toggle()
        player.toggle()
        await flush()

        expect(player.status).toBe('playing')
        expect(audio().playbackRate).toBeCloseTo(1.4, 10)
      })
    })

    describe('kept between visits', () => {
      it('saves a change, so a store made later reads it back', () => {
        const first = setUp().player
        first.setPlaySpeed(1.3)

        setActivePinia(createPinia())
        const second = usePlayerStore()

        expect(second.playSpeed).toBeCloseTo(1.3, 10)
      })

      it('gives the element of a later store the saved play speed', async () => {
        const first = setUp().player
        first.setPlaySpeed(0.7)

        // A new pinia has a new source-file store, whose clip is stubbed afresh.
        setActivePinia(createPinia())
        vi.spyOn(useSourceFileStore(), 'clip').mockImplementation(async (start, length) =>
          clipOf(start, length),
        )
        const later = setUp().player
        later.toggle()
        await flush()

        expect(audio().playbackRate).toBeCloseTo(0.7, 10)
      })

      it.each([
        ['no saved value', null],
        ['text that is no JSON', 'fast'],
        ['a play speed off the 0.1 grid', '{"playSpeed":1.25}'],
        ['a play speed under 0.5', '{"playSpeed":0.4}'],
        ['a play speed over 2.0', '{"playSpeed":2.1}'],
        ['a play speed that is a string', '{"playSpeed":"1.5"}'],
        ['an object without a play speed', '{}'],
        ['a value that is no object', '1.5'],
      ])('starts at 1.0 for %s', (_, saved) => {
        if (saved !== null) localStorage.setItem(PLAY_SPEED_STORAGE_KEY, saved)

        const { player } = setUp()

        expect(player.playSpeed).toBe(1)
      })

      it('starts at 1.0, and still works, when the browser blocks storage', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlocked)
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlocked)

        const { player } = await playing()
        expect(player.playSpeed).toBe(1)

        player.setPlaySpeed(1.5)

        expect(player.playSpeed).toBe(1.5)
        expect(audio().playbackRate).toBe(1.5)
      })

      it('keeps its entry apart from the volume entry', () => {
        const first = setUp().player
        first.setPlaySpeed(1.5)
        expect(localStorage.getItem(VOLUME_STORAGE_KEY)).toBeNull()

        first.setVolume(-20)
        first.setPlaySpeed(0.8)
        first.toggleMute()

        setActivePinia(createPinia())
        const second = usePlayerStore()
        expect(second.playSpeed).toBeCloseTo(0.8, 10)
        expect(second.volumeDecibels).toBe(-20)
        expect(second.isMuted).toBe(true)
      })
    })

    it('is independent of the volume', async () => {
      const { player } = await playing()

      player.setPlaySpeed(1.5)
      player.setVolume(-20)
      expect(player.playSpeed).toBe(1.5)
      expect(player.volumeDecibels).toBe(-20)
      expect(audio().playbackRate).toBe(1.5)
      expect(audio().volume).toBeCloseTo(0.1, 6)

      player.setVolume(-6)
      expect(player.playSpeed).toBe(1.5)
      expect(audio().playbackRate).toBe(1.5)

      player.setPlaySpeed(0.5)
      expect(player.volumeDecibels).toBe(-6)
      expect(audio().volume).toBeCloseTo(0.5012, 4)

      player.toggleMute()
      expect(player.playSpeed).toBe(0.5)
    })
  })
})
