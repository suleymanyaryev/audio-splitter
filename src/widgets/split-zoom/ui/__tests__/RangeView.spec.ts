import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { nextTick } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useAuditionStore } from '../../model/audition.ts'
import RangeView from '../RangeView.vue'

enableAutoUnmount(afterEach)

// `prepare` runs before the view mounts, with the split store holding the range of 10 s to 20 s.
function setup(prepare: (split: ReturnType<typeof useSplitStore>) => void = () => {}) {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.detect(new Float32Array(2000).fill(-10), { windowSeconds: 0.05, durationSeconds: 100 })
  split.setRange(10, 20)
  prepare(split)
  const audition = useAuditionStore()
  const toggleRange = vi.spyOn(audition, 'toggleStretch').mockImplementation(() => {})
  const backToRangeStart = vi.spyOn(audition, 'backToStretchStart').mockImplementation(() => {})
  const wrapper = mount(RangeView)
  return { audition, split, toggleRange, backToRangeStart, wrapper }
}

/*
jsdom has no PointerEvent: a mouse event of that name, with the pointer's id. The main button is
held from the press to the release, as a move during a drag reports it.
*/
async function pointer(
  view: { element: Element },
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
) {
  const buttons = type === 'pointerup' ? 0 : 1
  const event = new MouseEvent(type, { clientX, buttons, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  view.element.dispatchEvent(event)
  await nextTick()
}

// The view is 1,000 px wide, from the page's left edge: the range's 10 s is 100 px a second.
function measured(wrapper: ReturnType<typeof setup>['wrapper']) {
  const view = wrapper.get('[role="slider"]')
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

  it('is a focusable slider on the mark, with the range’s waveform in it', () => {
    const { wrapper } = setup()

    const view = wrapper.get('[role="slider"]')

    expect(view.attributes('aria-label')).toBe('Mark in the range')
    expect(view.attributes('tabindex')).toBe('0')
    expect(view.find('canvas[aria-label="Waveform of the range"]').exists()).toBe(true)
  })

  describe('ARIA', () => {
    it('spans the range, and says there is no mark while there is none', () => {
      const { wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      expect(view.attributes('aria-valuemin')).toBe('10')
      expect(view.attributes('aria-valuemax')).toBe('20')
      expect(view.attributes('aria-valuenow')).toBeUndefined()
      expect(view.attributes('aria-valuetext')).toBe('No mark')
    })

    it('gives the mark’s time, with hundredths', async () => {
      const { split, wrapper } = setup()

      split.placeMark(14.25)
      await nextTick()

      const view = wrapper.get('[role="slider"]')
      expect(view.attributes('aria-valuenow')).toBe('14.25')
      expect(view.attributes('aria-valuetext')).toBe('0:00:14.25')
    })
  })

  describe('the mark’s keys', () => {
    it('move the mark 100 ms with Left and Right, and 1 s with Shift', async () => {
      const { split, wrapper } = setup((store) => {
        store.placeMark(15)
      })
      const view = wrapper.get('[role="slider"]')

      await view.trigger('keydown', { key: 'ArrowRight' })
      expect(split.markSeconds).toBeCloseTo(15.1, 9)

      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      expect(split.markSeconds).toBeCloseTo(16.1, 9)

      await view.trigger('keydown', { key: 'ArrowLeft' })
      await view.trigger('keydown', { key: 'ArrowLeft' })
      expect(split.markSeconds).toBeCloseTo(15.9, 9)

      await view.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
      expect(split.markSeconds).toBeCloseTo(14.9, 9)
    })

    it('do not drift: ten steps of 100 ms make exactly a second', async () => {
      const { split, wrapper } = setup((store) => {
        store.placeMark(15)
      })
      const view = wrapper.get('[role="slider"]')

      for (let step = 0; step < 10; step++) await view.trigger('keydown', { key: 'ArrowRight' })

      expect(split.markSeconds).toBe(16)
    })

    it('hold the mark inside the range', async () => {
      const { split, wrapper } = setup((store) => {
        store.placeMark(19.95)
      })
      const view = wrapper.get('[role="slider"]')

      await view.trigger('keydown', { key: 'ArrowRight' })
      expect(split.markSeconds).toBe(20)

      await view.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
      await view.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
      for (let step = 0; step < 20; step++)
        await view.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
      expect(split.markSeconds).toBe(10)
    })

    it('start from the playhead when there is no mark yet, and are not a page scroll', async () => {
      const { audition, split, wrapper } = setup()
      audition.seekStretch(split.range!, 12)
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })

      wrapper.get('[role="slider"]').element.dispatchEvent(event)

      expect(split.markSeconds).toBeCloseTo(12.1, 9)
      expect(event.defaultPrevented).toBe(true)
    })

    it('leave playback alone', async () => {
      const { toggleRange, wrapper } = setup((store) => {
        store.placeMark(15)
      })

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight' })

      expect(toggleRange).not.toHaveBeenCalled()
    })
  })

  describe('a key with Ctrl, Cmd or Alt held', () => {
    it('is left to the browser', async () => {
      const { split, toggleRange, backToRangeStart, wrapper } = setup((store) => {
        store.placeMark(15)
      })
      const view = wrapper.get('[role="slider"]')

      for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
        for (const key of ['ArrowLeft', 'ArrowRight', 'Enter', 'Home', ' ']) {
          const event = new KeyboardEvent('keydown', {
            key,
            [modifier]: true,
            bubbles: true,
            cancelable: true,
          })
          view.element.dispatchEvent(event)
          expect(event.defaultPrevented).toBe(false)
        }
      }

      expect(split.markSeconds).toBe(15)
      expect(split.splits).toEqual([])
      expect(toggleRange).not.toHaveBeenCalled()
      expect(backToRangeStart).not.toHaveBeenCalled()
    })
  })

  describe('Enter', () => {
    it('adds a split at the mark, and keeps the mark, the view and the selection', async () => {
      const { split, wrapper } = setup((store) => {
        store.placeMark(15)
      })
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })

      wrapper.get('[role="slider"]').element.dispatchEvent(event)

      expect(split.splits.map((point) => point.seconds)).toEqual([15])
      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('range')
      expect(split.markSeconds).toBe(15)
      expect(event.defaultPrevented).toBe(true)
    })

    it('does nothing with no mark', async () => {
      const { split, wrapper } = setup()

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'Enter' })

      expect(split.splits).toEqual([])
    })
  })

  describe('Space', () => {
    it('plays or pauses the range, and is not a page scroll', async () => {
      const { toggleRange, wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })

      wrapper.get('[role="slider"]').element.dispatchEvent(event)

      expect(toggleRange).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })

    it('ignores the auto-repeat of a held key', async () => {
      const { toggleRange, wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      await view.trigger('keydown', { key: ' ' })
      await view.trigger('keydown', { key: ' ', repeat: true })
      await view.trigger('keydown', { key: ' ', repeat: true })

      expect(toggleRange).toHaveBeenCalledTimes(1)
    })

    it('leaves other keys alone', async () => {
      const { split, toggleRange, wrapper } = setup((store) => {
        store.placeMark(15)
      })

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'a' })

      expect(toggleRange).not.toHaveBeenCalled()
      expect(split.splits).toEqual([])
      expect(split.markSeconds).toBe(15)
    })
  })

  describe('Home', () => {
    it('moves the playhead to the range’s start, and is not a page scroll', async () => {
      const { backToRangeStart, wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })

      wrapper.get('[role="slider"]').element.dispatchEvent(event)

      expect(backToRangeStart).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('dragging the playhead', () => {
    it('takes hold of the playhead at the range’s start, moves it with the pointer and lets go', async () => {
      const { audition, split, wrapper } = setup()
      const grab = vi.spyOn(audition, 'grabPlayhead')
      const seek = vi.spyOn(audition, 'seekStretch')
      const drop = vi.spyOn(audition, 'dropPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 4)
      await pointer(view, 'pointermove', 504)
      await pointer(view, 'pointerup', 504)

      expect(grab).toHaveBeenCalledOnce()
      // Grabbed 4 px right of the line, so the line stays 4 px left of the pointer.
      expect(seek).toHaveBeenLastCalledWith(split.range, 15)
      expect(audition.stretchPlayheadSeconds(split.range!)).toBe(15)
      expect(drop).toHaveBeenCalledOnce()
    })

    it('holds the playhead to the range when the pointer goes past its ends', async () => {
      const { audition, split, wrapper } = setup()
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 0)
      await pointer(view, 'pointermove', 1400)
      expect(audition.stretchPlayheadSeconds(split.range!)).toBe(20)

      await pointer(view, 'pointermove', -300)
      expect(audition.stretchPlayheadSeconds(split.range!)).toBe(10)
    })

    it('does not take hold of the playhead from a press away from it', async () => {
      const { audition, split, wrapper } = setup()
      const grab = vi.spyOn(audition, 'grabPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 300)
      await pointer(view, 'pointermove', 600)

      expect(grab).not.toHaveBeenCalled()
      expect(audition.stretchPlayheadSeconds(split.range!)).toBe(10)
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

  describe('a press', () => {
    it('places the mark where it lands and focuses the view, leaving playback alone', async () => {
      const { audition, split, toggleRange, wrapper } = setup()
      const view = measured(wrapper)
      const focus = vi.spyOn(view.element as HTMLElement, 'focus')
      const stop = vi.spyOn(audition, 'stop')

      await pointer(view, 'pointerdown', 700)

      expect(split.markSeconds).toBe(17)
      expect(focus).toHaveBeenCalledOnce()
      expect(toggleRange).not.toHaveBeenCalled()
      expect(stop).not.toHaveBeenCalled()
    })

    it('rounds the mark to 10 ms, as a dragged split is', async () => {
      const { split, wrapper } = setup()
      const view = measured(wrapper)

      // 17.004 s is at x = 700.4.
      await pointer(view, 'pointerdown', 700.4)

      expect(split.markSeconds).toBe(17)
    })

    it('selects the split whose line is within 6 px, and switches to the Split view', async () => {
      const { split, wrapper } = setup((store) => {
        // A split at 15 s, nothing selected, and the range's view shown.
        store.moveZoomTo(15)
        store.addSplit()
        store.moveZoomTo(0)
        store.showView('range')
      })
      const view = measured(wrapper)
      expect(split.selectedSplit).toBeNull()

      await pointer(view, 'pointerdown', 505)

      expect(split.selectedSplit?.seconds).toBe(15)
      expect(split.view).toBe('split')
      expect(split.markSeconds).toBeNull()
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
