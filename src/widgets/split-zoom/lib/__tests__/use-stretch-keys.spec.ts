import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { usePlayerStore } from '../../model/player.ts'
import { useStretchKeys } from '../use-stretch-keys.ts'

enableAutoUnmount(afterEach)

// The component draws nothing: only its setup matters.
const renderNothing = () => null

const keyOf = (key: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key, ...init })

// The player's verbs are spied: the playhead is `place.seconds`, and a seek moves it there.
function setup(startSeconds = 12) {
  const player = usePlayerStore()
  const place = { seconds: startSeconds }
  const toggle = vi.spyOn(player, 'toggle').mockImplementation(() => {})
  const backToStart = vi.spyOn(player, 'backToStart').mockImplementation(() => {})
  const seek = vi.spyOn(player, 'seek').mockImplementation((seconds) => {
    place.seconds = seconds
  })
  vi.spyOn(player, 'playheadSeconds').mockImplementation(() => place.seconds)
  let keys: ReturnType<typeof useStretchKeys> | undefined
  mount(
    defineComponent({
      setup() {
        keys = useStretchKeys()
        return renderNothing
      },
    }),
  )
  return {
    toggle,
    backToStart,
    seek,
    place,
    act: (event: KeyboardEvent) => keys!.isStretchKeyActedOn(event),
  }
}

describe('useStretchKeys', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Space', () => {
    it('plays or pauses, and is the view’s', () => {
      const { act, toggle } = setup()

      expect(act(keyOf(' '))).toBe(true)

      expect(toggle).toHaveBeenCalledOnce()
    })

    it('is taken but ignored when it is the auto-repeat of a held key', () => {
      const { act, toggle } = setup()

      act(keyOf(' '))
      expect(act(keyOf(' ', { repeat: true }))).toBe(true)
      act(keyOf(' ', { repeat: true }))

      expect(toggle).toHaveBeenCalledOnce()
    })
  })

  describe('Home', () => {
    it('takes the playhead back to the start', () => {
      const { act, backToStart } = setup()

      expect(act(keyOf('Home'))).toBe(true)

      expect(backToStart).toHaveBeenCalledOnce()
    })
  })

  describe('Left and Right', () => {
    it('seek 1 s from the playhead, and 10 s with Shift', () => {
      const { act, place } = setup(12)

      expect(act(keyOf('ArrowRight'))).toBe(true)
      expect(place.seconds).toBe(13)

      act(keyOf('ArrowLeft'))
      act(keyOf('ArrowLeft'))
      expect(place.seconds).toBe(11)

      act(keyOf('ArrowRight', { shiftKey: true }))
      expect(place.seconds).toBe(21)

      act(keyOf('ArrowLeft', { shiftKey: true }))
      expect(place.seconds).toBe(11)
    })

    it('step from where the sound is, whatever the playhead was before', () => {
      const { act, place, seek } = setup(12)
      place.seconds = 14.37

      act(keyOf('ArrowRight'))

      expect(seek).toHaveBeenCalledExactlyOnceWith(15.37)
    })

    it('do not drift: ten steps of 1 s from a hundredth land on a hundredth, with no float noise', () => {
      const { act, place } = setup(10.01)

      for (let step = 0; step < 10; step++) act(keyOf('ArrowRight'))

      expect(String(place.seconds)).toBe('20.01')
    })
  })

  describe('every other key', () => {
    it('is left alone, and nothing is asked of the player', () => {
      const { act, toggle, backToStart, seek } = setup()

      for (const key of ['a', 'Enter', 'Escape', 'ArrowUp', 'End', 'x', 'c', '[']) {
        expect(act(keyOf(key))).toBe(false)
      }

      expect(toggle).not.toHaveBeenCalled()
      expect(backToStart).not.toHaveBeenCalled()
      expect(seek).not.toHaveBeenCalled()
    })
  })
})
