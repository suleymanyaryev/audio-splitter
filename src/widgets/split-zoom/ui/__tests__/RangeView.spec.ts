import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { nextTick } from 'vue'
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
  const backToRangeStart = vi.spyOn(audition, 'backToRangeStart').mockImplementation(() => {})
  const wrapper = mount(RangeView)
  return { audition, toggleRange, backToRangeStart, wrapper }
}

// jsdom has no PointerEvent: a mouse event of that name, with the pointer's id.
async function pointer(
  view: { element: Element },
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
) {
  const event = new MouseEvent(type, { clientX, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  view.element.dispatchEvent(event)
  await nextTick()
}

// The view is 1,000 px wide, from the page's left edge: the range's 10 s is 100 px a second.
function measured(wrapper: ReturnType<typeof setup>['wrapper']) {
  const view = wrapper.get('[role="group"]')
  vi.spyOn(view.element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 1000,
  } as DOMRect)
  view.element.setPointerCapture = vi.fn()
  return view
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

  describe('Home', () => {
    it('moves the playhead to the range’s start, and is not a page scroll', async () => {
      const { backToRangeStart, wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })

      wrapper.get('[role="group"]').element.dispatchEvent(event)

      expect(backToRangeStart).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('dragging the playhead', () => {
    it('takes hold of the playhead at the range’s start, moves it with the pointer and lets go', async () => {
      const { audition, wrapper } = setup()
      const grab = vi.spyOn(audition, 'grabPlayhead')
      const seek = vi.spyOn(audition, 'seekRange')
      const drop = vi.spyOn(audition, 'dropPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 4)
      await pointer(view, 'pointermove', 504)
      await pointer(view, 'pointerup', 504)

      expect(grab).toHaveBeenCalledOnce()
      // Grabbed 4 px right of the line, so the line stays 4 px left of the pointer.
      expect(seek).toHaveBeenLastCalledWith(15)
      expect(audition.rangePlayheadSeconds()).toBe(15)
      expect(drop).toHaveBeenCalledOnce()
    })

    it('holds the playhead to the range when the pointer goes past its ends', async () => {
      const { audition, wrapper } = setup()
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 0)
      await pointer(view, 'pointermove', 1400)
      expect(audition.rangePlayheadSeconds()).toBe(20)

      await pointer(view, 'pointermove', -300)
      expect(audition.rangePlayheadSeconds()).toBe(10)
    })

    it('leaves a press away from the playhead alone', async () => {
      const { audition, wrapper } = setup()
      const grab = vi.spyOn(audition, 'grabPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 300)
      await pointer(view, 'pointermove', 600)

      expect(grab).not.toHaveBeenCalled()
      expect(audition.rangePlayheadSeconds()).toBe(10)
    })

    it('shows the resize cursor over the playhead and while it is dragged', async () => {
      const { wrapper } = setup()
      const view = measured(wrapper)

      expect(view.classes()).not.toContain('cursor-ew-resize')

      await pointer(view, 'pointermove', 3)
      expect(view.classes()).toContain('cursor-ew-resize')

      await pointer(view, 'pointermove', 400)
      expect(view.classes()).not.toContain('cursor-ew-resize')
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
