import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { usePlayerStore } from '../../model/player.ts'
import { usePlayheadSlider } from '../use-playhead-slider.ts'

enableAutoUnmount(afterEach)

// The component draws nothing: only its setup matters.
const renderNothing = () => null

// The slider's composable in a bare host, with a `draw` to watch.
function mountSlider() {
  const draw = vi.fn()
  let value: { readonly value: number } | undefined
  mount(
    defineComponent({
      setup() {
        value = usePlayheadSlider(draw)
        return renderNothing
      },
    }),
  )
  return { draw, value: () => value?.value }
}

// A range on show, from `startSeconds` to 20 s.
function setup(startSeconds = 10) {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.open(new Float32Array(2000).fill(-10), { windowSeconds: 0.05, durationSeconds: 100 })
  split.setRange(startSeconds, 20)
  return { player: usePlayerStore(), ...mountSlider() }
}

// The player plays, and the sound is at `heard`; the spy moves the sound on.
async function startPlaying(player: ReturnType<typeof usePlayerStore>, heard: number) {
  const spy = vi.spyOn(player, 'playheadSeconds').mockReturnValue(heard)
  player.status = 'playing'
  await nextTick()
  return spy
}

describe('usePlayheadSlider', () => {
  // The loop asks for one frame at a time, so one is waiting at most.
  let frames: FrameRequestCallback[]

  beforeEach(() => {
    setActivePinia(createPinia())
    frames = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  async function runFrame() {
    frames.at(-1)?.(0)
    await nextTick()
  }

  it('is 0 with nothing on show', () => {
    const { value } = mountSlider()

    expect(value()).toBe(0)
  })

  it('is the resting place to the hundredth while the player is not playing', async () => {
    const { player, value } = setup()
    expect(value()).toBe(10)

    player.seek(14.256)
    await nextTick()

    expect(value()).toBeCloseTo(14.256, 9)
  })

  it('is the sound’s place to the whole second while playing, one frame at a time', async () => {
    const { player, value } = setup()
    const heard = await startPlaying(player, 13.7)

    await runFrame()
    expect(value()).toBe(13)

    heard.mockReturnValue(14.2)
    await runFrame()
    expect(value()).toBe(14)
  })

  it('never falls under the start of a stretch that starts at a fractional second', async () => {
    const { player, value } = setup(12.34)
    await startPlaying(player, 12.5)

    await runFrame()

    expect(value()).toBeCloseTo(12.34, 9)
  })

  it('draws on every frame while playing, and once more when it ends, and asks for none while idle', async () => {
    const { player, draw } = setup()
    expect(frames).toHaveLength(0)
    await startPlaying(player, 13.7)

    await runFrame()
    await runFrame()
    expect(draw).toHaveBeenCalledTimes(2)

    player.status = 'paused'
    await nextTick()
    expect(draw).toHaveBeenCalledTimes(3)
  })
})
