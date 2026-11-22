import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { VOLUME_STORAGE_KEY } from '../../config/volume.ts'
import { trackExtent } from '../../lib/track-extent.ts'
import { useAuditionStore } from '../audition.ts'

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

// The 8 s an audition of the first split, at 22 s, asks for: 4 s before to 4 s after.
const clipAroundFirstSplit = (): Clip => clipOf(18, 8)

async function playing() {
  const parts = setUp()
  parts.audition.toggle()
  await flush()
  expect(parts.audition.status).toBe('playing')
  return parts
}

// The range of 10 s to 30 s: 20 s of the file, and the split at 22 s inside it.
function setUpRange() {
  const parts = setUp()
  parts.split.setRange(10, 30)
  return parts
}

async function playingRange() {
  const parts = setUpRange()
  parts.audition.toggleStretch(rangeStretch())
  await flush()
  expect(parts.audition.stretchStatus).toBe('playing')
  return parts
}

// The range the split store holds, as the stretch the player is asked to play.
function rangeStretch() {
  return useSplitStore().range!
}

/*
The store with the second track selected, 22 s to 42 s, as the Track view shows it, and the stretch
the player is asked to play for it.
*/
function setUpTrack() {
  const parts = setUp()
  parts.split.selectTrack(parts.split.tracks[1]!)
  return parts
}

const trackStretchOfSelection = () => trackExtent(useSplitStore().selectedTrack!)

async function playingTrack() {
  const parts = setUpTrack()
  parts.audition.toggleStretch(trackStretchOfSelection())
  await flush()
  expect(parts.audition.stretchStatus).toBe('playing')
  return parts
}

// A file of 1000 s with no split: one track longer than the 10 min the player decodes at a time.
function setUpLongTrack() {
  const split = useSplitStore()
  split.detect(curveOf([LOUD, 20_000]), { windowSeconds: 0.05, durationSeconds: 1000 })
  split.selectTrack(split.tracks[0]!)
  return { split, audition: useAuditionStore() }
}

// The track of 1000 s from `setUpLongTrack`, as the stretch the player is asked to play.
const longStretch = () => trackExtent(useSplitStore().selectedTrack!)

async function playingLongTrack() {
  const parts = setUpLongTrack()
  parts.audition.toggleStretch(longStretch())
  await flush()
  expect(parts.audition.stretchStatus).toBe('playing')
  return parts
}

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

// A split at 100 s, so the audition is 96 s to 104 s: quiet from 98 s to 102 s in a file of 150 s.
function setUpAtHundred() {
  const split = useSplitStore()
  split.detect(curveOf([LOUD, 1960], [QUIET, 80], [LOUD, 960]), {
    windowSeconds: 0.05,
    durationSeconds: 150,
  })
  split.selectSplit(split.splits[0]!.id)
  expect(split.selectedSplit?.seconds).toBeCloseTo(100, 6)
  return { split, audition: useAuditionStore() }
}

async function setUpAtHundredPlaying() {
  const parts = setUpAtHundred()
  parts.audition.toggle()
  await flush()
  expect(parts.audition.status).toBe('playing')
  return parts
}

function setUp() {
  const split = useSplitStore()
  const curve = farGaps()
  split.detect(curve, { windowSeconds: 0.05, durationSeconds: 60 })
  // Detection opens on track 1; the clip around a split is for the zoom view's selected split.
  split.selectSplit(split.splits[0]!.id)
  return { split, audition: useAuditionStore() }
}

// Lets the promise callbacks the store waits on run.
const flush = () => new Promise((done) => setTimeout(done, 0))

