import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { nextTick } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { trackStretch } from '../../lib/track-extent.ts'
import { useAuditionStore } from '../../model/audition.ts'
import TrackView from '../TrackView.vue'

enableAutoUnmount(afterEach)

/*
100 s at 50 ms per window: loud, a 2 s silence from 20 s, loud, a 2 s silence from 70.5 s, loud. The
splits are at 21 s and 71.5 s, so the second track runs from 21 s to 71.5 s, 50.5 s.
*/
function curveWithTwoGaps() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 400, 440)
  curve.fill(-70, 1410, 1450)
  return curve
}

// The second track is selected before the view mounts.
function setup() {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
  split.selectTrack(split.tracks[1]!)
  const audition = useAuditionStore()
  const toggleStretch = vi.spyOn(audition, 'toggleStretch').mockImplementation(() => {})
  const backToStretchStart = vi.spyOn(audition, 'backToStretchStart').mockImplementation(() => {})
  const wrapper = mount(TrackView)
  const stretch = trackStretch(split.selectedTrack!)
  return { audition, split, stretch, toggleStretch, backToStretchStart, wrapper }
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

// The view is 1,000 px wide, from the page's left edge: the track's 50.5 s is 19.8 px a second.
function measured(wrapper: ReturnType<typeof setup>['wrapper']) {
  const view = wrapper.get('[role="slider"]')
  vi.spyOn(view.element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 1000,
  } as DOMRect)
  view.element.setPointerCapture = vi.fn()
  return view
}

