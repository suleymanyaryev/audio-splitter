import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useAuditionStore } from '../../model/audition.ts'
import RangeView from '../RangeView.vue'

enableAutoUnmount(afterEach)

function setup() {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.detect(new Float32Array(2000).fill(-10), { windowSeconds: 0.05, durationSeconds: 100 })
  split.setRange(10, 20)
  const audition = useAuditionStore()
  const toggleRange = vi.spyOn(audition, 'toggleRange').mockImplementation(() => {})
  return { audition, toggleRange, wrapper: mount(RangeView) }
}

describe('RangeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is a focusable group named "Range", with the range’s waveform in it', () => {
    const { wrapper } = setup()

    const view = wrapper.get('[role="group"]')

    expect(view.attributes('aria-label')).toBe('Range')
    expect(view.attributes('tabindex')).toBe('0')
    expect(view.find('canvas[aria-label="Waveform of the range"]').exists()).toBe(true)
  })

  describe('Space', () => {
    it('plays or pauses the range, and is not a page scroll', async () => {
      const { toggleRange, wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })

      wrapper.get('[role="group"]').element.dispatchEvent(event)

      expect(toggleRange).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })

    it('ignores the auto-repeat of a held key', async () => {
      const { toggleRange, wrapper } = setup()
      const view = wrapper.get('[role="group"]')

      await view.trigger('keydown', { key: ' ' })
      await view.trigger('keydown', { key: ' ', repeat: true })
      await view.trigger('keydown', { key: ' ', repeat: true })

      expect(toggleRange).toHaveBeenCalledTimes(1)
    })

    it('leaves other keys alone', async () => {
      const { toggleRange, wrapper } = setup()

      await wrapper.get('[role="group"]').trigger('keydown', { key: 'Enter' })

      expect(toggleRange).not.toHaveBeenCalled()
    })
  })

  describe('the failure line', () => {
    it('is not there while nothing failed', () => {
      const { wrapper } = setup()

      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('says why the range could not be played', async () => {
      const { audition, wrapper } = setup()

      audition.failure = "Couldn't play this range: Invalid data found"
      await wrapper.vm.$nextTick()

      expect(wrapper.get('[role="status"]').text()).toBe(
        "Couldn't play this range: Invalid data found",
      )
    })
  })
})