// What localStorage does when the browser blocks it: every read and write throws.
function throwBlocked(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

describe('the audition store', () => {
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
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
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

  it('starts idle, with nothing failed', () => {
    const { audition } = setUp()

    expect(audition.status).toBe('idle')
    expect(audition.isActive).toBe(false)
    expect(audition.failure).toBeNull()
  })

  it('has its playhead at the start of the 8 s before the first play, and none without a selected split', () => {
    const { split, audition } = setUp()

    expect(audition.playheadSeconds()).toBe(18)

    split.moveZoomTo(30)
    expect(audition.playheadSeconds()).toBeNull()
  })

  it('holds the audition to the start of the file, so the playhead waits at 0 s', () => {
    // Quiet from 1 s to 5 s, so the only split is at 3 s.
    const split = useSplitStore()
    split.detect(curveOf([LOUD, 20], [QUIET, 80], [LOUD, 1100]), {
      windowSeconds: 0.05,
      durationSeconds: 60,
    })
    split.selectSplit(split.splits[0]!.id)

    expect(useAuditionStore().playheadSeconds()).toBe(0)
  })

  it('asks for the clip around the selected split and plays it as a WAV from its start', async () => {
    const { audition } = setUp()
    const pending = deferred<Clip>()
    clip.mockReturnValueOnce(pending.promise)

    audition.toggle()

    expect(clip).toHaveBeenCalledExactlyOnceWith(18, 8)
    expect(audition.status).toBe('loading')
    expect(audition.isActive).toBe(true)
    expect(play).not.toHaveBeenCalled()

    pending.resolve(clipAroundFirstSplit())
    await flush()

    expect(audition.status).toBe('playing')
    expect(audition.isActive).toBe(true)
    expect(play).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0]![0]
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(3)
    expect(audio().getAttribute('src')).toBe('blob:clip-1')
    expect(audio().currentTime).toBe(0)
  })

  it('asks for less than 8 s when the split is under 4 s from the start of the file', () => {
    // Quiet from 1 s to 5 s, so the only split is at 3 s.
    const split = useSplitStore()
    split.detect(curveOf([LOUD, 20], [QUIET, 80], [LOUD, 1100]), {
      windowSeconds: 0.05,
      durationSeconds: 60,
    })
    split.selectSplit(split.splits[0]!.id)
    const audition = useAuditionStore()

    audition.toggle()

    // 0 to 7 s: 4 s after the split, and only 3 s before it, because the file starts.
    expect(clip).toHaveBeenCalledExactlyOnceWith(0, 7)
  })

  it('still asks for 8 s when the split is under 4 s from the end of the file, which ffmpeg then cuts short', () => {
    // Quiet from 55 s to 59 s, so the only split is at 57 s, in a file of 60 s.
    const split = useSplitStore()
    split.detect(curveOf([LOUD, 1100], [QUIET, 80], [LOUD, 20]), {
      windowSeconds: 0.05,
      durationSeconds: 60,
    })
    split.selectSplit(split.splits[0]!.id)
    const audition = useAuditionStore()

    audition.toggle()

    expect(clip).toHaveBeenCalledExactlyOnceWith(53, 8)
  })

  it('does nothing without a selected split', () => {
    const { split, audition } = setUp()
    split.moveZoomTo(30)

    audition.toggle()

    expect(clip).not.toHaveBeenCalled()
    expect(audition.status).toBe('idle')
  })

  it('reports the playhead as the clip start plus the element time, within the clip', async () => {
    const { audition } = setUp()
    audition.toggle()
    await flush()

    audio().currentTime = 2.5
    expect(audition.playheadSeconds()).toBe(20.5)
    // The element can report a hair past the end before `ended` arrives.
    audio().currentTime = 8.01
    expect(audition.playheadSeconds()).toBe(26)
  })

  it('stops by itself when the clip ends', async () => {
    const { audition } = setUp()
    audition.toggle()
    await flush()

    audio().dispatchEvent(new Event('ended'))

    expect(audition.status).toBe('idle')
    expect(audition.playheadSeconds()).toBe(18)
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    expect(audio().hasAttribute('src')).toBe(false)
  })

  describe('pausing', () => {
    it('pauses on a second press while playing, with the playhead where the sound stopped', async () => {
      const { audition } = await playing()
      audio().currentTime = 2.5

      audition.toggle()

      expect(audition.status).toBe('paused')
      expect(audition.isActive).toBe(false)
      expect(pause).toHaveBeenCalled()
      expect(audition.playheadSeconds()).toBe(20.5)
    })

    it('resumes from the same time at once, without decoding the 8 s again', async () => {
      const { audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()

      audition.toggle()

      expect(audition.status).toBe('playing')
      expect(audio().currentTime).toBe(2.5)
      expect(play).toHaveBeenCalledTimes(2)
      expect(clip).toHaveBeenCalledOnce()
      expect(createObjectURL).toHaveBeenCalledOnce()
      expect(revokeObjectURL).not.toHaveBeenCalled()
    })

    it('plays again from the top after it played to its end, with the playhead back at the start', async () => {
      const { audition } = await playing()
      audio().currentTime = 7
      audition.toggle()
      audition.toggle()

      audio().dispatchEvent(new Event('ended'))

      expect(audition.status).toBe('idle')
      expect(audition.playheadSeconds()).toBe(18)

      audition.toggle()
      await flush()

      expect(audition.status).toBe('playing')
      expect(audio().currentTime).toBe(0)
    })

    it('reads "loading" until the clip arrives, and a press then takes it back for good', async () => {
      const { audition } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggle()
      expect(audition.isActive).toBe(true)

      audition.toggle()
      expect(audition.status).toBe('idle')
      pending.resolve(clipAroundFirstSplit())
      await flush()

      expect(audition.status).toBe('idle')
      expect(play).not.toHaveBeenCalled()
    })

    it('drops a clip still being decoded when the split moves', async () => {
      const { split, audition } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)
      pending.resolve(clipAroundFirstSplit())
      await flush()

      expect(play).not.toHaveBeenCalled()
      expect(audition.status).toBe('idle')
    })

    it('does not report the rejected play() of a press that was paused', async () => {
      const { audition } = setUp()
      const refused = deferred<void>()
      play.mockReturnValueOnce(refused.promise)
      audition.toggle()
      await flush()

      audition.toggle()
      refused.reject(new DOMException('The play() request was interrupted', 'AbortError'))
      await flush()

      expect(audition.status).toBe('paused')
      expect(audition.failure).toBeNull()
    })

    it('keeps the paused place while a stretch plays, and lets go of the WAV', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()

      audition.toggleStretch(trackExtent(split.tracks[1]!))
      await flush()

      expect(audition.status).toBe('idle')
      expect(audition.stretchStatus).toBe('playing')
      expect(audition.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(1)
    })

    it('lets go of a playing stretch for the audition, and plays the audition from its resting place', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()
      audition.toggleStretch(trackExtent(split.tracks[1]!))
      await flush()

      audition.toggleStretch(trackExtent(split.tracks[1]!))
      audition.toggle()
      await flush()

      expect(audition.status).toBe('playing')
      expect(audition.stretchStatus).not.toBe('playing')
      expect(audio().currentTime).toBe(2.5)
      expect(heldWavs()).toBe(1)
    })

    it('keeps the place across a view switch, which stops the sound', async () => {
      const { audition } = await playing()
      audio().currentTime = 2.5

      audition.stop()

      expect(audition.status).toBe('idle')
      expect(audition.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(0)

      audio().currentTime = 0
      audition.toggle()
      await flush()

      expect(audio().currentTime).toBe(2.5)
    })

    it('ends a paused audition on stop, keeping its place', async () => {
      const { audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()

      audition.stop()

      expect(audition.status).toBe('idle')
      expect(audition.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(0)
    })

    it('says "split" when the resumed 8 s cannot be played', async () => {
      const { audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()
      play.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))

      audition.toggle()
      await flush()

      expect(audition.status).toBe('idle')
      expect(audition.failure).toBe("Couldn't play this split: Not allowed")
    })
  })

  describe('the resting place', () => {
    it('is cleared when another split is selected', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()

      split.selectSplit(split.splits[1]!.id)
      expect(audition.status).toBe('idle')
      expect(audition.playheadSeconds()).toBe(38)

      split.selectSplit(split.splits[0]!.id)
      expect(audition.playheadSeconds()).toBe(18)
    })

    it('is cleared when no split is selected, and the playhead has no place', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()

      split.moveZoomTo(30)
      expect(audition.playheadSeconds()).toBeNull()

      split.selectSplit(split.splits[0]!.id)
      expect(audition.playheadSeconds()).toBe(18)
    })

    it('is cleared when the selected split is deleted', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()
      const firstId = split.splits[0]!.id

      split.deleteSplit(firstId)

      // The next split is selected, and its playhead waits at the start of its own 8 s.
      expect(audition.playheadSeconds()).toBe(38)
    })

    it('is held to the 8 s of the split when the split moves', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 7.5
      audition.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)

      expect(audition.status).toBe('paused')
      // 25.5 s in the file is past the moved 8 s, 17 s to 25 s, so it waits on the edge.
      expect(audition.playheadSeconds()).toBe(25)
    })
  })

  describe('moving the split', () => {
    it('pauses a playing audition where the sound was, and lets go of the WAV, whose 8 s moved', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5

      split.moveSplit(split.selectedSplit!.id, 21)

      expect(audition.status).toBe('paused')
      expect(audition.isActive).toBe(false)
      expect(pause).toHaveBeenCalled()
      expect(audition.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(0)
    })

    it('keeps a paused audition paused, with the place and without the WAV', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)

      expect(audition.status).toBe('paused')
      expect(audition.playheadSeconds()).toBe(20.5)
      expect(heldWavs()).toBe(0)
      expect(play).toHaveBeenCalledOnce()
    })

    it('resumes by decoding the moved 8 s, reading "Stop" meanwhile, and starts at the kept time', async () => {
      const { split, audition } = await setUpAtHundredPlaying()
      audio().currentTime = 3.5
      audition.toggle()

      split.moveSplit(split.selectedSplit!.id, 100.05)
      expect(audition.playheadSeconds()).toBeCloseTo(99.5, 6)
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggle()

      expect(audition.status).toBe('loading')
      expect(audition.isActive).toBe(true)
      expect(clip).toHaveBeenLastCalledWith(expect.closeTo(96.05, 6), 8)
      expect(play).toHaveBeenCalledOnce()

      pending.resolve(clipOf(96.05, 8))
      await flush()

      expect(audition.status).toBe('playing')
      // 99.50 s in a clip that starts at 96.05 s.
      expect(audio().currentTime).toBeCloseTo(3.45, 6)
      expect(audition.playheadSeconds()).toBeCloseTo(99.5, 6)
      expect(heldWavs()).toBe(1)
    })

    it('takes back a press that is decoding the moved 8 s, and drops its clip', async () => {
      const { split, audition } = await setUpAtHundredPlaying()
      audition.toggle()
      split.moveSplit(split.selectedSplit!.id, 100.05)
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggle()

      audition.toggle()
      pending.resolve(clipOf(96.05, 8))
      await flush()

      expect(audition.status).toBe('idle')
      expect(play).toHaveBeenCalledOnce()
      expect(heldWavs()).toBe(0)
    })

    it('takes back a press that is decoding when the split moves, keeping the playhead where it was put', async () => {
      const { split, audition } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.seekAudition(20)
      audition.toggle()

      split.moveSplit(split.selectedSplit!.id, 21)
      pending.resolve(clipAroundFirstSplit())
      await flush()

      expect(audition.status).toBe('idle')
      expect(play).not.toHaveBeenCalled()
      expect(heldWavs()).toBe(0)
      expect(audition.playheadSeconds()).toBe(20)
    })

    it('decodes the moved 8 s when a drag of the playhead is dropped after the split moved', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.grabAuditionPlayhead()
      split.moveSplit(split.selectedSplit!.id, 21)

      audition.dropAuditionPlayhead()
      await flush()

      expect(clip).toHaveBeenLastCalledWith(17, 8)
      expect(audition.status).toBe('playing')
      expect(audio().currentTime).toBe(3.5)
    })

    it('ends a paused audition, and lets go of its WAV, when another split is selected', async () => {
      const { split, audition } = await playing()
      audition.toggle()

      split.selectSplit(split.splits[1]!.id)

      expect(audition.status).toBe('idle')
      expect(heldWavs()).toBe(0)
    })

    it('ends a paused audition, and lets go of its WAV, when the selected split is deleted', async () => {
      const { split, audition } = await playing()
      audition.toggle()

      split.deleteSplit(split.selectedSplit!.id)

      expect(audition.status).toBe('idle')
      expect(heldWavs()).toBe(0)
      expect(audition.playheadSeconds()).toBe(38)
    })

    it('ends a paused audition, and lets go of its WAV, when the split is deselected', async () => {
      const { split, audition } = await playing()
      audition.toggle()

      split.moveZoomTo(30)

      expect(audition.status).toBe('idle')
      expect(heldWavs()).toBe(0)
      expect(audition.playheadSeconds()).toBeNull()
    })

    it('keeps the place through a trip to the Range view and back, with the same split selected', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()

      split.setRange(10, 30)
      audition.stop()
      split.showView('split')

      expect(split.selectedSplit?.seconds).toBeCloseTo(22, 6)
      expect(audition.playheadSeconds()).toBe(20.5)
    })

    it('keeps the place through a range played and left', async () => {
      const { split, audition } = await playing()
      audio().currentTime = 2.5
      audition.toggle()
      split.setRange(10, 30)

      audition.toggleStretch(rangeStretch())
      await flush()
      audition.stop()

      expect(audition.stretchStatus).toBe('paused')
      expect(audition.playheadSeconds()).toBe(20.5)
    })
  })

  describe('moving the playhead', () => {
    // The 8 s of the first split, at 22 s, are 18 s to 26 s.
    it('sets the sound inside the WAV while the audition plays, and goes on playing', async () => {
      const { audition } = await playing()
      const element = audio()
      play.mockClear()

      audition.seekAudition(22.5)

      expect(element.currentTime).toBe(4.5)
      expect(audition.status).toBe('playing')
      expect(audition.playheadSeconds()).toBe(22.5)
      expect(play).not.toHaveBeenCalled()
      expect(clip).toHaveBeenCalledOnce()
    })

    it('moves the playhead of a paused audition and leaves it paused, with Play starting there', async () => {
      const { audition } = await playing()
      audition.toggle()
      play.mockClear()

      audition.seekAudition(20)

      expect(audition.status).toBe('paused')
      expect(audition.playheadSeconds()).toBe(20)
      expect(play).not.toHaveBeenCalled()

      audition.toggle()
      await flush()

      expect(audition.status).toBe('playing')
      expect(audio().currentTime).toBe(2)
      expect(clip).toHaveBeenCalledOnce()
    })

    it('moves the playhead of an audition not yet played, and the first Play decodes it and starts there', async () => {
      const { audition } = setUp()

      audition.seekAudition(24)

      expect(audition.status).toBe('idle')
      expect(audition.playheadSeconds()).toBe(24)
      expect(clip).not.toHaveBeenCalled()

      audition.toggle()
      await flush()

      expect(audition.status).toBe('playing')
      expect(audio().currentTime).toBe(6)
    })

    it('sets where playback starts when the clip arrives, if moved during the decode', async () => {
      const { audition } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggle()

      audition.seekAudition(21)

      expect(audition.status).toBe('loading')
      expect(audition.playheadSeconds()).toBe(21)
      expect(play).not.toHaveBeenCalled()

      pending.resolve(clipAroundFirstSplit())
      await flush()

      expect(audition.status).toBe('playing')
      expect(audio().currentTime).toBe(3)
    })

    it('holds the playhead to the 8 s, whether it plays or not', async () => {
      const { audition } = setUp()

      audition.seekAudition(3)
      expect(audition.playheadSeconds()).toBe(18)

      audition.seekAudition(99)
      expect(audition.playheadSeconds()).toBe(26)

      audition.toggle()
      await flush()
      audition.seekAudition(99)
      expect(audio().currentTime).toBe(8)
      expect(audition.playheadSeconds()).toBe(26)

      audition.seekAudition(-5)
      expect(audio().currentTime).toBe(0)
      expect(audition.playheadSeconds()).toBe(18)
    })

    it('holds the playhead to the start of the file, where the 8 s are shorter', () => {
      // Quiet from 1 s to 5 s, so the only split is at 3 s and the 8 s start at 0 s.
      const split = useSplitStore()
      split.detect(curveOf([LOUD, 20], [QUIET, 80], [LOUD, 1100]), {
        windowSeconds: 0.05,
        durationSeconds: 60,
      })
      split.selectSplit(split.splits[0]!.id)
      const audition = useAuditionStore()

      audition.seekAudition(-2)

      expect(audition.playheadSeconds()).toBe(0)
    })

    it('holds the playhead to the end of the file, where the 8 s are shorter', () => {
      // Quiet from 55 s to 59 s, so the only split is at 57 s and the 8 s end at 60 s.
      const split = useSplitStore()
      split.detect(curveOf([LOUD, 1100], [QUIET, 80], [LOUD, 20]), {
        windowSeconds: 0.05,
        durationSeconds: 60,
      })
      split.selectSplit(split.splits[0]!.id)
      const audition = useAuditionStore()

      audition.seekAudition(99)

      expect(audition.playheadSeconds()).toBe(60)
    })

    it('does nothing without a selected split', () => {
      const { split, audition } = setUp()
      split.moveZoomTo(30)

      audition.seekAudition(20)
      audition.backToAuditionStart()
      split.selectSplit(split.splits[0]!.id)

      expect(audition.playheadSeconds()).toBe(18)
    })

    describe('back to the start', () => {
      it('moves a playing audition to its start and keeps it playing', async () => {
        const { audition } = await playing()
        const element = audio()
        element.currentTime = 6
        play.mockClear()

        audition.backToAuditionStart()

        expect(element.currentTime).toBe(0)
        expect(audition.status).toBe('playing')
        expect(audition.playheadSeconds()).toBe(18)
        expect(play).not.toHaveBeenCalled()
      })

      it('moves a paused audition to its start and leaves it paused', async () => {
        const { audition } = await playing()
        audio().currentTime = 6
        audition.toggle()
        expect(audition.playheadSeconds()).toBe(24)

        audition.backToAuditionStart()

        expect(audition.status).toBe('paused')
        expect(audition.playheadSeconds()).toBe(18)
      })
    })

    describe('pausing for a drag', () => {
      it('pauses a playing audition on the grab and plays it on from the drop', async () => {
        const { audition } = await playing()
        play.mockClear()

        audition.grabAuditionPlayhead()
        expect(audition.status).toBe('paused')

        audition.seekAudition(20)
        audition.seekAudition(24)
        expect(audition.status).toBe('paused')
        expect(audition.playheadSeconds()).toBe(24)
        expect(play).not.toHaveBeenCalled()

        audition.dropAuditionPlayhead()
        await flush()

        expect(audition.status).toBe('playing')
        expect(audio().currentTime).toBe(6)
        expect(play).toHaveBeenCalledOnce()
        expect(clip).toHaveBeenCalledOnce()
      })

      it('leaves a paused audition paused after the drop', async () => {
        const { audition } = await playing()
        audition.toggle()
        play.mockClear()

        audition.grabAuditionPlayhead()
        audition.seekAudition(20)
        audition.dropAuditionPlayhead()
        await flush()

        expect(audition.status).toBe('paused')
        expect(audition.playheadSeconds()).toBe(20)
        expect(play).not.toHaveBeenCalled()
      })

      it('leaves an idle audition idle, and one still decoding decoding', async () => {
        const { audition } = setUp()
        audition.grabAuditionPlayhead()
        audition.seekAudition(20)
        audition.dropAuditionPlayhead()
        expect(audition.status).toBe('idle')
        expect(clip).not.toHaveBeenCalled()

        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggle()
        audition.grabAuditionPlayhead()
        audition.seekAudition(21)
        audition.dropAuditionPlayhead()

        expect(audition.status).toBe('loading')
        pending.resolve(clipAroundFirstSplit())
        await flush()
        expect(audio().currentTime).toBe(3)
      })

      it('does not play on when a stretch took over during the drag', async () => {
        const { audition, split } = await playing()
        audition.grabAuditionPlayhead()
        split.setRange(10, 30)
        audition.toggleStretch(rangeStretch())
        await flush()
        audition.toggleStretch(rangeStretch())
        play.mockClear()

        audition.dropAuditionPlayhead()
        await flush()

        expect(audition.status).toBe('idle')
        expect(audition.stretchStatus).toBe('paused')
        expect(play).not.toHaveBeenCalled()
      })

      it('does not play on when another split was selected during the drag', async () => {
        const { audition, split } = await playing()
        audition.grabAuditionPlayhead()
        play.mockClear()

        split.selectSplit(split.splits[1]!.id)
        audition.dropAuditionPlayhead()
        await flush()

        expect(audition.status).toBe('idle')
        expect(play).not.toHaveBeenCalled()
      })

      it('does not play on a second time from a drop with no grab', async () => {
        const { audition } = await playing()
        audition.grabAuditionPlayhead()
        audition.dropAuditionPlayhead()
        audition.toggle()
        play.mockClear()

        audition.dropAuditionPlayhead()
        await flush()

        expect(audition.status).toBe('paused')
        expect(play).not.toHaveBeenCalled()
      })
    })
  })

  it('drops the pending clip when pressed again while loading', async () => {
    const { audition } = setUp()
    const pending = deferred<Clip>()
    clip.mockReturnValueOnce(pending.promise)
    audition.toggle()

    audition.toggle()
    expect(audition.status).toBe('idle')

    pending.resolve(clipAroundFirstSplit())
    await flush()

    expect(play).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(audition.status).toBe('idle')
  })

  it('never plays a stale clip after a later press', async () => {
    const { audition } = setUp()
    const first = deferred<Clip>()
    const second = deferred<Clip>()
    clip.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    audition.toggle() // press 1, loading
    audition.toggle() // stop
    audition.toggle() // press 2, loading
    first.resolve(clipAroundFirstSplit())
    await flush()

    expect(audition.status).toBe('loading')
    expect(play).not.toHaveBeenCalled()

    second.resolve(clipAroundFirstSplit())
    await flush()

    expect(audition.status).toBe('playing')
    expect(play).toHaveBeenCalledOnce()
    expect(createObjectURL).toHaveBeenCalledOnce()
  })

  it('revokes the previous clip when the next press starts playing', async () => {
    const { audition } = setUp()
    audition.toggle()
    await flush()
    audition.stop()
    audition.toggle()
    await flush()

    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    expect(audio().getAttribute('src')).toBe('blob:clip-2')
  })

  describe('stop rules', () => {
    it('stops when another split is selected', async () => {
      const { split, audition } = await playing()

      split.selectSplit(split.splits[1]!.id)

      expect(audition.status).toBe('idle')
    })

    it('stops when the split is deselected', async () => {
      const { split, audition } = await playing()

      split.moveZoomTo(30)

      expect(audition.status).toBe('idle')
    })

    it('stops when the selected split is deleted', async () => {
      const { split, audition } = await playing()

      split.deleteSplit(split.selectedSplit!.id)

      expect(audition.status).toBe('idle')
    })

    it('stops when a setting change re-selects split 1 at another time', async () => {
      const { split, audition } = await playing()

      split.setMinimumGapLength(3)
      split.setSilenceThreshold(-30)

      expect(audition.status).toBe('idle')
    })

    it('keeps playing when a split other than the selected one moves', async () => {
      const { split, audition } = await playing()
      split.selectSplit(split.splits[1]!.id)
      audition.toggle()
      await flush()
      expect(audition.status).toBe('playing')

      split.moveSplit(split.splits[0]!.id, 22.5)

      expect(audition.status).toBe('playing')
    })

    it('discards a pending clip when the selection changes before it arrives', async () => {
      const { split, audition } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggle()

      split.selectSplit(split.splits[1]!.id)
      expect(audition.status).toBe('idle')
      pending.resolve(clipAroundFirstSplit())
      await flush()

      expect(play).not.toHaveBeenCalled()
      expect(audition.status).toBe('idle')
    })
  })

  describe('failures', () => {
    it('says why the clip could not be made and goes idle', async () => {
      const { audition } = setUp()
      clip.mockRejectedValueOnce(new Error('Invalid data found'))

      audition.toggle()
      await flush()

      expect(audition.status).toBe('idle')
      expect(audition.failure).toBe("Couldn't play this split: Invalid data found")
    })

    it('stays silent when the file was replaced before the clip was ready', async () => {
      const { audition } = setUp()
      clip.mockRejectedValueOnce(new FileReplacedError())

      audition.toggle()
      await flush()

      expect(audition.status).toBe('idle')
      expect(audition.failure).toBeNull()
    })

    it('ignores the failure of a press that was stopped', async () => {
      const { audition } = setUp()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggle()
      audition.toggle()

      pending.reject(new Error('Invalid data found'))
      await flush()

      expect(audition.failure).toBeNull()
    })

    it('treats a refused play() as a failure and lets go of the clip', async () => {
      const { audition } = setUp()
      play.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))

      audition.toggle()
      await flush()

      expect(audition.status).toBe('idle')
      expect(audition.failure).toBe("Couldn't play this split: Not allowed")
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    })

    it('clears the failure on the next press', async () => {
      const { audition } = setUp()
      clip.mockRejectedValueOnce(new Error('Invalid data found'))
      audition.toggle()
      await flush()

      audition.toggle()

      expect(audition.failure).toBeNull()
      expect(audition.status).toBe('loading')
    })

    it('clears the failure on stop', async () => {
      const { audition } = setUp()
      clip.mockRejectedValueOnce(new Error('Invalid data found'))
      audition.toggle()
      await flush()

      audition.stop()

      expect(audition.failure).toBeNull()
    })
  })

  describe('playing the range', () => {
    it('starts with the playhead at the start of the range and nothing playing', () => {
      const { audition } = setUpRange()

      expect(audition.stretchStatus).toBe('idle')
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(10)
    })

    it('asks for the range’s start and length and plays the WAV from its start', async () => {
      const { audition } = setUpRange()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)

      audition.toggleStretch(rangeStretch())

      expect(clip).toHaveBeenCalledExactlyOnceWith(10, 20)
      expect(audition.stretchStatus).toBe('loading')
      expect(play).not.toHaveBeenCalled()

      pending.resolve(clipOf(10, 20))
      await flush()

      expect(audition.stretchStatus).toBe('playing')
      expect(play).toHaveBeenCalledOnce()
      expect(createObjectURL.mock.calls[0]![0].type).toBe('audio/wav')
      expect(audio().currentTime).toBe(0)
    })

    it('leaves the split audition’s state alone', async () => {
      const { audition } = await playingRange()

      expect(audition.status).toBe('idle')
      expect(audition.isActive).toBe(false)
      expect(audition.playheadSeconds()).toBe(18)
    })

    it('puts the playhead at the clip start plus the element time, within the clip', async () => {
      const { audition } = await playingRange()

      audio().currentTime = 4.5
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(14.5)
      // The element can report a hair past the end before `ended` arrives.
      audio().currentTime = 20.01
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(30)
    })

    it('pauses on a second press, and the playhead holds where the sound stopped', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 4
      pause.mockClear()

      audition.toggleStretch(rangeStretch())
      // The element's clock keeps whatever it had; the playhead must not follow it any more.
      audio().currentTime = 9

      expect(audition.stretchStatus).toBe('paused')
      expect(pause).toHaveBeenCalled()
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(14)
      expect(revokeObjectURL).not.toHaveBeenCalled()
    })

    it('resumes from the playhead at once, without decoding the range again', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 4
      audition.toggleStretch(rangeStretch())

      audition.toggleStretch(rangeStretch())
      await flush()

      expect(audition.stretchStatus).toBe('playing')
      expect(clip).toHaveBeenCalledOnce()
      expect(createObjectURL).toHaveBeenCalledOnce()
      expect(play).toHaveBeenCalledTimes(2)
      expect(audio().currentTime).toBe(4)
    })

    it('stops at the end of the range, with the playhead back at its start', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 20

      audio().dispatchEvent(new Event('ended'))

      expect(audition.stretchStatus).toBe('idle')
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(10)
    })

    it('plays the range again from its start after the end, without decoding again', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 20
      audio().dispatchEvent(new Event('ended'))

      audition.toggleStretch(rangeStretch())
      await flush()

      expect(audition.stretchStatus).toBe('playing')
      expect(clip).toHaveBeenCalledOnce()
      expect(audio().currentTime).toBe(0)
    })

    it('releases the held WAV and decodes again for a different stretch, from its start', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 4
      audition.toggleStretch(rangeStretch())
      expect(audition.stretchStatus).toBe('paused')

      const other = { startSeconds: 12, endSeconds: 18 }
      audition.toggleStretch(other)
      await flush()

      expect(clip).toHaveBeenCalledTimes(2)
      expect(clip).toHaveBeenLastCalledWith(12, 6)
      expect(revokeObjectURL).toHaveBeenCalledOnce()
      expect(audition.stretchStatus).toBe('playing')
      expect(audio().currentTime).toBe(0)
    })

    it('reads "stop" while decoding: a press then takes it back and the clip is dropped', async () => {
      const { audition } = setUpRange()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggleStretch(rangeStretch())

      audition.toggleStretch(rangeStretch())
      expect(audition.stretchStatus).toBe('idle')

      pending.resolve(clipOf(10, 20))
      await flush()

      expect(play).not.toHaveBeenCalled()
      expect(createObjectURL).not.toHaveBeenCalled()
      expect(audition.stretchStatus).toBe('idle')
    })

    it('drops a clip that arrives after a new range was drawn', async () => {
      const { audition, split } = setUpRange()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggleStretch(rangeStretch())

      split.setRange(40, 50)
      pending.resolve(clipOf(10, 20))
      await flush()

      expect(play).not.toHaveBeenCalled()
      expect(audition.stretchStatus).toBe('idle')
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(40)
    })

    it('stops and lets go of the decoded range when a new range is drawn', async () => {
      const { audition, split } = await playingRange()
      audio().currentTime = 4

      split.setRange(40, 50)

      expect(audition.stretchStatus).toBe('idle')
      expect(pause).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(40)
    })

    it('decodes the new range, not the old one, on the next press', async () => {
      const { audition, split } = await playingRange()
      split.setRange(40, 50)

      audition.toggleStretch(rangeStretch())
      await flush()

      expect(clip).toHaveBeenLastCalledWith(40, 10)
      expect(clip).toHaveBeenCalledTimes(2)
    })

    it('lets go of the decoded range when the range is cleared', async () => {
      const { audition, split } = await playingRange()

      split.reset()

      expect(audition.stretchStatus).toBe('idle')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      // The playhead of a stretch with no place kept is its start.
      expect(audition.stretchPlayheadSeconds({ startSeconds: 10, endSeconds: 30 })).toBe(10)
    })

    describe('stop()', () => {
      it('pauses a playing range where it is, keeping the decoded range', async () => {
        const { audition } = await playingRange()
        audio().currentTime = 6

        audition.stop()

        expect(audition.stretchStatus).toBe('paused')
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(16)
        expect(revokeObjectURL).not.toHaveBeenCalled()
      })

      it('takes back a range that is still decoding', async () => {
        const { audition } = setUpRange()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggleStretch(rangeStretch())

        audition.stop()
        pending.resolve(clipOf(10, 20))
        await flush()

        expect(audition.stretchStatus).toBe('idle')
        expect(play).not.toHaveBeenCalled()
      })

      it('leaves a paused range paused, and an idle one idle', async () => {
        const { audition } = await playingRange()
        audition.toggleStretch(rangeStretch())

        audition.stop()
        expect(audition.stretchStatus).toBe('paused')

        const idle = setUpRange().audition
        idle.stop()
        expect(idle.stretchStatus).toBe('idle')
      })
    })

    describe('moving the playhead', () => {
      it('seeks inside the WAV while the range plays, and goes on playing', async () => {
        const { audition } = await playingRange()
        const element = audio()
        play.mockClear()

        audition.seekStretch(rangeStretch(), 25)

        // The WAV starts at the range's start, 10 s: the place is an offset in it.
        expect(element.currentTime).toBe(15)
        expect(audition.stretchStatus).toBe('playing')
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(25)
        expect(play).not.toHaveBeenCalled()
        expect(clip).toHaveBeenCalledOnce()
      })

      it('moves the playhead of a paused range and leaves it paused, with Play starting there', async () => {
        const { audition } = await playingRange()
        audition.toggleStretch(rangeStretch())
        play.mockClear()

        audition.seekStretch(rangeStretch(), 12.5)

        expect(audition.stretchStatus).toBe('paused')
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(12.5)
        expect(play).not.toHaveBeenCalled()

        audition.toggleStretch(rangeStretch())
        await flush()

        expect(audio().currentTime).toBe(2.5)
        expect(clip).toHaveBeenCalledOnce()
      })

      it('moves the playhead of a range not yet played, and the first Play decodes it and starts there', async () => {
        const { audition } = setUpRange()

        audition.seekStretch(rangeStretch(), 20)

        expect(audition.stretchStatus).toBe('idle')
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(20)
        expect(clip).not.toHaveBeenCalled()

        audition.toggleStretch(rangeStretch())
        await flush()

        expect(audition.stretchStatus).toBe('playing')
        expect(audio().currentTime).toBe(10)
      })

      it('sets where playback starts when the clip arrives, if moved during the decode', async () => {
        const { audition } = setUpRange()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggleStretch(rangeStretch())

        audition.seekStretch(rangeStretch(), 16)

        expect(audition.stretchStatus).toBe('loading')
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(16)
        expect(play).not.toHaveBeenCalled()

        pending.resolve(clipOf(10, 20))
        await flush()

        expect(audition.stretchStatus).toBe('playing')
        expect(audio().currentTime).toBe(6)
      })

      it('plays from the start when the playhead was left at the very end', async () => {
        const { audition } = await playingRange()
        audition.toggleStretch(rangeStretch())
        audition.seekStretch(rangeStretch(), 30)
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(30)

        audition.toggleStretch(rangeStretch())
        await flush()

        expect(audition.stretchStatus).toBe('playing')
        expect(audio().currentTime).toBe(0)
      })

      it('holds the playhead to the range', async () => {
        const { audition } = setUpRange()

        audition.seekStretch(rangeStretch(), 3)
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(10)

        audition.seekStretch(rangeStretch(), 99)
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(30)
      })

      describe('back to the start', () => {
        it('moves a playing range to its start and keeps it playing', async () => {
          const { audition } = await playingRange()
          const element = audio()
          element.currentTime = 9
          play.mockClear()

          audition.backToStretchStart(rangeStretch())

          expect(element.currentTime).toBe(0)
          expect(audition.stretchStatus).toBe('playing')
          expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(10)
          expect(play).not.toHaveBeenCalled()
        })

        it('moves a paused range to its start and leaves it paused', async () => {
          const { audition } = await playingRange()
          audio().currentTime = 9
          audition.toggleStretch(rangeStretch())

          audition.backToStretchStart(rangeStretch())

          expect(audition.stretchStatus).toBe('paused')
          expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(10)
        })
      })

      describe('pausing for a drag', () => {
        it('pauses a playing range on the grab and resumes it from the drop', async () => {
          const { audition } = await playingRange()
          play.mockClear()

          audition.grabPlayhead()
          expect(audition.stretchStatus).toBe('paused')

          audition.seekStretch(rangeStretch(), 18)
          audition.seekStretch(rangeStretch(), 22)
          expect(audition.stretchStatus).toBe('paused')
          expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(22)
          expect(play).not.toHaveBeenCalled()

          audition.dropPlayhead(rangeStretch())
          await flush()

          expect(audition.stretchStatus).toBe('playing')
          expect(audio().currentTime).toBe(12)
          expect(play).toHaveBeenCalledOnce()
          expect(clip).toHaveBeenCalledOnce()
        })

        it('leaves a paused range paused after the drop', async () => {
          const { audition } = await playingRange()
          audition.toggleStretch(rangeStretch())
          play.mockClear()

          audition.grabPlayhead()
          audition.seekStretch(rangeStretch(), 20)
          audition.dropPlayhead(rangeStretch())
          await flush()

          expect(audition.stretchStatus).toBe('paused')
          expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(20)
          expect(play).not.toHaveBeenCalled()
        })

        it('leaves an idle range idle, and one still decoding decoding', async () => {
          const { audition } = setUpRange()
          audition.grabPlayhead()
          audition.seekStretch(rangeStretch(), 15)
          audition.dropPlayhead(rangeStretch())
          expect(audition.stretchStatus).toBe('idle')

          const pending = deferred<Clip>()
          clip.mockReturnValueOnce(pending.promise)
          audition.toggleStretch(rangeStretch())
          audition.grabPlayhead()
          audition.seekStretch(rangeStretch(), 18)
          audition.dropPlayhead(rangeStretch())

          expect(audition.stretchStatus).toBe('loading')
          pending.resolve(clipOf(10, 20))
          await flush()
          expect(audio().currentTime).toBe(8)
        })

        it('does not resume a range that a new range replaced during the drag', async () => {
          const { audition, split } = await playingRange()
          audition.grabPlayhead()
          play.mockClear()

          split.setRange(30, 40)
          audition.dropPlayhead(rangeStretch())
          await flush()

          expect(audition.stretchStatus).toBe('idle')
          expect(play).not.toHaveBeenCalled()
        })

        it('does not resume a second time from a drop with no grab', async () => {
          const { audition } = await playingRange()
          audition.grabPlayhead()
          audition.dropPlayhead(rangeStretch())
          audition.toggleStretch(rangeStretch())
          play.mockClear()

          audition.dropPlayhead(rangeStretch())
          await flush()

          expect(audition.stretchStatus).toBe('paused')
          expect(play).not.toHaveBeenCalled()
        })
      })
    })

    it('plays on when a split added at the mark shortens the selected track', async () => {
      const { audition, split } = setUp()
      split.selectTrack(split.tracks[1]!)
      split.setRange(25, 40)
      audition.toggleStretch(rangeStretch())
      await flush()
      audio().currentTime = 3
      split.placeMark(30)

      split.addSplitAtMark()

      expect(split.splits).toHaveLength(3)
      expect(audition.stretchStatus).toBe('playing')
      expect(revokeObjectURL).not.toHaveBeenCalled()
      expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(28)
    })

    describe('and the split audition, which stop each other', () => {
      it('stops the range, keeping its playhead, and lets go of its clip, when the audition plays', async () => {
        const { audition } = await playingRange()
        audio().currentTime = 4

        audition.toggle()

        expect(audition.stretchStatus).toBe('idle')
        expect(audition.status).toBe('loading')
        expect(audition.stretchPlayheadSeconds(rangeStretch())).toBe(14)
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('lets go of a paused range’s clip when the audition plays', async () => {
        const { audition } = await playingRange()
        audition.toggleStretch(rangeStretch())

        audition.toggle()
        await flush()

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:clip-1')
        expect(audition.status).toBe('playing')
        expect(audition.stretchStatus).toBe('idle')
      })

      it('stops the audition, and lets go of its clip, when the range plays', async () => {
        const { audition } = setUpRange()
        audition.toggle()
        await flush()
        expect(audition.status).toBe('playing')

        audition.toggleStretch(rangeStretch())

        expect(audition.status).toBe('idle')
        expect(audition.isActive).toBe(false)
        expect(audition.stretchStatus).toBe('loading')
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('decodes the range again after the audition took its clip away', async () => {
        const { audition } = await playingRange()
        audition.toggle()
        await flush()

        audition.toggleStretch(rangeStretch())
        await flush()

        expect(clip).toHaveBeenCalledTimes(3)
        expect(clip).toHaveBeenLastCalledWith(10, 20)
        expect(audition.stretchStatus).toBe('playing')
      })

      it('stops the audition when a range is made while it plays', async () => {
        const { audition, split } = setUp()
        audition.toggle()
        await flush()

        split.setRange(10, 30)

        expect(audition.status).toBe('idle')
        expect(audition.playheadSeconds()).toBe(18)
      })
    })

    describe('failures', () => {
      it('says why the range could not be made and goes idle', async () => {
        const { audition } = setUpRange()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))

        audition.toggleStretch(rangeStretch())
        await flush()

        expect(audition.stretchStatus).toBe('idle')
        expect(audition.failure).toBe("Couldn't play this range: Invalid data found")
      })

      it('stays silent when the file was replaced before the range was ready', async () => {
        const { audition } = setUpRange()
        clip.mockRejectedValueOnce(new FileReplacedError())

        audition.toggleStretch(rangeStretch())
        await flush()

        expect(audition.stretchStatus).toBe('idle')
        expect(audition.failure).toBeNull()
      })

      it('ignores the failure of a press that was taken back', async () => {
        const { audition } = setUpRange()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggleStretch(rangeStretch())
        audition.toggleStretch(rangeStretch())

        pending.reject(new Error('Invalid data found'))
        await flush()

        expect(audition.failure).toBeNull()
      })

      it('treats a refused play() as a failure and lets go of the clip', async () => {
        const { audition } = setUpRange()
        play.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))

        audition.toggleStretch(rangeStretch())
        await flush()

        expect(audition.stretchStatus).toBe('idle')
        expect(audition.failure).toBe("Couldn't play this range: Not allowed")
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('clears the failure on the next press', async () => {
        const { audition } = setUpRange()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))
        audition.toggleStretch(rangeStretch())
        await flush()

        audition.toggleStretch(rangeStretch())

        expect(audition.failure).toBeNull()
        expect(audition.stretchStatus).toBe('loading')
      })

      it('clears the failure when a new range is drawn', async () => {
        const { audition, split } = setUpRange()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))
        audition.toggleStretch(rangeStretch())
        await flush()
        expect(audition.failure).not.toBeNull()

        split.setRange(40, 50)

        expect(audition.failure).toBeNull()
      })
    })
  })

  describe('playing a track', () => {
    it('asks for the track’s start and length and plays the WAV from its start', async () => {
      const { audition } = setUpTrack()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)

      audition.toggleStretch(trackStretchOfSelection())

      expect(clip).toHaveBeenCalledExactlyOnceWith(22, 20)
      expect(audition.stretchStatus).toBe('loading')

      pending.resolve(clipOf(22, 20))
      await flush()

      expect(audition.stretchStatus).toBe('playing')
      expect(audio().currentTime).toBe(0)
      expect(audition.stretchPlayheadSeconds(trackStretchOfSelection())).toBe(22)
    })

    it('decodes a track of 10 min or less once: pause, resume and seek make no second clip call', async () => {
      const { audition } = await playingTrack()
      const stretch = trackStretchOfSelection()

      audition.seekStretch(stretch, 30)
      expect(audio().currentTime).toBe(8)
      audition.toggleStretch(stretch)
      expect(audition.stretchStatus).toBe('paused')
      audition.seekStretch(stretch, 25)
      audition.toggleStretch(stretch)
      await flush()

      expect(audition.stretchStatus).toBe('playing')
      expect(audio().currentTime).toBe(3)
      expect(clip).toHaveBeenCalledOnce()
    })

    it('stops at the track’s end, with the playhead back at its start', async () => {
      const { audition } = await playingTrack()
      audio().currentTime = 20

      audio().dispatchEvent(new Event('ended'))

      expect(audition.stretchStatus).toBe('idle')
      expect(audition.stretchPlayheadSeconds(trackStretchOfSelection())).toBe(22)
    })

    describe('a long track, through a moving window', () => {
      // The track of 1000 s: windows of 600 s, so 0 s to 600 s and then 600 s to 1000 s.
      it('decodes the first 10 min from the playhead, and plays from its start', async () => {
        const { audition } = setUpLongTrack()

        audition.toggleStretch(longStretch())
        await flush()

        expect(clip).toHaveBeenCalledExactlyOnceWith(0, 600)
        expect(audio().currentTime).toBe(0)
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(0)
      })

      it('decodes the window from a playhead moved before the first play', async () => {
        const { audition } = setUpLongTrack()
        audition.seekStretch(longStretch(), 250)

        audition.toggleStretch(longStretch())
        await flush()

        expect(clip).toHaveBeenCalledExactlyOnceWith(250, 600)
        expect(audio().currentTime).toBe(0)
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(250)
      })

      it('decodes only what is left when the playhead is near the end', async () => {
        const { audition } = setUpLongTrack()
        audition.seekStretch(longStretch(), 900)

        audition.toggleStretch(longStretch())
        await flush()

        expect(clip).toHaveBeenCalledExactlyOnceWith(900, 100)
      })

      it('seeks inside the held window with no clip call', async () => {
        const { audition } = await playingLongTrack()

        audition.seekStretch(longStretch(), 300)

        expect(audio().currentTime).toBe(300)
        expect(audition.stretchStatus).toBe('playing')
        expect(clip).toHaveBeenCalledOnce()
      })

      it('decodes a new window from the seek point when the playing track is seeked outside it', async () => {
        const { audition } = await playingLongTrack()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)

        audition.seekStretch(longStretch(), 800)

        expect(clip).toHaveBeenLastCalledWith(800, 200)
        expect(audition.stretchStatus).toBe('loading')
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(800)
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')

        pending.resolve(clipOf(800, 200))
        await flush()

        expect(audition.stretchStatus).toBe('playing')
        expect(audio().currentTime).toBe(0)
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(800)
      })

      it('decodes a new window on Play when a paused track was seeked outside its window', async () => {
        const { audition } = await playingLongTrack()
        audition.toggleStretch(longStretch())

        audition.seekStretch(longStretch(), 700)
        expect(clip).toHaveBeenCalledOnce()
        audition.toggleStretch(longStretch())
        await flush()

        expect(clip).toHaveBeenLastCalledWith(700, 300)
        expect(audition.stretchStatus).toBe('playing')
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(700)
      })

      it('resumes a paused track from its window, with no clip call, when the playhead is inside it', async () => {
        const { audition } = await playingLongTrack()
        audition.toggleStretch(longStretch())
        audition.seekStretch(longStretch(), 450)

        audition.toggleStretch(longStretch())
        await flush()

        expect(audio().currentTime).toBe(450)
        expect(clip).toHaveBeenCalledOnce()
      })

      it('plays from the window a playhead left outside it while the first clip was decoded', async () => {
        const { audition } = setUpLongTrack()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggleStretch(longStretch())

        audition.seekStretch(longStretch(), 800)
        pending.resolve(clipOf(0, 600))
        await flush()

        expect(clip).toHaveBeenLastCalledWith(800, 200)
        expect(audition.stretchStatus).toBe('playing')
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(800)
      })

      it('ends the track, with no clip call, when the playing track is seeked to its very end', async () => {
        const { audition } = await playingLongTrack()

        audition.seekStretch(longStretch(), 1000)

        expect(audition.stretchStatus).toBe('idle')
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(0)
        expect(clip).toHaveBeenCalledOnce()
      })

      it('plays from the track’s start when the playhead was left at its very end', async () => {
        const { audition } = await playingLongTrack()
        audition.toggleStretch(longStretch())
        audition.seekStretch(longStretch(), 1000)

        audition.toggleStretch(longStretch())
        await flush()

        expect(clip).toHaveBeenLastCalledWith(0, 600)
        expect(audition.stretchPlayheadSeconds(longStretch())).toBe(0)
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
          const { audition } = await playingLongTrack()
          audition.toggleStretch(longStretch())

          timeUpdate(590)

          expect(clip).toHaveBeenCalledOnce()
        })

        it('is never asked for by a track of 10 min or less', async () => {
          await playingTrack()

          timeUpdate(19)

          expect(clip).toHaveBeenCalledOnce()
        })

        it('is played on into when the window ends, with no clip call and no wait', async () => {
          const { audition } = await playingLongTrack()
          timeUpdate(570)
          await flush()
          const played = play.mock.calls.length

          timeUpdate(600)
          audio().dispatchEvent(new Event('ended'))

          expect(audition.stretchStatus).toBe('playing')
          expect(audio().src).toBe('blob:clip-2')
          expect(audio().currentTime).toBe(0)
          expect(audition.stretchPlayheadSeconds(longStretch())).toBe(600)
          expect(play).toHaveBeenCalledTimes(played + 1)
          expect(clip).toHaveBeenCalledTimes(2)
          expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
          audio().currentTime = 100
          expect(audition.stretchPlayheadSeconds(longStretch())).toBe(700)
        })

        it('is asked for in turn: the window after it is decoded ahead of the hand-over', async () => {
          const longer = setUpLongTrack()
          longer.split.detect(curveOf([LOUD, 40_000]), {
            windowSeconds: 0.05,
            durationSeconds: 2000,
          })
          longer.split.selectTrack(longer.split.tracks[0]!)
          longer.audition.toggleStretch(longStretch())
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
          const { audition } = await playingLongTrack()
          timeUpdate(570)
          await flush()
          timeUpdate(600)
          audio().dispatchEvent(new Event('ended'))

          audio().currentTime = 400
          audio().dispatchEvent(new Event('ended'))

          expect(audition.stretchStatus).toBe('idle')
          expect(audition.stretchPlayheadSeconds(longStretch())).toBe(0)
          audition.toggleStretch(longStretch())
          await flush()
          expect(clip).toHaveBeenLastCalledWith(0, 600)
        })

        it('holds at most two windows: the one playing and the one ahead', async () => {
          const { audition } = await playingLongTrack()
          expect(heldWavs()).toBe(1)

          timeUpdate(570)
          await flush()
          expect(heldWavs()).toBe(2)
          audition.toggleStretch(longStretch())
          audition.toggleStretch(longStretch())
          expect(heldWavs()).toBe(2)

          timeUpdate(600)
          audio().dispatchEvent(new Event('ended'))
          expect(heldWavs()).toBe(1)
        })

        it('lets both windows go for a window from a seek outside them', async () => {
          const { audition } = await playingLongTrack()
          timeUpdate(570)
          await flush()

          audition.seekStretch(longStretch(), 900)
          await flush()

          expect(heldWavs()).toBe(1)
          expect(audio().src).toBe('blob:clip-3')
        })

        it('drops a window that arrives after the windows were let go of', async () => {
          const { audition } = await playingLongTrack()
          const pending = deferred<Clip>()
          clip.mockReturnValueOnce(pending.promise)
          timeUpdate(570)

          audition.seekStretch(longStretch(), 900)
          await flush()
          pending.resolve(clipOf(600, 400))
          await flush()

          expect(createObjectURL).toHaveBeenCalledTimes(2)
          expect(heldWavs()).toBe(1)
          expect(audition.stretchStatus).toBe('playing')
        })

        it('stops its decode when the windows are let go of, so the seek’s window does not wait behind it', async () => {
          const { audition } = await playingLongTrack()
          clip.mockReturnValueOnce(deferred<Clip>().promise)
          timeUpdate(570)
          const signal = clip.mock.lastCall?.[2]
          expect(signal?.aborted).toBe(false)

          audition.seekStretch(longStretch(), 900)

          expect(signal?.aborted).toBe(true)
        })

        it('stops its decode on stop()', async () => {
          const { audition } = await playingLongTrack()
          clip.mockReturnValueOnce(deferred<Clip>().promise)
          timeUpdate(570)
          const signal = clip.mock.lastCall?.[2]

          audition.stop()

          expect(signal?.aborted).toBe(true)
          expect(audition.stretchStatus).toBe('paused')
        })

        it('lets go of a window ahead already decoded on stop(), and decodes it again on playing on', async () => {
          const { audition } = await playingLongTrack()
          timeUpdate(570)
          await flush()
          expect(heldWavs()).toBe(2)

          audition.stop()
          expect(heldWavs()).toBe(1)
          audition.toggleStretch(longStretch())
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
            const { audition, pending } = await waitingForTheWindowAhead()
            expect(audition.stretchStatus).toBe('loading')
            expect(audition.stretchPlayheadSeconds(longStretch())).toBe(600)

            pending.resolve(clipOf(600, 400))
            await flush()

            expect(audition.stretchStatus).toBe('playing')
            expect(audio().src).toBe('blob:clip-2')
            expect(audition.stretchPlayheadSeconds(longStretch())).toBe(600)
            expect(clip).toHaveBeenCalledTimes(2)
          })

          it('is taken back by a press, and does not play when it arrives', async () => {
            const { audition, pending } = await waitingForTheWindowAhead()
            const played = play.mock.calls.length

            audition.toggleStretch(longStretch())
            pending.resolve(clipOf(600, 400))
            await flush()

            expect(audition.stretchStatus).toBe('idle')
            expect(play).toHaveBeenCalledTimes(played)
          })

          it('plays on from a place sought inside it meanwhile', async () => {
            const { audition, pending } = await waitingForTheWindowAhead()

            audition.seekStretch(longStretch(), 800)
            pending.resolve(clipOf(600, 400))
            await flush()

            expect(audition.stretchStatus).toBe('playing')
            expect(audio().currentTime).toBe(200)
            expect(audition.stretchPlayheadSeconds(longStretch())).toBe(800)
          })

          it('decodes a window from a place sought outside it meanwhile', async () => {
            const { audition, pending } = await waitingForTheWindowAhead()

            audition.seekStretch(longStretch(), 300)
            pending.resolve(clipOf(600, 400))
            await flush()

            expect(clip).toHaveBeenLastCalledWith(300, 600)
            expect(audition.stretchStatus).toBe('playing')
            expect(audition.stretchPlayheadSeconds(longStretch())).toBe(300)
            expect(heldWavs()).toBe(1)
          })
        })

        describe('failures', () => {
          it('stays quiet when decoding it fails, and decodes it again at the hand-over', async () => {
            const { audition } = await playingLongTrack()
            clip.mockRejectedValueOnce(new Error('ffmpeg went away'))

            timeUpdate(570)
            await flush()
            expect(audition.failure).toBeNull()
            expect(audition.stretchStatus).toBe('playing')
            timeUpdate(600)
            audio().dispatchEvent(new Event('ended'))
            await flush()

            expect(clip).toHaveBeenLastCalledWith(600, 400)
            expect(audition.stretchStatus).toBe('playing')
            expect(audio().src).toBe('blob:clip-2')
          })

          it('says why when the hand-over cannot decode it either', async () => {
            const { audition } = await playingLongTrack()
            clip.mockRejectedValueOnce(new Error('ffmpeg went away'))
            timeUpdate(570)
            await flush()
            clip.mockRejectedValueOnce(new Error('still away'))

            timeUpdate(600)
            audio().dispatchEvent(new Event('ended'))
            await flush()

            expect(audition.failure).toBe("Couldn't play this track: still away")
            expect(audition.stretchStatus).toBe('idle')
            expect(heldWavs()).toBe(0)
          })
        })
      })
    })

    it('says "track" when the track cannot be played', async () => {
      const { audition } = setUpTrack()
      clip.mockRejectedValueOnce(new Error('ffmpeg went away'))

      audition.toggleStretch(trackStretchOfSelection())
      await flush()

      expect(audition.failure).toBe("Couldn't play this track: ffmpeg went away")
      expect(audition.stretchStatus).toBe('idle')
    })

    describe('and the other things the player plays', () => {
      it('lets go of a held range WAV and decodes the track, whose playhead is its own start', async () => {
        const { audition, split } = setUpTrack()
        split.setRange(10, 30)
        audition.toggleStretch(rangeStretch())
        await flush()
        audio().currentTime = 5
        audition.toggleStretch(rangeStretch())
        split.showView('track')

        // The range's resting place, 15 s, is no place in the track.
        expect(audition.stretchPlayheadSeconds(trackStretchOfSelection())).toBe(22)
        audition.toggleStretch(trackStretchOfSelection())
        await flush()

        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
        expect(clip).toHaveBeenLastCalledWith(22, 20)
        expect(audio().currentTime).toBe(0)
      })

      it('lets go of a held track WAV and decodes the range', async () => {
        const { audition, split } = await playingTrack()
        audition.toggleStretch(trackStretchOfSelection())
        split.setRange(10, 30)
        // A new range lets go of the stretch held, and the range plays on its own clip.
        audition.toggleStretch(rangeStretch())
        await flush()

        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
        expect(clip).toHaveBeenLastCalledWith(10, 20)
      })

      it('keeps a playhead moved before the first play of another stretch while one is held', async () => {
        const { audition, split } = setUpTrack()
        split.setRange(10, 30)
        audition.toggleStretch(rangeStretch())
        await flush()
        audition.toggleStretch(rangeStretch())
        split.showView('track')

        audition.seekStretch(trackStretchOfSelection(), 30)
        audition.toggleStretch(trackStretchOfSelection())
        await flush()

        expect(clip).toHaveBeenLastCalledWith(22, 20)
        expect(audio().currentTime).toBe(8)
      })

      it('stops the split audition when the track plays, and the track when the audition plays', async () => {
        const { audition, split } = setUpTrack()
        split.selectSplit(split.splits[0]!.id)
        audition.toggle()
        await flush()
        expect(audition.status).toBe('playing')
        split.selectTrack(split.tracks[1]!)
        expect(audition.status).toBe('idle')

        audition.toggleStretch(trackStretchOfSelection())
        await flush()
        expect(audition.stretchStatus).toBe('playing')

        split.selectSplit(split.splits[0]!.id)
        expect(audition.stretchStatus).toBe('idle')
        audition.toggle()
        await flush()
        expect(audition.status).toBe('playing')
        expect(audition.stretchStatus).toBe('idle')
      })
    })

    describe('stop rules', () => {
      it('stops, lets go of the WAV and puts the playhead at the start when another track is selected', async () => {
        const { audition, split } = await playingTrack()
        audio().currentTime = 4

        split.selectTrack(split.tracks[2]!)

        expect(audition.stretchStatus).toBe('idle')
        expect(pause).toHaveBeenCalled()
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
        expect(audition.stretchPlayheadSeconds(trackStretchOfSelection())).toBe(42)
      })

      it('stops and lets go of the WAV when a split is selected', async () => {
        const { audition, split } = await playingTrack()

        split.selectSplit(split.splits[0]!.id)

        expect(audition.stretchStatus).toBe('idle')
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('stops and lets go of the WAV when the selected track’s start moves', async () => {
        const { audition, split } = setUp()
        split.moveZoomTo(22)
        split.selectTrack(split.tracks[1]!)
        audition.toggleStretch(trackStretchOfSelection())
        await flush()

        split.moveSplit(split.splits[0]!.id, 23)

        expect(audition.stretchStatus).toBe('idle')
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
        expect(audition.stretchPlayheadSeconds(trackStretchOfSelection())).toBe(23)
      })

      it('stops and lets go of the WAV when the selected track’s end moves', async () => {
        const { audition, split } = setUp()
        split.moveZoomTo(42)
        split.selectTrack(split.tracks[1]!)
        audition.toggleStretch(trackStretchOfSelection())
        await flush()

        split.moveSplit(split.splits[1]!.id, 43)

        expect(audition.stretchStatus).toBe('idle')
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('stops when a split at one of its ends is deleted, and the merged track starts at its own start', async () => {
        const { audition, split } = await playingTrack()

        split.deleteSplit(split.splits[1]!.id)

        expect(audition.stretchStatus).toBe('idle')
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
        expect(audition.stretchPlayheadSeconds(trackStretchOfSelection())).toBe(22)
      })

      it('keeps playing when a split elsewhere moves', async () => {
        const { audition, split } = setUp()
        split.moveZoomTo(42)
        split.selectTrack(split.tracks[0]!)
        audition.toggleStretch(trackStretchOfSelection())
        await flush()

        split.moveSplit(split.splits[1]!.id, 43)

        expect(audition.stretchStatus).toBe('playing')
        expect(revokeObjectURL).not.toHaveBeenCalled()
      })

      it('stops and lets go of the WAV when a new range is drawn', async () => {
        const { audition, split } = await playingTrack()

        split.setRange(40, 50)

        expect(audition.stretchStatus).toBe('idle')
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('pauses where it is, keeping the WAV, on stop(): a view change, the export', async () => {
        const { audition } = await playingTrack()
        audio().currentTime = 4

        audition.stop()

        expect(audition.stretchStatus).toBe('paused')
        expect(audition.stretchPlayheadSeconds(trackStretchOfSelection())).toBe(26)
        expect(revokeObjectURL).not.toHaveBeenCalled()
      })

      it('lets go of the WAV when the page resets the store on unmount', async () => {
        const { audition, split } = await playingTrack()

        audition.stop()
        split.reset()

        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('drops a clip that arrives after another track was selected', async () => {
        const { audition, split } = setUpTrack()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggleStretch(trackStretchOfSelection())

        split.selectTrack(split.tracks[2]!)
        pending.resolve(clipOf(22, 20))
        await flush()

        expect(audition.stretchStatus).toBe('idle')
        expect(play).not.toHaveBeenCalled()
      })
    })
  })

  it('stop() lets go of everything and is safe when idle', async () => {
    const { audition } = setUp()
    audition.stop()
    expect(revokeObjectURL).not.toHaveBeenCalled()

    audition.toggle()
    await flush()
    audition.stop()
    audition.stop()

    expect(audition.status).toBe('idle')
    expect(pause).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
  })

  /*
  The volume (docs/concepts/09-volume-is-gain.md): a level in dB, 0 to -40, and a mute flag, applied
  to the one element as a linear gain and kept in localStorage.
  */
  describe('volume', () => {
    it('starts at 0 dB and unmuted', () => {
      const { audition } = setUp()

      expect(audition.volumeDecibels).toBe(0)
      expect(audition.isMuted).toBe(false)
    })

    it('gives a new element the gain of the level set before it was made', async () => {
      const { audition } = setUp()
      audition.setVolume(-20)

      audition.toggle()
      await flush()

      expect(audio().volume).toBeCloseTo(0.1, 6)
      expect(audio().muted).toBe(false)
    })

    it('gives a new element full gain by default', async () => {
      await playing()

      expect(audio().volume).toBe(1)
    })

    it('changes the gain of sound that is already playing, at once', async () => {
      const { audition } = await playing()

      audition.setVolume(-6)
      expect(audio().volume).toBeCloseTo(0.5012, 4)

      audition.setVolume(-40)
      expect(audio().volume).toBeCloseTo(0.01, 6)
      expect(audition.status).toBe('playing')
    })

    it('changes the gain of a playing range and a playing track the same way', async () => {
      const range = await playingRange()
      range.audition.setVolume(-10)
      expect(audio().volume).toBeCloseTo(0.3162, 4)
      range.audition.stop()

      const track = await playingTrack()
      track.audition.setVolume(-30)
      expect(audio().volume).toBeCloseTo(0.03162, 5)
    })

    it('mutes the element without touching its gain, and unmutes to the same level', async () => {
      const { audition } = await playing()
      audition.setVolume(-12)

      audition.toggleMute()
      expect(audition.isMuted).toBe(true)
      expect(audio().muted).toBe(true)
      expect(audio().volume).toBeCloseTo(0.2512, 4)
      expect(audition.volumeDecibels).toBe(-12)

      audition.toggleMute()
      expect(audition.isMuted).toBe(false)
      expect(audio().muted).toBe(false)
      expect(audio().volume).toBeCloseTo(0.2512, 4)
    })

    it('keeps the level while muted, and the mute while the level changes', async () => {
      const { audition } = await playing()

      audition.toggleMute()
      audition.setVolume(-3)

      expect(audio().muted).toBe(true)
      expect(audio().volume).toBeCloseTo(0.7079, 4)
    })

    it('holds the level to whole dB from -40 to 0', () => {
      const { audition } = setUp()

      audition.setVolume(-12.4)
      expect(audition.volumeDecibels).toBe(-12)

      audition.setVolume(-90)
      expect(audition.volumeDecibels).toBe(-40)

      audition.setVolume(6)
      expect(audition.volumeDecibels).toBe(0)
    })

    it('ignores a level that is not a number, which the element would throw on', async () => {
      const { audition } = await playing()
      audition.setVolume(-12)

      audition.setVolume(NaN)

      expect(audition.volumeDecibels).toBe(-12)
      expect(audio().volume).toBeCloseTo(0.2512, 4)
    })

    it('keeps the level and the mute, so a store made later reads them back', () => {
      const first = setUp().audition
      first.setVolume(-15)
      first.toggleMute()

      setActivePinia(createPinia())
      const second = useAuditionStore()

      expect(second.volumeDecibels).toBe(-15)
      expect(second.isMuted).toBe(true)
    })

    it('gives the element of a later store the saved gain and mute', async () => {
      const first = setUp().audition
      first.setVolume(-20)
      first.toggleMute()

      // A new pinia has a new source-file store, whose clip is stubbed afresh.
      setActivePinia(createPinia())
      vi.spyOn(useSourceFileStore(), 'clip').mockImplementation(async (start, length) =>
        clipOf(start, length),
      )
      const later = setUp().audition
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

      const { audition } = setUp()

      expect(audition.volumeDecibels).toBe(0)
      expect(audition.isMuted).toBe(false)
    })

    it('uses the defaults, and still works, when the browser blocks storage', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlocked)
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlocked)

      const { audition } = await playing()
      expect(audition.volumeDecibels).toBe(0)
      expect(audition.isMuted).toBe(false)

      audition.setVolume(-10)
      audition.toggleMute()

      expect(audition.volumeDecibels).toBe(-10)
      expect(audio().volume).toBeCloseTo(0.3162, 4)
      expect(audio().muted).toBe(true)
    })
  })
})
