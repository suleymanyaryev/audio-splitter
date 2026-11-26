import { afterEach, beforeEach, describe, it, expect, vi, type MockInstance } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { usePlayerStore } from '../../model/player.ts'
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

// 100 s: loud, a 2 s silence from 1 s, loud, so the split is at 2 s, within 4 s of the start.
function curveWithGapNearTheStart() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 20, 60)
  return curve
}

function setup() {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
  split.findSplits()
  // Detection opens on track 1; this spec is about the zoom view, on split 1.
  split.selectSplit(split.splits[0]!.id)
  return { split, wrapper: mount(SplitZoom, { attachTo: document.body }) }
}

// The window of the playhead specs is 11 s to 31 s on 200 px, so 10 px a second.
function mountOnSplit() {
  useSourceFileStore().peaks = new Float32Array(2000)
  return setup()
}

// The split's handle, a slider of its own beside the playhead's.
const handleOf = (wrapper: Pick<VueWrapper, 'get'>) => wrapper.get('[aria-label="Split 1"]')

// The slider the whole view is, for the audition's playhead.
const playheadSliderOf = (wrapper: Pick<VueWrapper, 'get'>) =>
  wrapper.get('[aria-label="Playhead in the audition"]')

// Where the audition's playhead is in the file.
const playhead = () => usePlayerStore().playheadSeconds()

function focusElement(element: Element) {
  if (element instanceof HTMLElement) element.focus()
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
  wrapper: Pick<VueWrapper, 'element'>,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  init: MouseEventInit = {},
) {
  const buttons = type === 'pointerup' ? 0 : 1
  const event = new MouseEvent(type, { clientX, buttons, bubbles: true, ...init })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  wrapper.element.dispatchEvent(event)
  await nextTick()
}

// The split view of `mountOnSplit` with a silent spectrogram of the 100 s: 2000 columns of 50 ms.
function mountWithSpectrogram() {
  const sourceFile = useSourceFileStore()
  sourceFile.spectrogram = { bands: new Uint8Array(2000 * 128), bandCount: 128, topHz: 22_050 }
  sourceFile.loudnessWindowSeconds = 0.05
  return mountOnSplit()
}

// Every other call of a recording 2D context does nothing.
const ignoreCall = () => {}

// What a recording 2D context gives for `measureText`: every label 30 px wide.
const measureText = () => ({ width: 30 })

// What a recording 2D context gives for `createImageData`: a real pixel buffer.
const imageDataOf = (width: number, height: number) => ({
  data: new Uint8ClampedArray(width * height * 4),
})

