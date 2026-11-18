import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { FileReplacedError, useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
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
  parts.audition.toggleRange()
  await flush()
  expect(parts.audition.rangeStatus).toBe('playing')
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

function setUp() {
  const split = useSplitStore()
  const curve = farGaps()
  split.detect(curve, { windowSeconds: 0.05, durationSeconds: 60 })
  return { split, audition: useAuditionStore() }
}

// Lets the promise callbacks the store waits on run.
const flush = () => new Promise((done) => setTimeout(done, 0))

describe('the audition store', () => {
  let play: MockInstance<HTMLMediaElement['play']>
  let pause: MockInstance<HTMLMediaElement['pause']>
  let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>
  let clip: MockInstance<ReturnType<typeof useSourceFileStore>['clip']>

  // The one hidden element the store made: the element `play` was last called on.
  const audio = () => play.mock.contexts.at(-1) as HTMLAudioElement

  beforeEach(() => {
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
    expect(audition.playheadSeconds()).toBeNull()
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
    expect(audition.playheadSeconds()).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    expect(audio().hasAttribute('src')).toBe(false)
  })

  it('stops on a second press while playing', async () => {
    const { audition } = setUp()
    audition.toggle()
    await flush()

    audition.toggle()

    expect(audition.status).toBe('idle')
    expect(pause).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
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
    audition.toggle()
    audition.toggle()
    await flush()

    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    expect(audio().getAttribute('src')).toBe('blob:clip-2')
  })

  describe('stop rules', () => {
    it('stops when the selected split moves', async () => {
      const { split, audition } = await playing()

      split.moveSplit(split.selectedSplitId!, 22.5)

      expect(audition.status).toBe('idle')
    })

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

      split.deleteSplit(split.selectedSplitId!)

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

      expect(audition.rangeStatus).toBe('idle')
      expect(audition.rangePlayheadSeconds()).toBe(10)
    })

    it('has no playhead without a range, and does nothing when asked to play', () => {
      const { audition } = setUp()

      audition.toggleRange()

      expect(audition.rangePlayheadSeconds()).toBeNull()
      expect(audition.rangeStatus).toBe('idle')
      expect(clip).not.toHaveBeenCalled()
    })

    it('asks for the range’s start and length and plays the WAV from its start', async () => {
      const { audition } = setUpRange()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)

      audition.toggleRange()

      expect(clip).toHaveBeenCalledExactlyOnceWith(10, 20)
      expect(audition.rangeStatus).toBe('loading')
      expect(play).not.toHaveBeenCalled()

      pending.resolve(clipOf(10, 20))
      await flush()

      expect(audition.rangeStatus).toBe('playing')
      expect(play).toHaveBeenCalledOnce()
      expect(createObjectURL.mock.calls[0]![0].type).toBe('audio/wav')
      expect(audio().currentTime).toBe(0)
    })

    it('leaves the split audition’s state alone', async () => {
      const { audition } = await playingRange()

      expect(audition.status).toBe('idle')
      expect(audition.isActive).toBe(false)
      expect(audition.playheadSeconds()).toBeNull()
    })

    it('puts the playhead at the clip start plus the element time, within the clip', async () => {
      const { audition } = await playingRange()

      audio().currentTime = 4.5
      expect(audition.rangePlayheadSeconds()).toBe(14.5)
      // The element can report a hair past the end before `ended` arrives.
      audio().currentTime = 20.01
      expect(audition.rangePlayheadSeconds()).toBe(30)
    })

    it('pauses on a second press, and the playhead holds where the sound stopped', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 4
      pause.mockClear()

      audition.toggleRange()
      // The element's clock keeps whatever it had; the playhead must not follow it any more.
      audio().currentTime = 9

      expect(audition.rangeStatus).toBe('paused')
      expect(pause).toHaveBeenCalled()
      expect(audition.rangePlayheadSeconds()).toBe(14)
      expect(revokeObjectURL).not.toHaveBeenCalled()
    })

    it('resumes from the playhead at once, without decoding the range again', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 4
      audition.toggleRange()

      audition.toggleRange()
      await flush()

      expect(audition.rangeStatus).toBe('playing')
      expect(clip).toHaveBeenCalledOnce()
      expect(createObjectURL).toHaveBeenCalledOnce()
      expect(play).toHaveBeenCalledTimes(2)
      expect(audio().currentTime).toBe(4)
    })

    it('stops at the end of the range, with the playhead back at its start', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 20

      audio().dispatchEvent(new Event('ended'))

      expect(audition.rangeStatus).toBe('idle')
      expect(audition.rangePlayheadSeconds()).toBe(10)
    })

    it('plays the range again from its start after the end, without decoding again', async () => {
      const { audition } = await playingRange()
      audio().currentTime = 20
      audio().dispatchEvent(new Event('ended'))

      audition.toggleRange()
      await flush()

      expect(audition.rangeStatus).toBe('playing')
      expect(clip).toHaveBeenCalledOnce()
      expect(audio().currentTime).toBe(0)
    })

    it('reads "stop" while decoding: a press then takes it back and the clip is dropped', async () => {
      const { audition } = setUpRange()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggleRange()

      audition.toggleRange()
      expect(audition.rangeStatus).toBe('idle')

      pending.resolve(clipOf(10, 20))
      await flush()

      expect(play).not.toHaveBeenCalled()
      expect(createObjectURL).not.toHaveBeenCalled()
      expect(audition.rangeStatus).toBe('idle')
    })

    it('drops a clip that arrives after a new range was drawn', async () => {
      const { audition, split } = setUpRange()
      const pending = deferred<Clip>()
      clip.mockReturnValueOnce(pending.promise)
      audition.toggleRange()

      split.setRange(40, 50)
      pending.resolve(clipOf(10, 20))
      await flush()

      expect(play).not.toHaveBeenCalled()
      expect(audition.rangeStatus).toBe('idle')
      expect(audition.rangePlayheadSeconds()).toBe(40)
    })

    it('stops and lets go of the decoded range when a new range is drawn', async () => {
      const { audition, split } = await playingRange()
      audio().currentTime = 4

      split.setRange(40, 50)

      expect(audition.rangeStatus).toBe('idle')
      expect(pause).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(audition.rangePlayheadSeconds()).toBe(40)
    })

    it('decodes the new range, not the old one, on the next press', async () => {
      const { audition, split } = await playingRange()
      split.setRange(40, 50)

      audition.toggleRange()
      await flush()

      expect(clip).toHaveBeenLastCalledWith(40, 10)
      expect(clip).toHaveBeenCalledTimes(2)
    })

    it('lets go of the decoded range when the range is cleared', async () => {
      const { audition, split } = await playingRange()

      split.reset()

      expect(audition.rangeStatus).toBe('idle')
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(audition.rangePlayheadSeconds()).toBeNull()
    })

    describe('stop()', () => {
      it('pauses a playing range where it is, keeping the decoded range', async () => {
        const { audition } = await playingRange()
        audio().currentTime = 6

        audition.stop()

        expect(audition.rangeStatus).toBe('paused')
        expect(audition.rangePlayheadSeconds()).toBe(16)
        expect(revokeObjectURL).not.toHaveBeenCalled()
      })

      it('takes back a range that is still decoding', async () => {
        const { audition } = setUpRange()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggleRange()

        audition.stop()
        pending.resolve(clipOf(10, 20))
        await flush()

        expect(audition.rangeStatus).toBe('idle')
        expect(play).not.toHaveBeenCalled()
      })

      it('leaves a paused range paused, and an idle one idle', async () => {
        const { audition } = await playingRange()
        audition.toggleRange()

        audition.stop()
        expect(audition.rangeStatus).toBe('paused')

        const idle = setUpRange().audition
        idle.stop()
        expect(idle.rangeStatus).toBe('idle')
      })
    })

    describe('and the split audition, which stop each other', () => {
      it('stops the range, keeping its playhead, and lets go of its clip, when the audition plays', async () => {
        const { audition } = await playingRange()
        audio().currentTime = 4

        audition.toggle()

        expect(audition.rangeStatus).toBe('idle')
        expect(audition.status).toBe('loading')
        expect(audition.rangePlayheadSeconds()).toBe(14)
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('lets go of a paused range’s clip when the audition plays', async () => {
        const { audition } = await playingRange()
        audition.toggleRange()

        audition.toggle()
        await flush()

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:clip-1')
        expect(audition.status).toBe('playing')
        expect(audition.rangeStatus).toBe('idle')
      })

      it('stops the audition, and lets go of its clip, when the range plays', async () => {
        const { audition } = setUpRange()
        audition.toggle()
        await flush()
        expect(audition.status).toBe('playing')

        audition.toggleRange()

        expect(audition.status).toBe('idle')
        expect(audition.isActive).toBe(false)
        expect(audition.rangeStatus).toBe('loading')
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('decodes the range again after the audition took its clip away', async () => {
        const { audition } = await playingRange()
        audition.toggle()
        await flush()

        audition.toggleRange()
        await flush()

        expect(clip).toHaveBeenCalledTimes(3)
        expect(clip).toHaveBeenLastCalledWith(10, 20)
        expect(audition.rangeStatus).toBe('playing')
      })

      it('stops the audition when a range is made while it plays', async () => {
        const { audition, split } = setUp()
        audition.toggle()
        await flush()

        split.setRange(10, 30)

        expect(audition.status).toBe('idle')
        expect(audition.playheadSeconds()).toBeNull()
      })
    })

    describe('failures', () => {
      it('says why the range could not be made and goes idle', async () => {
        const { audition } = setUpRange()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))

        audition.toggleRange()
        await flush()

        expect(audition.rangeStatus).toBe('idle')
        expect(audition.failure).toBe("Couldn't play this range: Invalid data found")
      })

      it('stays silent when the file was replaced before the range was ready', async () => {
        const { audition } = setUpRange()
        clip.mockRejectedValueOnce(new FileReplacedError())

        audition.toggleRange()
        await flush()

        expect(audition.rangeStatus).toBe('idle')
        expect(audition.failure).toBeNull()
      })

      it('ignores the failure of a press that was taken back', async () => {
        const { audition } = setUpRange()
        const pending = deferred<Clip>()
        clip.mockReturnValueOnce(pending.promise)
        audition.toggleRange()
        audition.toggleRange()

        pending.reject(new Error('Invalid data found'))
        await flush()

        expect(audition.failure).toBeNull()
      })

      it('treats a refused play() as a failure and lets go of the clip', async () => {
        const { audition } = setUpRange()
        play.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))

        audition.toggleRange()
        await flush()

        expect(audition.rangeStatus).toBe('idle')
        expect(audition.failure).toBe("Couldn't play this range: Not allowed")
        expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      })

      it('clears the failure on the next press', async () => {
        const { audition } = setUpRange()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))
        audition.toggleRange()
        await flush()

        audition.toggleRange()

        expect(audition.failure).toBeNull()
        expect(audition.rangeStatus).toBe('loading')
      })

      it('clears the failure when a new range is drawn', async () => {
        const { audition, split } = setUpRange()
        clip.mockRejectedValueOnce(new Error('Invalid data found'))
        audition.toggleRange()
        await flush()
        expect(audition.failure).not.toBeNull()

        split.setRange(40, 50)

        expect(audition.failure).toBeNull()
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
})
