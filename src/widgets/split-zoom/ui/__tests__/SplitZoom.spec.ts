import { afterEach, beforeEach, describe, it, expect, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useAuditionStore } from '../../model/audition.ts'
import SplitZoom from '../SplitZoom.vue'

/*
100 s at 50 ms per window: loud, a 2 s silence from 20 s, loud, a 2 s silence from 70.5 s, loud.
The splits are at 21 s and 71.5 s.
*/
function curveWithTwoGaps() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 400, 440)
  curve.fill(-70, 1410, 1450)
  return curve
}

function setup() {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
  // Detection opens on track 1; this spec is about the zoom view, on split 1.
  split.selectSplit(split.splits[0]!.id)
  return { split, wrapper: mount(SplitZoom, { attachTo: document.body }) }
}

// The window of the playhead specs is 11 s to 31 s on 200 px, so 10 px a second.
function mountOnSplit() {
  useSourceFileStore().peaks = new Float32Array(2000)
  return setup()
}

function focusElement(element: Element) {
  if (element instanceof HTMLElement) element.focus()
}

// Keys belong to the page: the view hears them wherever the focus is.
async function press(init: KeyboardEventInit) {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  await nextTick()
}

function mountWithoutSplits() {
  setActivePinia(createPinia())
  useSplitStore().detect(new Float32Array(400).fill(-10), {
    windowSeconds: 0.05,
    durationSeconds: 20,
  })
  return mount(SplitZoom)
}

// The tests that watch focus mount into the document; each wrapper goes after its test.
enableAutoUnmount(afterEach)