function mountWithoutSplits() {
  setActivePinia(createPinia())
  useSplitStore().open(new Float32Array(400).fill(-10), {
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

      const handle = handleOf(wrapper)

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

      expect(handleOf(wrapper).attributes('style')).toContain('left: 50%')
    })

    it('is not there while no split is selected', async () => {
      const { split, wrapper } = setup()

      split.moveZoomTo(40)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[aria-label="Split 1"]').exists()).toBe(false)
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
      const handle = handleOf(wrapper)

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

  describe('the playhead keys', () => {
    // The split is at 21 s, so the 8 s are 17 s to 25 s and the playhead waits at 17 s.
    it('steps the playhead 100 ms forward with the key where "." sits on a US layout', async () => {
      setup()

      await press({ code: 'Period', key: '.' })
      expect(playhead()).toBeCloseTo(17.1, 6)

      await press({ code: 'Period', key: '.' })
      await press({ code: 'Period', key: '.' })
      expect(playhead()).toBeCloseTo(17.3, 6)
    })

    it('steps it 100 ms back with the key where "," sits', async () => {
      setup()
      await press({ code: 'Period', key: '.', shiftKey: true })

      await press({ code: 'Comma', key: ',' })

      expect(playhead()).toBeCloseTo(17.9, 6)
    })

    it('steps 1 s with Shift, whatever character Shift makes of the key', async () => {
      setup()

      await press({ code: 'Period', key: '>', shiftKey: true })
      expect(playhead()).toBe(18)

      await press({ code: 'Comma', key: '<', shiftKey: true })
      expect(playhead()).toBe(17)
    })

    it('works on a Russian layout, where those keys type other letters', async () => {
      setup()

      await press({ code: 'Period', key: 'ю' })
      expect(playhead()).toBeCloseTo(17.1, 6)

      await press({ code: 'Comma', key: 'б' })
      expect(playhead()).toBe(17)
    })

    it('steps again while the key is held', async () => {
      setup()

      await press({ code: 'Period', key: '.' })
      await press({ code: 'Period', key: '.', repeat: true })
      await press({ code: 'Period', key: '.', repeat: true })

      expect(playhead()).toBeCloseTo(17.3, 6)
    })

    it('does not scroll the page, and leaves the split where it is', async () => {
      const { split } = setup()

      const step = new KeyboardEvent('keydown', { code: 'Period', key: '.', cancelable: true })
      document.dispatchEvent(step)

      expect(step.defaultPrevented).toBe(true)
      expect(split.selectedSplit?.seconds).toBe(21)
    })

    it('stops at the edges of the 8 s', async () => {
      setup()

      await press({ code: 'Comma', key: ',', shiftKey: true })
      expect(playhead()).toBe(17)

      for (let step = 0; step < 9; step++) await press({ code: 'Period', key: '.', shiftKey: true })
      expect(playhead()).toBe(25)

      await press({ code: 'Period', key: '.' })
      expect(playhead()).toBe(25)
    })

    it('does nothing with Alt, Ctrl or Cmd, which are the browser’s', async () => {
      setup()

      await press({ code: 'Period', key: '.', altKey: true })
      await press({ code: 'Comma', key: ',', ctrlKey: true })
      await press({ code: 'Period', key: '.', metaKey: true })

      expect(playhead()).toBe(17)
    })

    it('does nothing with no split selected, and leaves the keys to the browser', async () => {
      const { split, wrapper } = setup()
      split.moveZoomTo(40)
      await wrapper.vm.$nextTick()

      const step = new KeyboardEvent('keydown', { code: 'Period', key: '.', cancelable: true })
      document.dispatchEvent(step)

      expect(step.defaultPrevented).toBe(false)
      expect(playhead()).toBeNull()
    })

    it('takes the playhead back to the start of the 8 s with Home', async () => {
      setup()
      await press({ code: 'Period', key: '>', shiftKey: true })
      expect(playhead()).toBe(18)

      const home = new KeyboardEvent('keydown', { code: 'Home', key: 'Home', cancelable: true })
      document.dispatchEvent(home)

      expect(playhead()).toBe(17)
      expect(home.defaultPrevented).toBe(true)
    })

    it('takes it back with Home from the split handle too, which would be the slider’s minimum', async () => {
      const { split, wrapper } = setup()
      await press({ code: 'Period', key: '>', shiftKey: true })
      focusElement(handleOf(wrapper).element)

      const home = new KeyboardEvent('keydown', {
        code: 'Home',
        key: 'Home',
        bubbles: true,
        cancelable: true,
      })
      handleOf(wrapper).element.dispatchEvent(home)

      expect(playhead()).toBe(17)
      expect(home.defaultPrevented).toBe(true)
      expect(split.selectedSplit?.seconds).toBe(21)
    })

    it('leaves Left, Right, Delete and Backspace to the split', async () => {
      const { split } = setup()

      await press({ key: 'ArrowRight' })
      expect(split.selectedSplit?.seconds).toBeCloseTo(21.01)
      expect(playhead()).toBeCloseTo(17.01, 6)

      await press({ key: 'Delete' })
      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
    })
  })

  describe('moving the split with the keys while the audition is heard', () => {
    const clipOfTheAudition = { wav: Uint8Array.of(1), startSeconds: 17, lengthSeconds: 8 }
    let clip: MockInstance<ReturnType<typeof useSourceFileStore>['clip']>
    let play: MockInstance<HTMLMediaElement['play']>

    beforeEach(() => {
      play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
      // jsdom has none of these, so the specs give them to URL themselves.
      URL.createObjectURL = () => 'blob:clip'
      URL.revokeObjectURL = () => {}
    })

    afterEach(() => {
      vi.restoreAllMocks()
      Reflect.deleteProperty(URL, 'createObjectURL')
      Reflect.deleteProperty(URL, 'revokeObjectURL')
    })

    // The audition plays and then pauses at 2.5 s into its 8 s, which is 19.5 s in the file.
    async function pausedAtTwoAndAHalf() {
      const parts = mountOnSplit()
      clip = vi.spyOn(useSourceFileStore(), 'clip').mockResolvedValue(clipOfTheAudition)
      const player = usePlayerStore()
      player.toggle()
      await new Promise((done) => setTimeout(done, 0))
      const element = play.mock.contexts[0] as HTMLAudioElement
      element.currentTime = 2.5
      player.toggle()
      return { ...parts, player, element }
    }

    it('keeps the audition paused at the same time in the file, and plays on after decoding the moved 8 s', async () => {
      const { split, player, element } = await pausedAtTwoAndAHalf()

      await press({ key: 'ArrowRight', shiftKey: true })

      expect(split.selectedSplit?.seconds).toBeCloseTo(21.1, 6)
      expect(player.status).toBe('paused')
      expect(playhead()).toBeCloseTo(19.5, 6)

      clip.mockResolvedValueOnce({ ...clipOfTheAudition, startSeconds: 17.1 })
      // Not awaited: the press is seen before the clip arrives.
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }))
      expect(player.status).toBe('loading')
      await new Promise((done) => setTimeout(done, 0))

      expect(player.status).toBe('playing')
      expect(element.currentTime).toBeCloseTo(2.4, 6)
    })

    it('pauses a playing audition on a move, and keeps its playhead drawn where the sound was', async () => {
      const { split, player, element } = await pausedAtTwoAndAHalf()
      player.toggle()
      element.currentTime = 4

      await press({ key: 'ArrowLeft' })

      expect(split.selectedSplit?.seconds).toBeCloseTo(20.99, 6)
      expect(player.status).toBe('paused')
      expect(playhead()).toBeCloseTo(21, 6)
    })
  })

  describe('the playhead slider', () => {
    it('is the whole view, named for the playhead and valued by its time over the 8 s', () => {
      const { wrapper } = setup()

      const slider = playheadSliderOf(wrapper)

      expect(slider.attributes('role')).toBe('slider')
      expect(slider.attributes('aria-valuemin')).toBe('17')
      expect(slider.attributes('aria-valuemax')).toBe('25')
      expect(slider.attributes('aria-valuenow')).toBe('17')
      expect(slider.attributes('aria-valuetext')).toBe('0:00:17.00')
    })

    it('is focusable but not a Tab stop, and the handle stays the only one', () => {
      const { wrapper } = setup()

      expect(playheadSliderOf(wrapper).attributes('tabindex')).toBe('-1')
      expect(handleOf(wrapper).attributes('tabindex')).toBe('0')
      // The handle is no child of the playhead slider, whose children a screen reader skips.
      expect(playheadSliderOf(wrapper).element.contains(handleOf(wrapper).element)).toBe(false)
    })

    it('follows the playhead to the hundredth while it does not play', async () => {
      const { wrapper } = setup()

      await press({ code: 'Period', key: '.' })
      await press({ code: 'Period', key: '.' })

      const slider = playheadSliderOf(wrapper)
      expect(slider.attributes('aria-valuenow')).toBe('17.2')
      expect(slider.attributes('aria-valuetext')).toBe('0:00:17.20')
    })

    it('follows the split: the 8 s it spans move with it', async () => {
      const { split, wrapper } = setup()
      const selected = split.selectedSplit
      if (selected) split.moveSplit(selected.id, 25)
      await wrapper.vm.$nextTick()

      const slider = playheadSliderOf(wrapper)
      expect(slider.attributes('aria-valuemin')).toBe('21')
      expect(slider.attributes('aria-valuemax')).toBe('29')
      expect(slider.attributes('aria-valuenow')).toBe('21')
    })

    it('has no value to give while no split is selected', async () => {
      const { split, wrapper } = setup()
      split.moveZoomTo(40)
      await wrapper.vm.$nextTick()

      expect(
        wrapper.find('[aria-label="Playhead in the audition"]').attributes('role'),
      ).toBeUndefined()
    })
  })

  describe('the pointer', () => {
    // The view is 200 px wide for the window of 11 s to 31 s: 10 px a second. The split is at x = 100.
    const clipOfTheAudition = { wav: Uint8Array.of(1), startSeconds: 17, lengthSeconds: 8 }
    let clip: MockInstance<ReturnType<typeof useSourceFileStore>['clip']>

    beforeEach(() => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 160),
      )
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
      // jsdom has none of these, so the specs give them to URL and the element themselves.
      URL.createObjectURL = () => 'blob:clip'
      URL.revokeObjectURL = () => {}
      HTMLElement.prototype.setPointerCapture = () => {}
    })

    afterEach(() => {
      vi.restoreAllMocks()
      Reflect.deleteProperty(URL, 'createObjectURL')
      Reflect.deleteProperty(URL, 'revokeObjectURL')
      Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
    })

    // The audition is playing, as after a press of Space.
    async function mountPlaying() {
      const parts = mountOnSplit()
      clip = vi.spyOn(useSourceFileStore(), 'clip').mockResolvedValue(clipOfTheAudition)
      usePlayerStore().toggle()
      await new Promise((done) => setTimeout(done, 0))
      expect(usePlayerStore().status).toBe('playing')
      return parts
    }

    it('moves the playhead to a click off the split line, to the 10 ms, and does not start the sound', async () => {
      const { split, wrapper } = mountOnSplit()
      clip = vi.spyOn(useSourceFileStore(), 'clip').mockResolvedValue(clipOfTheAudition)

      await pointer(wrapper, 'pointerdown', 123.46)
      await pointer(wrapper, 'pointerup', 123.46)

      // 12.346 s into the window is 23.346 s, snapped to 23.35 s.
      expect(playhead()).toBeCloseTo(23.35, 6)
      expect(usePlayerStore().status).toBe('idle')
      expect(clip).not.toHaveBeenCalled()
      expect(split.selectedSplit?.seconds).toBe(21)
    })

    it('puts a click outside the 8 s on the nearest edge', async () => {
      const { wrapper } = mountOnSplit()

      await pointer(wrapper, 'pointerdown', 20)
      await pointer(wrapper, 'pointerup', 20)
      expect(playhead()).toBe(17)

      await pointer(wrapper, 'pointerdown', 190)
      await pointer(wrapper, 'pointerup', 190)
      expect(playhead()).toBe(25)
    })

    it('moves the playhead along with a drag and parks it on the edges of the 8 s', async () => {
      const { wrapper } = mountOnSplit()

      await pointer(wrapper, 'pointerdown', 120)
      await pointer(wrapper, 'pointermove', 130)
      expect(playhead()).toBe(24)

      await pointer(wrapper, 'pointermove', 400)
      expect(playhead()).toBe(25)

      await pointer(wrapper, 'pointermove', -50)
      expect(playhead()).toBe(17)
    })

    it('follows the pointer until the release, and not after it', async () => {
      const { wrapper } = mountOnSplit()

      await pointer(wrapper, 'pointerdown', 120)
      await pointer(wrapper, 'pointerup', 130)
      await pointer(wrapper, 'pointermove', 80)

      expect(playhead()).toBe(23)
    })

    it('keeps a press near the split line for the split, and never moves the playhead', async () => {
      const { split, wrapper } = mountOnSplit()

      // 5 px right of the line, on the handle: the split follows the pointer minus those 5 px.
      await pointer(wrapper, 'pointerdown', 105)
      await pointer(wrapper, 'pointermove', 130)
      await pointer(wrapper, 'pointerup', 130)

      expect(split.selectedSplit?.seconds).toBe(23.5)
      // Still at the start of the 8 s, which moved with the split: 19.5 s to 27.5 s.
      expect(playhead()).toBe(19.5)
    })

    it('takes a press 8 px from the line for the split and one 9 px away for the playhead', async () => {
      const { split, wrapper } = mountOnSplit()

      await pointer(wrapper, 'pointerdown', 108)
      await pointer(wrapper, 'pointerup', 108)
      expect(playhead()).toBe(17)

      await pointer(wrapper, 'pointerdown', 109)
      await pointer(wrapper, 'pointerup', 109)
      expect(playhead()).toBeCloseTo(21.9, 6)
      expect(split.selectedSplit?.seconds).toBe(21)
    })

    it('pauses a playing audition while the pointer is held, and plays on from the release', async () => {
      const { wrapper } = await mountPlaying()
      const player = usePlayerStore()

      await pointer(wrapper, 'pointerdown', 120)
      expect(player.status).toBe('paused')

      await pointer(wrapper, 'pointermove', 130)
      expect(player.status).toBe('paused')
      expect(playhead()).toBe(24)

      await pointer(wrapper, 'pointerup', 130)
      expect(player.status).toBe('playing')
      expect(playhead()).toBeCloseTo(24, 6)
      expect(clip).toHaveBeenCalledOnce()
    })

    it('leaves a paused audition paused after a click and after a drag', async () => {
      const { wrapper } = await mountPlaying()
      const player = usePlayerStore()
      player.toggle()

      await pointer(wrapper, 'pointerdown', 120)
      await pointer(wrapper, 'pointermove', 80)
      await pointer(wrapper, 'pointerup', 80)

      expect(player.status).toBe('paused')
      expect(playhead()).toBe(19)
    })

    it('does not start a press on the split line, though it plays', async () => {
      const { wrapper } = await mountPlaying()

      await pointer(wrapper, 'pointerdown', 100)
      await pointer(wrapper, 'pointerup', 100)

      expect(usePlayerStore().status).toBe('playing')
    })

    it('lets go of the playhead when a move reports no button held, and plays on from there', async () => {
      const { wrapper } = await mountPlaying()
      const player = usePlayerStore()

      await pointer(wrapper, 'pointerdown', 120)
      await pointer(wrapper, 'pointermove', 130)
      await pointer(wrapper, 'pointermove', 150, { buttons: 0 })

      expect(player.status).toBe('playing')
      expect(playhead()).toBeCloseTo(24, 6)
    })

    it('lets go of the playhead when the pointer capture is lost, and only once', async () => {
      const { wrapper } = await mountPlaying()
      const player = usePlayerStore()

      await pointer(wrapper, 'pointerdown', 120)
      await pointer(wrapper, 'pointermove', 130)
      wrapper.element.dispatchEvent(new Event('lostpointercapture'))
      player.toggle()
      await pointer(wrapper, 'pointerup', 130)
      await pointer(wrapper, 'pointermove', 80)

      expect(player.status).toBe('paused')
      expect(playhead()).toBeCloseTo(24, 6)
    })

    it('lets go of the split when the pointer capture is lost', async () => {
      const { split, wrapper } = mountOnSplit()

      await pointer(wrapper, 'pointerdown', 100)
      wrapper.element.dispatchEvent(new Event('lostpointercapture'))
      await pointer(wrapper, 'pointermove', 130)

      expect(split.selectedSplit?.seconds).toBe(21)
    })

    it('does nothing for a button other than the main one', async () => {
      const { split, wrapper } = mountOnSplit()

      await pointer(wrapper, 'pointerdown', 120, { button: 2 })
      await pointer(wrapper, 'pointermove', 150, { button: 2 })
      expect(playhead()).toBe(17)

      await pointer(wrapper, 'pointerdown', 100, { button: 1 })
      await pointer(wrapper, 'pointermove', 150)
      expect(split.selectedSplit?.seconds).toBe(21)
    })

    it('does nothing with no split selected', async () => {
      const { split, wrapper } = mountOnSplit()
      split.moveZoomTo(40)
      await wrapper.vm.$nextTick()

      await pointer(wrapper, 'pointerdown', 120)
      await pointer(wrapper, 'pointerup', 120)

      expect(playhead()).toBeNull()
    })

    it('has no double-click action and leaves no mark', async () => {
      const { split, wrapper } = mountOnSplit()

      wrapper.element.dispatchEvent(new MouseEvent('dblclick', { clientX: 120, bubbles: true }))
      await nextTick()

      expect(playhead()).toBe(17)
      expect(split.selectedSplit?.seconds).toBe(21)
      expect(split.splits).toHaveLength(2)
    })

    it('shows the resize cursor over the split line and while the split is dragged, not over the rest', async () => {
      const { wrapper } = mountOnSplit()

      await pointer(wrapper, 'pointermove', 100)
      expect(wrapper.classes()).toContain('cursor-ew-resize')

      await pointer(wrapper, 'pointermove', 150)
      expect(wrapper.classes()).not.toContain('cursor-ew-resize')

      await pointer(wrapper, 'pointerdown', 150)
      expect(wrapper.classes()).not.toContain('cursor-ew-resize')
    })
  })

  describe('Space', () => {
    it('plays or stops the audition, and does not scroll the page', () => {
      setup()
      const toggle = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

      const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
      document.dispatchEvent(space)

      expect(toggle).toHaveBeenCalledTimes(1)
      expect(space.defaultPrevented).toBe(true)
    })

    it('is left to the browser with no split selected, as the play button is disabled', () => {
      const { split } = setup()
      split.moveZoomTo(40)
      const toggle = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

      const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
      document.dispatchEvent(space)

      expect(toggle).not.toHaveBeenCalled()
      expect(space.defaultPrevented).toBe(false)
    })

    it('does not toggle again while the key is held down', () => {
      setup()
      const toggle = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

      const repeat = new KeyboardEvent('keydown', { key: ' ', repeat: true, cancelable: true })
      document.dispatchEvent(repeat)

      expect(toggle).not.toHaveBeenCalled()
      expect(repeat.defaultPrevented).toBe(true)
    })

    it('leaves the split where it is', async () => {
      const { split } = setup()
      vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

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

    it('is redrawn where a step puts it, though nothing else changed', async () => {
      mountOnSplit()

      await press({ code: 'Period', key: '.' })

      // 17.1 s is 6.1 s into the window: 61 px.
      expect(lines.at(-1)).toBe(61)
    })

    it('stays drawn where the audition was paused', async () => {
      const { wrapper } = mountOnSplit()
      const player = usePlayerStore()
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

      player.toggle()
      await new Promise((done) => setTimeout(done, 0))
      const element = vi.mocked(HTMLMediaElement.prototype.play).mock
        .contexts[0] as HTMLAudioElement
      element.currentTime = 2.5
      player.toggle()
      await wrapper.vm.$nextTick()

      // 17 s + 2.5 s = 19.5 s.
      expect(player.status).toBe('paused')
      expect(lines.at(-1)).toBe(85)
    })
  })

  describe('the spectrogram strip', () => {
    // A 200 x 320 canvas: the waveform in the top 160 px, the strip in the bottom 160 px.
    let rects: { x: number; y: number; width: number; height: number }[]
    let images: unknown[][]

    beforeEach(() => {
      rects = []
      images = []
      const recorder = new Proxy(
        {},
        {
          get: (_target, name) => {
            const methods: Record<string | symbol, unknown> = {
              fillRect: (x: number, y: number, width: number, height: number) => {
                rects.push({ x, y, width, height })
              },
              drawImage: (...arguments_: unknown[]) => {
                images.push(arguments_.slice(1))
              },
              createImageData: imageDataOf,
              measureText,
            }
            return methods[name] ?? ignoreCall
          },
          set: () => true,
        },
      )
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        recorder as unknown as CanvasRenderingContext2D,
      )
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 320),
      )
      HTMLElement.prototype.setPointerCapture = () => {}
    })

    afterEach(() => {
      vi.restoreAllMocks()
      Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
    })

    it('is drawn under the waveform, as tall as it', () => {
      mountWithSpectrogram()

      expect(images.at(-1)).toEqual([0, 160, 200, 160])
    })

    it('is crossed by the split line and the playhead, while the land stays on the waveform', () => {
      mountWithSpectrogram()

      // The gap runs 20 to 22 s, at 90 to 110 px of the window 11 to 31 s; its split is at 21 s.
      const land = rects.find((rect) => rect.x === 90 && rect.y === 0)
      expect(land?.width).toBeCloseTo(20, 9)
      expect(land?.height).toBe(160)
      expect(rects).toContainEqual({ x: 98.5, y: 0, width: 3, height: 320 })
      // The playhead, at the start of the 8 s: 17 s.
      expect(rects).toContainEqual({ x: 60, y: 0, width: 1, height: 320 })
    })

    it('moves the playhead to a press on the strip, as on the waveform', async () => {
      const { wrapper } = mountWithSpectrogram()

      await pointer(wrapper.get('canvas'), 'pointerdown', 123.46, { clientY: 240 })
      await pointer(wrapper.get('canvas'), 'pointerup', 123.46, { clientY: 240 })

      expect(playhead()).toBeCloseTo(23.35, 6)
    })

    it('drags the selected split from the strip, as from the waveform', async () => {
      const { split, wrapper } = mountWithSpectrogram()

      await pointer(wrapper.get('canvas'), 'pointerdown', 105, { clientY: 300 })
      await pointer(wrapper.get('canvas'), 'pointermove', 130, { clientY: 300 })
      await pointer(wrapper.get('canvas'), 'pointerup', 130, { clientY: 300 })

      expect(split.selectedSplit?.seconds).toBe(23.5)
    })
  })

  describe('the audition’s edges', () => {
    // A 200 x 160 canvas, so 10 px a second, whose 2D context records every rectangle it is filled.
    let rects: { x: number; y: number; width: number; height: number }[]

    beforeEach(() => {
      rects = []
      const recorder = new Proxy(
        {},
        {
          get: (_target, name) =>
            name === 'fillRect'
              ? (x: number, y: number, width: number, height: number) => {
                  rects.push({ x, y, width, height })
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
    })

    // The position in the drawing order of the last rectangle of that size.
    const lastDrawnIndex = (width: number, height: number) =>
      rects.map((rect) => rect.width === width && rect.height === height).lastIndexOf(true)

    // The stem each edge draws down from the top of the canvas: 2 px wide, 16 px long.
    const stemsAt = () =>
      rects.filter((rect) => rect.width === 2 && rect.height === 16 && rect.y === 0).map((r) => r.x)

    it('are marked at the 8 s around the split, in a 20 s window', () => {
      mountOnSplit()

      // The split is at 21 s in the window 11 to 31 s: the 8 s run 17 to 25 s, at 60 and 140 px.
      expect(stemsAt().slice(-2)).toEqual([59, 139])
    })

    it('are marked at the bottom of the canvas too, as a bracket with a foot toward the audition', () => {
      mountOnSplit()

      expect(rects).toContainEqual({ x: 59, y: 144, width: 2, height: 16 })
      expect(rects).toContainEqual({ x: 59, y: 144, width: 8, height: 2 })
      expect(rects).toContainEqual({ x: 133, y: 144, width: 8, height: 2 })
    })

    it('move with the split', async () => {
      mountOnSplit()

      await press({ key: 'ArrowRight', shiftKey: true })

      // The window stays at 11 to 31 s: the 8 s now run 17.1 to 25.1 s, at 61 and 141 px.
      expect(stemsAt().slice(-2)).toEqual([60, 140])
    })

    it('follow the file’s start where the audition is held there', () => {
      useSourceFileStore().peaks = new Float32Array(2000)
      useSourceFileStore().durationSeconds = 100
      const split = useSplitStore()
      split.open(curveWithGapNearTheStart(), { windowSeconds: 0.05, durationSeconds: 100 })
      split.findSplits()
      split.selectSplit(split.splits[0]!.id)
      mount(SplitZoom, { attachTo: document.body })

      // The split is at 2 s, so the audition starts at 0 s, which is 8 s into the window 2 - 10 s:
      // 80 px. The end is at 6 s, 140 px.
      expect(split.selectedSplit?.seconds).toBe(2)
      expect(stemsAt().slice(-2)).toEqual([79, 139])
    })

    it('are drawn under the split line, and the split line under the playhead', () => {
      mountOnSplit()

      const stem = lastDrawnIndex(2, 16)
      const playheadLine = lastDrawnIndex(1, 160)
      const splitLine = lastDrawnIndex(3, 160)

      expect(stem).toBeLessThan(splitLine)
      expect(splitLine).toBeLessThan(playheadLine)
    })

    it('are not drawn while no split is selected', () => {
      useSourceFileStore().peaks = new Float32Array(2000)
      useSourceFileStore().durationSeconds = 100
      useSplitStore().open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
      useSplitStore().findSplits()
      mount(SplitZoom, { attachTo: document.body })

      expect(stemsAt()).toEqual([])
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
      // The slider test gave URL these itself, as jsdom has neither, and spied on the media element.
      vi.restoreAllMocks()
      Reflect.deleteProperty(URL, 'createObjectURL')
      Reflect.deleteProperty(URL, 'revokeObjectURL')
    })

    it('asks for no frames while nothing plays', async () => {
      const { wrapper } = setup()
      usePlayerStore().status = 'loading'
      await wrapper.vm.$nextTick()

      expect(requestFrame).not.toHaveBeenCalled()
    })

    it('starts when the audition plays and asks for the next frame after each one', async () => {
      const { wrapper } = setup()
      usePlayerStore().status = 'playing'
      await wrapper.vm.$nextTick()
      expect(requestFrame).toHaveBeenCalledTimes(1)

      frames[0]?.(0)
      expect(requestFrame).toHaveBeenCalledTimes(2)
    })

    it('is cancelled when the audition leaves playing, and no further frame is asked for', async () => {
      const { wrapper } = setup()
      const player = usePlayerStore()
      player.status = 'playing'
      await wrapper.vm.$nextTick()
      frames[0]?.(0)
      const lastHandle = requestFrame.mock.results.at(-1)?.value

      player.status = 'idle'
      await wrapper.vm.$nextTick()
      expect(cancelFrame).toHaveBeenCalledWith(lastHandle)

      requestFrame.mockClear()
      frames.at(-1)?.(32)
      expect(requestFrame).not.toHaveBeenCalled()
    })

    it('gives the slider the whole second while the audition plays, and the hundredth once paused', async () => {
      const { wrapper } = setup()
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
      const player = usePlayerStore()

      player.toggle()
      await new Promise((done) => setTimeout(done, 0))
      const element = vi.mocked(HTMLMediaElement.prototype.play).mock
        .contexts[0] as HTMLAudioElement
      element.currentTime = 2.55
      frames.at(-1)?.(0)
      await wrapper.vm.$nextTick()

      // 17 s + 2.55 s is 19.55 s, heard as the second it is in.
      expect(playheadSliderOf(wrapper).attributes('aria-valuenow')).toBe('19')
      expect(playheadSliderOf(wrapper).attributes('aria-valuetext')).toBe('0:00:19.00')

      player.toggle()
      await wrapper.vm.$nextTick()
      expect(playheadSliderOf(wrapper).attributes('aria-valuenow')).toBe('19.55')
    })

    it('is cancelled when the view goes away while playing', async () => {
      const { wrapper } = setup()
      usePlayerStore().status = 'playing'
      await wrapper.vm.$nextTick()

      wrapper.unmount()

      expect(cancelFrame).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the audition fails', () => {
    it('shows the failure as a status line, and nothing when there is none', async () => {
      const { wrapper } = setup()
      expect(wrapper.find('[role="status"]').exists()).toBe(false)

      usePlayerStore().failure = "Couldn't play this split: no sound"
      await wrapper.vm.$nextTick()

      expect(wrapper.get('[role="status"]').text()).toBe("Couldn't play this split: no sound")

      usePlayerStore().failure = null
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

  describe('marking a split checked with K', () => {
    it('clears the confidence of the selected split, which counts as one edit', async () => {
      const { split } = setup()
      expect(split.selectedSplit?.confidence).not.toBeNull()

      await press({ key: 'k', code: 'KeyK' })

      expect(split.selectedSplit?.confidence).toBeNull()
      expect(split.editCount).toBe(1)
    })

    it('leaves a split with no confidence to the browser, and a held key marks once', async () => {
      const { split } = setup()
      const first = new KeyboardEvent('keydown', { code: 'KeyK', bubbles: true, cancelable: true })
      const again = new KeyboardEvent('keydown', { code: 'KeyK', bubbles: true, cancelable: true })

      document.dispatchEvent(first)
      document.dispatchEvent(again)

      expect(first.defaultPrevented).toBe(true)
      expect(again.defaultPrevented).toBe(false)
      expect(split.editCount).toBe(1)
    })

    it('works by the physical key, and does nothing with Shift or with no split selected', async () => {
      const { split, wrapper } = setup()

      await press({ key: 'K', code: 'KeyK', shiftKey: true })
      expect(split.editCount).toBe(0)

      split.moveZoomTo(40)
      await wrapper.vm.$nextTick()
      await press({ key: 'к', code: 'KeyK' })
      expect(split.editCount).toBe(0)
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
      focusElement(handleOf(wrapper).element)

      const arrow = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
      handleOf(wrapper).element.dispatchEvent(arrow)

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
      expect(handleOf(wrapper).attributes('tabindex')).toBe('0')
      expect(wrapper.vm).not.toHaveProperty('focusHandle')
    })
  })

  describe('with no splits', () => {
    it('says no splits were found, and has no handle', () => {
      const wrapper = mountWithoutSplits()

      expect(wrapper.get('[role="status"]').text()).toBe('No splits were found in this file.')
      expect(wrapper.find('[aria-label="Split 1"]').exists()).toBe(false)
    })

    it('says nothing while there are splits', () => {
      const { wrapper } = setup()

      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })
  })
})
