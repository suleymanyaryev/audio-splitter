import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { nextTick } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { usePlayerStore } from '../../model/player.ts'
import RangeView from '../RangeView.vue'

enableAutoUnmount(afterEach)

// `prepare` runs before the view mounts, with the split store holding the range of 10 s to 20 s.
function setup(prepare: (split: ReturnType<typeof useSplitStore>) => void = () => {}) {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.open(new Float32Array(2000).fill(-10), { windowSeconds: 0.05, durationSeconds: 100 })
  split.setRange(10, 20)
  prepare(split)
  const player = usePlayerStore()
  const toggleRange = vi.spyOn(player, 'toggle').mockImplementation(() => {})
  const backToRangeStart = vi.spyOn(player, 'backToStart').mockImplementation(() => {})
  const wrapper = mount(RangeView)
  return { player, split, toggleRange, backToRangeStart, wrapper }
}

// Keys belong to the page: the view hears them wherever the focus is.
async function press(init: KeyboardEventInit) {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  await nextTick()
}

/*
jsdom has no PointerEvent: a mouse event of that name, with the pointer's id. The main button is
held from the press to the release, as a move during a drag reports it.
*/
async function pointer(
  view: { element: Element },
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'lostpointercapture',
  clientX: number,
) {
  const buttons = type === 'pointerdown' || type === 'pointermove' ? 1 : 0
  const event = new MouseEvent(type, { clientX, buttons, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  view.element.dispatchEvent(event)
  await nextTick()
}

async function doubleClick(view: { element: Element }, clientX: number, button = 0) {
  view.element.dispatchEvent(new MouseEvent('dblclick', { clientX, button, bubbles: true }))
  await nextTick()
}

// A press or a double-click on the canvas, low down where the spectrogram strip is.
async function onTheStrip(
  wrapper: { get: (selector: string) => { element: Element } },
  type: 'pointerdown' | 'dblclick',
  clientX: number,
) {
  const event = new MouseEvent(type, { clientX, clientY: 240, buttons: 1, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  wrapper.get('canvas').element.dispatchEvent(event)
  await nextTick()
}

/*
A spectrogram of 100 s at 44.1 kHz whose band 62 (955 to 1001 Hz) reads 173 (−32.2 dB) in every
column, and the rest −100 dB; `loud` columns read 255 (0 dB) there instead.
*/
function spectrogramAtOneKilohertz(loud: number[] = []) {
  const bands = new Uint8Array(2000 * 128)
  for (let column = 0; column < 2000; column++) {
    bands[column * 128 + 62] = loud.includes(column) ? 255 : 173
  }
  useSourceFileStore().spectrogram = { bands, bandCount: 128, topHz: 22_050 }
  useSourceFileStore().loudnessWindowSeconds = 0.05
}

// 1 kHz is 81.28 px down a 160 px strip that starts 160 px down the 320 px view.
const ONE_KILOHERTZ_Y = 241.28

async function hover(element: Element, clientX: number, clientY: number) {
  const event = new MouseEvent('pointermove', { clientX, clientY, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  element.dispatchEvent(event)
  await nextTick()
}

async function leave(element: Element) {
  element.dispatchEvent(new MouseEvent('pointerleave'))
  await nextTick()
}

// The view measured 1,000 px wide and 320 px tall, from the page's top left corner.
function measuredWithStrip(wrapper: { get: (selector: string) => { element: Element } }) {
  const view = wrapper.get('[role="slider"]')
  vi.spyOn(view.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1000, 320))
  return view
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

  it('is a slider on the playhead, not a tab stop, with the range’s waveform in it', () => {
    const { wrapper } = setup()

    const view = wrapper.get('[role="slider"]')

    expect(view.attributes('aria-label')).toBe('Playhead in the range')
    expect(view.attributes('tabindex')).toBe('-1')
    expect(view.find('canvas[aria-label="Waveform and spectrogram of the range"]').exists()).toBe(
      true,
    )
  })

  describe('ARIA', () => {
    it('spans the range, with the playhead at its start for a new range', () => {
      const { wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      expect(view.attributes('aria-valuemin')).toBe('10')
      expect(view.attributes('aria-valuemax')).toBe('20')
      expect(view.attributes('aria-valuenow')).toBe('10')
      expect(view.attributes('aria-valuetext')).toBe('0:00:10.00')
    })

    it('follows the playhead, with hundredths, and not the mark', async () => {
      const { player, split, wrapper } = setup()

      split.placeMark(18)
      player.seek(14.256)
      await nextTick()

      const view = wrapper.get('[role="slider"]')
      expect(view.attributes('aria-valuenow')).toBe('14.256')
      expect(view.attributes('aria-valuetext')).toBe('0:00:14.26')
    })
  })

  describe('the slider while the range starts between whole seconds', () => {
    it('never reads under the start of the range while it plays', async () => {
      const frames: FrameRequestCallback[] = []
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
      })
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
      const { player, wrapper } = setup((split) => {
        split.setRange(12.34, 20)
      })
      vi.spyOn(player, 'playheadSeconds').mockReturnValue(12.5)
      player.status = 'playing'
      await nextTick()

      frames.at(-1)?.(0)
      await nextTick()

      const view = wrapper.get('[role="slider"]')
      expect(view.attributes('aria-valuenow')).toBe('12.34')
      expect(view.attributes('aria-valuetext')).toBe('0:00:12.34')
    })
  })

  describe('a key the view acts on', () => {
    it('is reported, and a key it leaves alone is not', async () => {
      const { wrapper } = setup()

      await press({ key: 'ArrowRight' })
      await press({ key: 'x' })

      expect(wrapper.emitted('acted')).toHaveLength(1)
    })

    it('is not Enter with no mark, which has nothing to add a split at', async () => {
      const { wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(wrapper.emitted('acted')).toBeUndefined()
      expect(event.defaultPrevented).toBe(false)
    })
  })

  describe('a key with Ctrl, Cmd or Alt held', () => {
    it('is left to the browser', async () => {
      const { split, toggleRange, backToRangeStart } = setup((store) => {
        store.placeMark(15)
      })

      for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
        for (const key of ['ArrowLeft', 'ArrowRight', 'Enter', 'Home', ' ']) {
          const event = new KeyboardEvent('keydown', {
            key,
            [modifier]: true,
            bubbles: true,
            cancelable: true,
          })
          document.dispatchEvent(event)
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
      const { split } = setup((store) => {
        store.placeMark(15)
      })
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(split.splits.map((point) => point.seconds)).toEqual([15])
      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('range')
      expect(split.markSeconds).toBe(15)
      expect(event.defaultPrevented).toBe(true)
    })

    it('does nothing with no mark', async () => {
      const { split } = setup()

      await press({ key: 'Enter' })

      expect(split.splits).toEqual([])
    })

    it('is left to the browser while "Add split" would be disabled: no room at the mark', async () => {
      const { split } = setup((store) => {
        store.addSplitAt(15)
        store.placeMark(15.5)
      })
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(split.splits.map((point) => point.seconds)).toEqual([15])
      expect(event.defaultPrevented).toBe(false)
    })

    it('ignores the auto-repeat of a held key', async () => {
      const { split } = setup((store) => {
        store.placeMark(15)
      })

      await press({ key: 'Enter' })
      await press({ key: 'Enter', repeat: true })
      split.placeMark(17.5)
      await press({ key: 'Enter', repeat: true })

      expect(split.splits.map((point) => point.seconds)).toEqual([15])
    })
  })

  describe('Shift and Enter', () => {
    it('add a split where the playhead is, and keep the mark, the view and the selection', async () => {
      const { player, split } = setup((store) => {
        store.placeMark(12)
      })
      player.seek(16.4)
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })

      document.dispatchEvent(event)

      expect(split.splits.map((point) => point.seconds)).toEqual([16.4])
      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('range')
      expect(split.markSeconds).toBe(12)
      expect(event.defaultPrevented).toBe(true)
    })

    it('add it on the 10 ms grid, wherever the sound is', async () => {
      const { player } = setup()
      const split = useSplitStore()
      vi.spyOn(player, 'playheadSeconds').mockReturnValue(16.4371)

      await press({ key: 'Enter', shiftKey: true })

      expect(split.splits.map((point) => point.seconds)).toEqual([16.44])
    })

    it('do not stop the sound, pause it or move the playhead', async () => {
      const { player, split, toggleRange } = setup()
      const stop = vi.spyOn(player, 'stop')
      const seek = vi.spyOn(player, 'seek')
      player.status = 'playing'
      vi.spyOn(player, 'playheadSeconds').mockReturnValue(16.4)

      await press({ key: 'Enter', shiftKey: true })

      expect(split.splits).toHaveLength(1)
      expect(player.status).toBe('playing')
      expect(stop).not.toHaveBeenCalled()
      expect(seek).not.toHaveBeenCalled()
      expect(toggleRange).not.toHaveBeenCalled()
    })

    it('add several splits in one listen, a second apart or more', async () => {
      const { player, split } = setup()
      const heard = vi.spyOn(player, 'playheadSeconds')

      for (const seconds of [11, 12.5, 12.9, 15]) {
        heard.mockReturnValue(seconds)
        await press({ key: 'Enter', shiftKey: true })
      }

      expect(split.splits.map((point) => point.seconds)).toEqual([11, 12.5, 15])
    })

    it('ignore the auto-repeat of a held key', async () => {
      const { player, split } = setup()
      const heard = vi.spyOn(player, 'playheadSeconds')

      heard.mockReturnValue(11)
      await press({ key: 'Enter', shiftKey: true })
      heard.mockReturnValue(14)
      await press({ key: 'Enter', shiftKey: true, repeat: true })

      expect(split.splits.map((point) => point.seconds)).toEqual([11])
    })

    it('add nothing within a second of a split or of the file’s ends', async () => {
      const { player, split } = setup((store) => {
        store.addSplitAt(15)
      })
      const heard = vi.spyOn(player, 'playheadSeconds')

      for (const seconds of [15.5, 14.5, 0.5, 99.5]) {
        heard.mockReturnValue(seconds)
        await press({ key: 'Enter', shiftKey: true })
      }

      expect(split.splits.map((point) => point.seconds)).toEqual([15])
    })
  })

  describe('Space', () => {
    it('plays or pauses the range, and is not a page scroll', async () => {
      const { toggleRange } = setup()
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(toggleRange).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('dragging the playhead', () => {
    it('takes hold of the playhead at the range’s start, moves it with the pointer and lets go', async () => {
      const { player, wrapper } = setup()
      const grab = vi.spyOn(player, 'grabPlayhead')
      const seek = vi.spyOn(player, 'seek')
      const drop = vi.spyOn(player, 'dropPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 4)
      // The resize cursor shows while the playhead is held.
      expect(view.classes()).toContain('cursor-ew-resize')
      await pointer(view, 'pointermove', 504)
      await pointer(view, 'pointerup', 504)
      expect(view.classes()).not.toContain('cursor-ew-resize')

      expect(grab).toHaveBeenCalledOnce()
      // Grabbed 4 px right of the line, so the line stays 4 px left of the pointer.
      expect(seek).toHaveBeenLastCalledWith(15)
      expect(player.playheadSeconds()).toBe(15)
      expect(drop).toHaveBeenCalledOnce()
    })

    it.each(['pointercancel', 'lostpointercapture'] as const)('lets go on %s', async (type) => {
      const { player, wrapper } = setup()
      const drop = vi.spyOn(player, 'dropPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 4)
      await pointer(view, type, 4)

      expect(drop).toHaveBeenCalledOnce()
      expect(view.classes()).not.toContain('cursor-ew-resize')
    })
  })

  describe('a press', () => {
    it('places the mark where it lands, leaving playback alone', async () => {
      const { player, split, toggleRange, wrapper } = setup()
      const view = measured(wrapper)
      const stop = vi.spyOn(player, 'stop')

      await pointer(view, 'pointerdown', 700)

      expect(split.markSeconds).toBe(17)
      expect(toggleRange).not.toHaveBeenCalled()
      expect(stop).not.toHaveBeenCalled()
    })

    it('places no mark where it takes hold of the playhead, or with another button than the main one', async () => {
      const { split, wrapper } = setup()
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 4)
      await pointer(view, 'pointerup', 4)
      const secondary = new MouseEvent('pointerdown', { clientX: 700, button: 2, buttons: 2 })
      Object.defineProperty(secondary, 'pointerId', { value: 1 })
      view.element.dispatchEvent(secondary)
      await nextTick()

      expect(split.markSeconds).toBeNull()
    })

    it('rounds the mark to 10 ms, as a dragged split is', async () => {
      const { split, wrapper } = setup()
      const view = measured(wrapper)

      // 17.004 s is at x = 700.4.
      await pointer(view, 'pointerdown', 700.4)

      expect(split.markSeconds).toBe(17)
    })

    it('on a split’s line places the mark there, and never leaves the view', async () => {
      const { split, wrapper } = setup((store) => {
        // A split at 15 s, nothing selected, and the range's view shown.
        store.moveZoomTo(15)
        store.addSplit()
        store.moveZoomTo(0)
        store.showView('range')
      })
      const view = measured(wrapper)
      expect(split.selectedSplit).toBeNull()

      await pointer(view, 'pointerdown', 502)

      expect(split.markSeconds).toBeCloseTo(15.02, 9)
      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('range')
    })
  })

  describe('the readout under the pointer', () => {
    beforeEach(() => {
      spectrogramAtOneKilohertz()
    })

    it('shows the frequency and level under the pointer on the spectrogram strip', async () => {
      const { wrapper } = setup()
      const view = measuredWithStrip(wrapper)

      await hover(view.element, 400, ONE_KILOHERTZ_Y)

      expect(wrapper.text()).toContain('1.0 kHz · −32 dB')
    })

    it('is gone once the pointer leaves the view', async () => {
      const { wrapper } = setup()
      const view = measuredWithStrip(wrapper)
      await hover(view.element, 400, ONE_KILOHERTZ_Y)

      await leave(view.element)

      expect(wrapper.text()).not.toContain('kHz')
    })

    it('shows nothing over the waveform', async () => {
      const { wrapper } = setup()
      const view = measuredWithStrip(wrapper)
      await hover(view.element, 400, ONE_KILOHERTZ_Y)

      await hover(view.element, 450, 80)

      expect(wrapper.text()).not.toContain('kHz')
    })

    it('reads the column under the pointer, not the loudest one the pixel shows', async () => {
      // 10 s on 100 px: a pixel is 0.1 s, two 50 ms columns. The pixel at 70 px covers columns
      // 340 and 341, and shows 341's 0 dB; the pointer is at 17.002 s, in the quieter column 340.
      spectrogramAtOneKilohertz([341])
      const { wrapper } = setup()
      const view = wrapper.get('[role="slider"]')
      vi.spyOn(view.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 320))

      await hover(view.element, 70.02, ONE_KILOHERTZ_Y)

      expect(wrapper.text()).toContain('1.0 kHz · −32 dB')
    })
  })

  describe('the spectrogram strip', () => {
    it('places the mark at a press, as the waveform does', async () => {
      const { split, wrapper } = setup()
      measured(wrapper)

      await onTheStrip(wrapper, 'pointerdown', 700)

      expect(split.markSeconds).toBe(17)
    })

    it('moves the playhead at a double-click, as the waveform does', async () => {
      const { player, wrapper } = setup()
      measured(wrapper)

      await onTheStrip(wrapper, 'dblclick', 300)

      expect(player.playheadSeconds()).toBe(13)
    })

    it('selects a split at a double-click on its line and opens the Split view', async () => {
      const { split, wrapper } = setup((store) => {
        store.moveZoomTo(15)
        store.addSplit()
        store.moveZoomTo(0)
        store.showView('range')
      })
      measured(wrapper)

      await onTheStrip(wrapper, 'dblclick', 505)

      expect(split.selectedSplit?.seconds).toBe(15)
      expect(split.view).toBe('split')
    })
  })

  describe('a double-click', () => {
    it('moves the playhead there, and not the mark', async () => {
      const { player, split, wrapper } = setup((store) => {
        store.placeMark(12)
      })
      const view = measured(wrapper)

      await doubleClick(view, 700)

      expect(player.playheadSeconds()).toBe(17)
      expect(split.markSeconds).toBe(12)
      expect(split.view).toBe('range')
    })

    it('moves the playhead through the player’s seek, which a playing range plays on from', async () => {
      const { player, wrapper } = setup()
      const seek = vi.spyOn(player, 'seek')
      const view = measured(wrapper)

      await doubleClick(view, 300)

      expect(seek).toHaveBeenCalledExactlyOnceWith(13)
    })

    it('with another button than the main one moves nothing and selects nothing', async () => {
      const { player, split, wrapper } = setup((store) => {
        store.moveZoomTo(15)
        store.addSplit()
        store.moveZoomTo(0)
        store.showView('range')
      })
      const seek = vi.spyOn(player, 'seek')
      const view = measured(wrapper)

      await doubleClick(view, 300, 2)
      await doubleClick(view, 505, 2)

      expect(seek).not.toHaveBeenCalled()
      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('range')
    })

    it('within 6 px of a split’s line selects that split and opens the Split view', async () => {
      const { split, wrapper } = setup((store) => {
        store.moveZoomTo(15)
        store.addSplit()
        store.moveZoomTo(0)
        store.showView('range')
      })
      const view = measured(wrapper)
      expect(split.selectedSplit).toBeNull()

      await doubleClick(view, 505)

      expect(split.selectedSplit?.seconds).toBe(15)
      expect(split.view).toBe('split')
    })

    it('7 px from a split’s line moves the playhead instead', async () => {
      const { player, split, wrapper } = setup((store) => {
        store.moveZoomTo(15)
        store.addSplit()
        store.moveZoomTo(0)
        store.showView('range')
      })
      const view = measured(wrapper)

      await doubleClick(view, 507)

      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('range')
      expect(player.playheadSeconds()).toBeCloseTo(15.07, 9)
    })
  })

  describe('the failure line', () => {
    it('shows a failure to play', async () => {
      const { player, wrapper } = setup()

      player.failure = "Couldn't play this range: Invalid data found"
      await wrapper.vm.$nextTick()

      expect(wrapper.get('[role="status"]').text()).toBe(
        "Couldn't play this range: Invalid data found",
      )
    })
  })
})