describe('TrackView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is a focusable slider on the playhead, with the track’s waveform in it', () => {
    const { wrapper } = setup()

    const view = wrapper.get('[role="slider"]')

    expect(view.attributes('aria-label')).toBe('Playhead in the track')
    expect(view.attributes('tabindex')).toBe('0')
    expect(view.find('canvas[aria-label="Waveform of the track"]').exists()).toBe(true)
  })

  describe('ARIA', () => {
    it('spans the track, with the playhead at its start for a new track', () => {
      const { wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      expect(view.attributes('aria-valuemin')).toBe('21')
      expect(view.attributes('aria-valuemax')).toBe('71.5')
      expect(view.attributes('aria-valuenow')).toBe('21')
      expect(view.attributes('aria-valuetext')).toBe('0:00:21.00')
    })

    it('follows the playhead, with hundredths', async () => {
      const { audition, stretch, wrapper } = setup()

      audition.seekStretch(stretch, 30.256)
      await nextTick()

      const view = wrapper.get('[role="slider"]')
      expect(view.attributes('aria-valuenow')).toBe('30.256')
      expect(view.attributes('aria-valuetext')).toBe('0:00:30.26')
    })

    it('ends at the first 10 min of a longer track, which is all the player plays', () => {
      useSourceFileStore().durationSeconds = 1000
      const split = useSplitStore()
      split.detect(new Float32Array(20_000).fill(-10), {
        windowSeconds: 0.05,
        durationSeconds: 1000,
      })
      split.selectTrack(split.tracks[0]!)

      const wrapper = mount(TrackView)

      expect(wrapper.get('[role="slider"]').attributes('aria-valuemax')).toBe('600')
    })
  })

  describe('Left and Right', () => {
    it('move the playhead 1 s, and 10 s with Shift', async () => {
      const { audition, stretch, wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      await view.trigger('keydown', { key: 'ArrowRight' })
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(22)

      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(32)

      await view.trigger('keydown', { key: 'ArrowLeft' })
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(31)

      await view.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(21)
    })

    it('hold the playhead inside the track, and are not a page scroll', async () => {
      const { audition, stretch, wrapper } = setup()
      const view = wrapper.get('[role="slider"]')
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
      })

      view.element.dispatchEvent(event)
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(21)
      expect(event.defaultPrevented).toBe(true)

      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      await view.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(71.5)
    })

    it('leave playback and the splits alone', async () => {
      const { split, toggleStretch, wrapper } = setup()

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight' })

      expect(toggleStretch).not.toHaveBeenCalled()
      expect(split.splits).toHaveLength(2)
      expect(split.selectedTrack?.number).toBe(2)
    })
  })

  describe('a key with Ctrl, Cmd or Alt held', () => {
    it('is left to the browser', () => {
      const { audition, stretch, toggleStretch, backToStretchStart, wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
        for (const key of ['ArrowLeft', 'ArrowRight', 'Home', ' ']) {
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

      expect(audition.stretchPlayheadSeconds(stretch)).toBe(21)
      expect(toggleStretch).not.toHaveBeenCalled()
      expect(backToStretchStart).not.toHaveBeenCalled()
    })
  })

  describe('Space', () => {
    it('plays or pauses the track, and is not a page scroll', () => {
      const { stretch, toggleStretch, wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })

      wrapper.get('[role="slider"]').element.dispatchEvent(event)

      expect(toggleStretch).toHaveBeenCalledExactlyOnceWith(stretch)
      expect(event.defaultPrevented).toBe(true)
    })

    it('ignores the auto-repeat of a held key', async () => {
      const { toggleStretch, wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      await view.trigger('keydown', { key: ' ' })
      await view.trigger('keydown', { key: ' ', repeat: true })
      await view.trigger('keydown', { key: ' ', repeat: true })

      expect(toggleStretch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Home', () => {
    it('moves the playhead to the track’s start, and is not a page scroll', () => {
      const { stretch, backToStretchStart, wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })

      wrapper.get('[role="slider"]').element.dispatchEvent(event)

      expect(backToStretchStart).toHaveBeenCalledExactlyOnceWith(stretch)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('Delete and Backspace', () => {
    it('do nothing: no split goes, no track goes, and the key is left alone', () => {
      const { audition, split, stretch, toggleStretch, wrapper } = setup()
      const deleteSplit = vi.spyOn(split, 'deleteSplit')
      const view = wrapper.get('[role="slider"]')

      for (const key of ['Delete', 'Backspace']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        view.element.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(false)
      }

      expect(deleteSplit).not.toHaveBeenCalled()
      expect(split.splits).toHaveLength(2)
      expect(split.selectedTrack?.number).toBe(2)
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(21)
      expect(toggleStretch).not.toHaveBeenCalled()
    })

    it('leave other keys alone too', async () => {
      const { toggleStretch, wrapper } = setup()

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'a' })

      expect(toggleStretch).not.toHaveBeenCalled()
    })
  })

  describe('a press', () => {
    it('moves the playhead where it lands and focuses the view, leaving playback alone', async () => {
      const { audition, stretch, toggleStretch, wrapper } = setup()
      const view = measured(wrapper)
      document.body.append(wrapper.element)

      // 400 px of 1000 is 40 % of 50.5 s from 21 s.
      await pointer(view, 'pointerdown', 400)
      await pointer(view, 'pointerup', 400)

      expect(audition.stretchPlayheadSeconds(stretch)).toBeCloseTo(41.2, 9)
      expect(document.activeElement).toBe(view.element)
      expect(toggleStretch).not.toHaveBeenCalled()
    })

    it('moves the playhead from a press near an end split, and selects no split', async () => {
      const { audition, split, stretch, wrapper } = setup()
      const grab = vi.spyOn(audition, 'grabPlayhead')
      const view = measured(wrapper)
      audition.seekStretch(stretch, 40)
      await nextTick()

      await pointer(view, 'pointerdown', 997)
      await pointer(view, 'pointerup', 997)

      expect(grab).not.toHaveBeenCalled()
      // 3 px short of the end split's line, which is 71.5 s: the playhead goes there, no split does.
      expect(audition.stretchPlayheadSeconds(stretch)).toBeCloseTo(71.35, 9)
      expect(split.selectedSplit).toBeNull()
      expect(split.selectedTrack?.number).toBe(2)
      expect(split.view).toBe('track')
    })
  })

  describe('dragging the playhead', () => {
    it('takes hold of the playhead at the track’s start, moves it with the pointer and lets go', async () => {
      const { audition, stretch, wrapper } = setup()
      const grab = vi.spyOn(audition, 'grabPlayhead')
      const seek = vi.spyOn(audition, 'seekStretch')
      const drop = vi.spyOn(audition, 'dropPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 4)
      await pointer(view, 'pointermove', 504)
      await pointer(view, 'pointerup', 504)

      expect(grab).toHaveBeenCalledOnce()
      // Grabbed 4 px right of the line, so the line stays 4 px left of the pointer.
      expect(seek).toHaveBeenLastCalledWith(stretch, 46.25)
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(46.25)
      expect(drop).toHaveBeenCalledExactlyOnceWith(stretch)
    })

    it('holds the playhead to the track when the pointer goes past its ends', async () => {
      const { audition, stretch, wrapper } = setup()
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 0)
      await pointer(view, 'pointermove', 1400)
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(71.5)

      await pointer(view, 'pointermove', -300)
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(21)
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

    it('says why the track could not be played', async () => {
      const { audition, wrapper } = setup()

      audition.failure = "Couldn't play this track: Invalid data found"
      await wrapper.vm.$nextTick()

      expect(wrapper.get('[role="status"]').text()).toBe(
        "Couldn't play this track: Invalid data found",
      )
    })
  })
})
