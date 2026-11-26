import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { createAudioElement, type Clip } from '../audio-element.ts'

// A clip of 8 s that starts at 18 s in the file: what an audition of a split at 22 s holds.
const clipAt18: Clip = { wav: Uint8Array.of(1, 2, 3), startSeconds: 18, lengthSeconds: 8 }

describe('the audio element module', () => {
  let play: MockInstance<HTMLMediaElement['play']>
  let pause: MockInstance<HTMLMediaElement['pause']>
  let load: MockInstance<HTMLMediaElement['load']>
  let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>

  // The one hidden element the module made: the element `play` was last called on.
  const element = () => play.mock.contexts.at(-1) as HTMLAudioElement

  function setUp() {
    const ended = vi.fn()
    const timeUpdate = vi.fn()
    return { audio: createAudioElement({ ended, timeUpdate }), ended, timeUpdate }
  }

  beforeEach(() => {
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    // Like Chrome, and unlike jsdom: a load resets the rate to its default rate.
    load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('the position in file seconds', () => {
    it('sets the sound where the file time falls inside the clip', async () => {
      const { audio } = setUp()
      audio.hold(clipAt18)
      await audio.play()

      audio.seek(22)

      expect(element().currentTime).toBe(4)
      expect(audio.positionSeconds()).toBe(22)
    })

    it('holds a time before the clip to its start and one after it to its end', async () => {
      const { audio } = setUp()
      audio.hold(clipAt18)
      await audio.play()

      audio.seek(10)
      expect(element().currentTime).toBe(0)

      audio.seek(100)
      expect(element().currentTime).toBe(8)
    })

    it('reads a currentTime a hair past the end as the clip’s end', async () => {
      const { audio } = setUp()
      audio.hold(clipAt18)
      await audio.play()

      element().currentTime = 8.01

      expect(audio.positionSeconds()).toBe(26)
    })

    it('is at the clip’s start before any element is made', () => {
      const { audio } = setUp()

      expect(audio.positionSeconds()).toBe(0)
    })
  })

  describe('holding a clip', () => {
    it('points the element at the clip’s WAV and says it holds one', () => {
      const { audio } = setUp()
      expect(audio.hasClip()).toBe(false)

      audio.hold(clipAt18)

      expect(audio.hasClip()).toBe(true)
      const blob = createObjectURL.mock.calls[0]![0]
      expect(blob.type).toBe('audio/wav')
      expect(blob.size).toBe(3)
    })

    it('lets go of the clip held before it', () => {
      const { audio } = setUp()
      audio.hold(clipAt18)

      audio.hold({ ...clipAt18, startSeconds: 40 })

      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(audio.positionSeconds()).toBe(40)
    })

    it('hands over to a clip made ready, and lets go of the one it finished', async () => {
      const { audio } = setUp()
      audio.hold(clipAt18)
      await audio.play()
      const next = audio.prepare({ ...clipAt18, startSeconds: 26 })

      audio.handOver(next, 30)

      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(element().currentTime).toBe(4)
      expect(audio.positionSeconds()).toBe(30)
      expect(audio.hasClip()).toBe(true)
    })

    it('lets go of a clip made ready and never held', () => {
      const { audio } = setUp()
      const ready = audio.prepare(clipAt18)

      audio.discard(ready)

      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
    })
  })

  describe('the release', () => {
    it('stops the sound, drops the source with a load and revokes the WAV', async () => {
      const { audio } = setUp()
      audio.hold(clipAt18)
      await audio.play()
      pause.mockClear()

      audio.release()

      expect(pause).toHaveBeenCalledOnce()
      expect(element().hasAttribute('src')).toBe(false)
      expect(load).toHaveBeenCalledOnce()
      expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:clip-1')
      expect(audio.hasClip()).toBe(false)
    })

    it('does nothing before an element is made', () => {
      const { audio } = setUp()

      audio.release()

      expect(load).not.toHaveBeenCalled()
      expect(revokeObjectURL).not.toHaveBeenCalled()
    })
  })

  describe('play and pause', () => {
    it('plays through the element and returns its promise', async () => {
      const { audio } = setUp()
      audio.hold(clipAt18)

      await audio.play()

      expect(play).toHaveBeenCalledOnce()
    })

    it('passes on a refusal to play', async () => {
      const { audio } = setUp()
      play.mockRejectedValueOnce(new DOMException('not allowed', 'NotAllowedError'))

      await expect(audio.play()).rejects.toThrow('not allowed')
    })

    it('pauses the element, and does nothing before one is made', async () => {
      const { audio } = setUp()
      audio.pause()
      expect(pause).not.toHaveBeenCalled()

      await audio.play()
      audio.pause()

      expect(pause).toHaveBeenCalledOnce()
    })
  })

  describe('the volume', () => {
    it('is applied when the element is made, however early it was set', async () => {
      const { audio } = setUp()
      audio.setVolume(-20, true)

      await audio.play()

      expect(element().volume).toBeCloseTo(0.1, 6)
      expect(element().muted).toBe(true)
    })

    it('changes the sound at once', async () => {
      const { audio } = setUp()
      await audio.play()

      audio.setVolume(-6, false)
      expect(element().volume).toBeCloseTo(0.501, 3)
      expect(element().muted).toBe(false)

      audio.setVolume(-6, true)
      expect(element().muted).toBe(true)
    })

    it('survives a new clip', async () => {
      const { audio } = setUp()
      audio.setVolume(-20, false)
      audio.hold(clipAt18)
      await audio.play()

      audio.hold({ ...clipAt18, startSeconds: 40 })

      expect(element().volume).toBeCloseTo(0.1, 6)
    })
  })

  describe('the play speed', () => {
    it('is applied when the element is made, with the pitch kept', async () => {
      const { audio } = setUp()
      audio.setPlaySpeed(1.5)

      await audio.play()

      expect(element().playbackRate).toBe(1.5)
      expect(element().defaultPlaybackRate).toBe(1.5)
      expect(element().preservesPitch).toBe(true)
    })

    it('changes the sound at once', async () => {
      const { audio } = setUp()
      await audio.play()

      audio.setPlaySpeed(0.7)

      expect(element().playbackRate).toBeCloseTo(0.7, 6)
      expect(element().defaultPlaybackRate).toBeCloseTo(0.7, 6)
    })

    it('survives a new clip, a release and a hand-over', async () => {
      const { audio } = setUp()
      audio.setPlaySpeed(1.5)
      audio.hold(clipAt18)
      await audio.play()

      audio.hold({ ...clipAt18, startSeconds: 40 })
      expect(element().playbackRate).toBe(1.5)

      audio.release()
      expect(element().playbackRate).toBe(1.5)

      audio.hold(clipAt18)
      audio.handOver(audio.prepare({ ...clipAt18, startSeconds: 26 }), 26)
      expect(element().playbackRate).toBe(1.5)
    })
  })

  describe('the element’s events', () => {
    it('reports ended and timeupdate', async () => {
      const { audio, ended, timeUpdate } = setUp()
      await audio.play()

      element().dispatchEvent(new Event('timeupdate'))
      expect(timeUpdate).toHaveBeenCalledOnce()
      expect(ended).not.toHaveBeenCalled()

      element().dispatchEvent(new Event('ended'))
      expect(ended).toHaveBeenCalledOnce()
    })
  })
})
