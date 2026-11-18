import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { usePlayheadFrames } from '../use-playhead-frames.ts'

// The component draws nothing: only its setup matters.
const renderNothing = () => null

function mountWith() {
  const isPlaying = ref(false)
  const draw = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        usePlayheadFrames(() => isPlaying.value, draw)
        return renderNothing
      },
    }),
  )
  return { isPlaying, draw, wrapper }
}

describe('usePlayheadFrames', () => {
  // The loop asks for one frame at a time, so one is waiting at most.
  let waiting: { id: number; callback: FrameRequestCallback } | undefined
  let nextId: number

  beforeEach(() => {
    waiting = undefined
    nextId = 1
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      waiting = { id: nextId, callback }
      return nextId++
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      if (waiting?.id === id) waiting = undefined
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Runs the frame that is waiting, as the browser would at the next repaint.
  function runFrame() {
    if (waiting === undefined) throw new Error('no frame waiting')
    const { callback } = waiting
    waiting = undefined
    callback(0)
  }

  it('draws nothing while nothing plays', () => {
    const { draw } = mountWith()

    expect(draw).not.toHaveBeenCalled()
    expect(waiting).toBeUndefined()
  })

  it('draws on every frame while playing', async () => {
    const { isPlaying, draw } = mountWith()

    isPlaying.value = true
    await nextTick()
    expect(waiting).toBeDefined()

    runFrame()
    runFrame()

    expect(draw).toHaveBeenCalledTimes(2)
    expect(waiting).toBeDefined()
  })

  it('stops the loop and draws once more when playback ends', async () => {
    const { isPlaying, draw } = mountWith()
    isPlaying.value = true
    await nextTick()
    runFrame()
    draw.mockClear()

    isPlaying.value = false
    await nextTick()

    expect(waiting).toBeUndefined()
    expect(draw).toHaveBeenCalledOnce()
  })

  it('stops the loop when the component goes away', async () => {
    const { isPlaying, wrapper } = mountWith()
    isPlaying.value = true
    await nextTick()

    wrapper.unmount()

    expect(waiting).toBeUndefined()
  })
})