describe('SplitZoom', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('the handle', () => {
    it('is a slider on the selected split, named by its number and valued by its time', () => {
      const { wrapper } = setup()

      const handle = wrapper.get('[role="slider"]')

      expect(handle.attributes('aria-label')).toBe('Split 1')
      expect(handle.attributes('aria-valuenow')).toBe('21')
      expect(handle.attributes('aria-valuetext')).toBe('0:00:21.00')
      // The window is 11 to 31 s around the split.
      expect(handle.attributes('aria-valuemin')).toBe('11')
      expect(handle.attributes('aria-valuemax')).toBe('31')
      expect(handle.attributes('tabindex')).toBe('0')
    })

    it('stays at the window position of the split, which is the centre after selecting it', () => {
      const { wrapper } = setup()

      expect(wrapper.get('[role="slider"]').attributes('style')).toContain('left: 50%')
    })

    it('is not there while no split is selected', async () => {
      const { split, wrapper } = setup()

      split.moveZoomTo(40)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[role="slider"]').exists()).toBe(false)
    })

    it('moves the split 10 ms with Left and Right', async () => {
      const { split } = setup()

      await press({ key: 'ArrowRight' })
      expect(split.selectedSplit?.seconds).toBeCloseTo(21.01)

      await press({ key: 'ArrowLeft' })
      await press({ key: 'ArrowLeft' })
      expect(split.selectedSplit?.seconds).toBeCloseTo(20.99)
    })

    it('moves the split 100 ms with Shift and Left or Right', async () => {
      const { split } = setup()

      await press({ key: 'ArrowRight', shiftKey: true })
      expect(split.selectedSplit?.seconds).toBeCloseTo(21.1)

      await press({ key: 'ArrowLeft', shiftKey: true })
      await press({ key: 'ArrowLeft', shiftKey: true })
      expect(split.selectedSplit?.seconds).toBeCloseTo(20.9)
    })

    it('follows the split: the slider value and the handle move with it', async () => {
      const { wrapper } = setup()
      const handle = wrapper.get('[role="slider"]')

      await press({ key: 'ArrowRight', shiftKey: true })

      expect(handle.attributes('aria-valuetext')).toBe('0:00:21.10')
      // 0.1 s right of the centre of a 20 s window: 50.5 %.
      expect(handle.attributes('style')).toContain('left: 50.5%')
    })

    it('stops at the edge of the zoom window', async () => {
      const { split, wrapper } = setup()
      const selected = split.selectedSplit
      if (selected) split.moveSplit(selected.id, 30.95)
      await wrapper.vm.$nextTick()

      await press({ key: 'ArrowRight', shiftKey: true })

      expect(split.selectedSplit?.seconds).toBeCloseTo(31)
    })

    it('does not scroll the page or handle other keys', async () => {
      const { split } = setup()

      const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })
      document.dispatchEvent(arrow)
      const other = new KeyboardEvent('keydown', { key: 'a', cancelable: true })
      document.dispatchEvent(other)

      expect(arrow.defaultPrevented).toBe(true)
      expect(other.defaultPrevented).toBe(false)
      expect(split.splits).toHaveLength(2)
    })
  })

  describe('Space', () => {
    it('plays or stops the audition, and does not scroll the page', () => {
      setup()
      const toggle = vi.spyOn(useAuditionStore(), 'toggle').mockImplementation(() => {})

      const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
      document.dispatchEvent(space)

      expect(toggle).toHaveBeenCalledTimes(1)
      expect(space.defaultPrevented).toBe(true)
    })

    it('does not toggle again while the key is held down', () => {
      setup()
      const toggle = vi.spyOn(useAuditionStore(), 'toggle').mockImplementation(() => {})

      const repeat = new KeyboardEvent('keydown', { key: ' ', repeat: true, cancelable: true })
      document.dispatchEvent(repeat)

      expect(toggle).not.toHaveBeenCalled()
      expect(repeat.defaultPrevented).toBe(true)
    })

    it('leaves the split where it is', async () => {
      const { split } = setup()
      vi.spyOn(useAuditionStore(), 'toggle').mockImplementation(() => {})

      await press({ key: ' ' })

      expect(split.selectedSplit?.seconds).toBe(21)
    })
  })

  describe('the playhead', () => {
    // A 200 x 160 canvas whose 2D context records the 1 px full-height lines it is asked to fill.
    let lines: number[]

    beforeEach(() => {
      lines = []
      const recorder = new Proxy(
        {},
        {
          get: (_target, name) =>
            name === 'fillRect'
              ? (x: number, _y: number, width: number, height: number) => {
                  if (width === 1 && height === 160) lines.push(x)
                }
              : () => {},
          set: () => true,
        },
      )
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        recorder as unknown as CanvasRenderingContext2D,
      )
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 160),
      )
    })

    afterEach(() => {
      vi.restoreAllMocks()
      // jsdom has neither, so the paused test gave them to URL itself.
      Reflect.deleteProperty(URL, 'createObjectURL')
      Reflect.deleteProperty(URL, 'revokeObjectURL')
    })

    it('is drawn at the start of the audition before it is first played', () => {
      mountOnSplit()

      // The split is at 21 s, so the 8 s start at 17 s.
      expect(lines.at(-1)).toBe(60)
    })

    it('stays drawn where the audition was paused', async () => {
      const { wrapper } = mountOnSplit()
      const audition = useAuditionStore()
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
      vi.spyOn(useSourceFileStore(), 'clip').mockResolvedValue({
        wav: Uint8Array.of(1),
        startSeconds: 17,
        lengthSeconds: 8,
      })
      URL.createObjectURL = () => 'blob:clip'
      URL.revokeObjectURL = () => {}

      audition.toggle()
      await new Promise((done) => setTimeout(done, 0))
      const element = vi.mocked(HTMLMediaElement.prototype.play).mock
        .contexts[0] as HTMLAudioElement
      element.currentTime = 2.5
      audition.toggle()
      await wrapper.vm.$nextTick()

      // 17 s + 2.5 s = 19.5 s.
      expect(audition.status).toBe('paused')
      expect(lines.at(-1)).toBe(85)
    })
  })

  describe('the playhead loop', () => {
    let frames: FrameRequestCallback[]
    let requestFrame: MockInstance<typeof requestAnimationFrame>
    let cancelFrame: MockInstance<typeof cancelAnimationFrame>

    beforeEach(() => {
      frames = []
      requestFrame = vi
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          frames.push(callback)
          return frames.length
        })
      cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
    })

    afterEach(() => {
      requestFrame.mockRestore()
      cancelFrame.mockRestore()
    })

    it('asks for no frames while nothing plays', async () => {
      const { wrapper } = setup()
      useAuditionStore().status = 'loading'
      await wrapper.vm.$nextTick()

      expect(requestFrame).not.toHaveBeenCalled()
    })

    it('starts when the audition plays and asks for the next frame after each one', async () => {
      const { wrapper } = setup()
      useAuditionStore().status = 'playing'
      await wrapper.vm.$nextTick()
      expect(requestFrame).toHaveBeenCalledTimes(1)

      frames[0]?.(0)
      expect(requestFrame).toHaveBeenCalledTimes(2)
    })

    it('is cancelled when the audition leaves playing, and no further frame is asked for', async () => {
      const { wrapper } = setup()
      const audition = useAuditionStore()
      audition.status = 'playing'
      await wrapper.vm.$nextTick()
      frames[0]?.(0)
      const lastHandle = requestFrame.mock.results.at(-1)?.value

      audition.status = 'idle'
      await wrapper.vm.$nextTick()
      expect(cancelFrame).toHaveBeenCalledWith(lastHandle)

      requestFrame.mockClear()
      frames.at(-1)?.(32)
      expect(requestFrame).not.toHaveBeenCalled()
    })

    it('is cancelled when the view goes away while playing', async () => {
      const { wrapper } = setup()
      useAuditionStore().status = 'playing'
      await wrapper.vm.$nextTick()

      wrapper.unmount()

      expect(cancelFrame).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the audition fails', () => {
    it('shows the failure as a status line, and nothing when there is none', async () => {
      const { wrapper } = setup()
      expect(wrapper.find('[role="status"]').exists()).toBe(false)

      useAuditionStore().failure = "Couldn't play this split: no sound"
      await wrapper.vm.$nextTick()

      expect(wrapper.get('[role="status"]').text()).toBe("Couldn't play this split: no sound")

      useAuditionStore().failure = null
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })
  })

  describe('deleting with the keyboard', () => {
    it('deletes the selected split on Delete and selects the next one', async () => {
      const { split } = setup()

      await press({ key: 'Delete' })

      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
      expect(split.selectedSplit?.seconds).toBe(71.5)
    })

    it('takes Backspace for Delete, which is what the delete key of a Mac keyboard sends', async () => {
      const { split } = setup()

      await press({ key: 'Backspace' })

      expect(split.splits).toHaveLength(1)
    })

    it('deletes one split while the key is held down, not the next one and the rest', async () => {
      const { split } = setup()

      await press({ key: 'Delete' })
      await press({ key: 'Delete', repeat: true })
      await press({ key: 'Backspace', repeat: true })

      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
    })

    it('does nothing with no split selected', async () => {
      const { split, wrapper } = setup()
      split.moveZoomTo(40)
      await wrapper.vm.$nextTick()
      const before = split.splits.map((point) => point.seconds)

      await press({ key: 'Delete' })
      await press({ key: 'ArrowRight' })

      expect(split.splits.map((point) => point.seconds)).toEqual(before)
    })
  })

  describe("the keys are the page's", () => {
    it('does nothing with Cmd, Ctrl or Alt: Cmd+Backspace does not delete, Alt+Left does not move', async () => {
      const { split } = setup()

      await press({ key: 'Backspace', metaKey: true })
      await press({ key: 'ArrowLeft', altKey: true })
      await press({ key: 'ArrowRight', ctrlKey: true })

      expect(split.splits.map((point) => point.seconds)).toEqual([21, 71.5])
    })

    it('moves the split from the handle focused by Tab exactly as from elsewhere', async () => {
      const { split, wrapper } = setup()
      focusElement(wrapper.get('[role="slider"]').element)

      const arrow = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
      wrapper.get('[role="slider"]').element.dispatchEvent(arrow)

      expect(split.selectedSplit?.seconds).toBeCloseTo(21.01)
      expect(arrow.defaultPrevented).toBe(true)
    })

    it('leaves a key typed into a text field alone', async () => {
      const { split } = setup()
      const input = document.createElement('input')
      document.body.append(input)
      input.focus()

      await press({ key: 'Backspace' })

      expect(split.splits).toHaveLength(2)
      input.remove()
    })

    it('stops listening when the view goes', async () => {
      const { split, wrapper } = setup()
      wrapper.unmount()

      await press({ key: 'Delete' })

      expect(split.splits).toHaveLength(2)
    })

    it('has no tab stop but the handle, and the handle does not take the keyboard by itself', () => {
      const { wrapper } = setup()

      expect(wrapper.attributes('tabindex')).toBeUndefined()
      expect(wrapper.get('[role="slider"]').attributes('tabindex')).toBe('0')
      expect(wrapper.vm).not.toHaveProperty('focusHandle')
    })
  })

  describe('with no splits', () => {
    it('says no splits were found, and has no handle', () => {
      const wrapper = mountWithoutSplits()

      expect(wrapper.get('[role="status"]').text()).toBe('No splits were found in this file.')
      expect(wrapper.find('[role="slider"]').exists()).toBe(false)
    })

    it('says nothing while there are splits', () => {
      const { wrapper } = setup()

      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })
  })
})
