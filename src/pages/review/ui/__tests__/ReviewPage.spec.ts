import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useAuditionStore } from '@/widgets/split-zoom/model/audition.ts'
import { useExportTracksStore } from '@/widgets/track-strip/model/export-tracks.ts'
import ReviewPage from '../ReviewPage.vue'

enableAutoUnmount(afterEach)

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

function mountPage() {
  const sourceFile = useSourceFileStore()
  sourceFile.status = 'ready'
  sourceFile.durationSeconds = 100
  sourceFile.loudnessWindowSeconds = 0.05
  sourceFile.loudness = curveWithTwoGaps()
  // Element.prototype.scrollIntoView is missing in jsdom, and the track list calls it.
  Element.prototype.scrollIntoView = () => {}
  return mount(ReviewPage, { attachTo: document.body })
}

function addSplitButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Add split')
  if (!button) throw new Error('no Add split button')
  return button
}

// The primary button of the zoom panel's title row; its name is "Play across split" or "Stop".
function auditionButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => ['Play across split', 'Stop'].includes(candidate.text()))
  if (!button) throw new Error('no audition button')
  return button
}

function exportButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === 'Export to folder…')
  if (!button) throw new Error('no Export button')
  return button
}

function viewOption(wrapper: ReturnType<typeof mount>, name: 'Split' | 'Range') {
  const option = wrapper
    .get('[role="radiogroup"][aria-label="Panel view"]')
    .findAll('[role="radio"]')
    .find((candidate) => candidate.text() === name)
  if (!option) throw new Error(`no ${name} option`)
  return option
}

// The panel's title: the zoom view's time, or the range's start, end and length.
const panelTitle = (wrapper: ReturnType<typeof mount>) => wrapper.get('h2.text-lg').text()

describe('ReviewPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Add split', () => {
    it('is disabled while the window centre is within a second of a split', () => {
      const wrapper = mountPage()

      // Split 1 is selected and the window is centred on it.
      expect(addSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('adds a split at the centre of the window once there is room, and selects it', async () => {
      const wrapper = mountPage()
      const split = useSplitStore()
      split.moveZoomTo(46)
      await wrapper.vm.$nextTick()

      const button = addSplitButton(wrapper)
      expect(button.attributes('disabled')).toBeUndefined()
      await button.trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([21, 46, 71.5])
      expect(split.selectedSplit?.seconds).toBe(46)
    })

    it('hands the keyboard to the new split, so it can be nudged at once', async () => {
      const wrapper = mountPage()
      useSplitStore().moveZoomTo(46)
      await wrapper.vm.$nextTick()

      await addSplitButton(wrapper).trigger('click')
      await wrapper.vm.$nextTick()

      expect(document.activeElement).toBe(
        wrapper.get('[role="slider"][aria-label="Split 2"]').element,
      )
    })
  })

  describe('the audition button', () => {
    it('reads "Play across split" and is enabled while a split is selected', () => {
      const wrapper = mountPage()

      const button = auditionButton(wrapper)

      expect(button.text()).toBe('Play across split')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('is disabled while no split is selected', async () => {
      const wrapper = mountPage()
      useSplitStore().moveZoomTo(46)
      await wrapper.vm.$nextTick()

      expect(auditionButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('calls the audition store when clicked', async () => {
      const wrapper = mountPage()
      const toggle = vi.spyOn(useAuditionStore(), 'toggle').mockImplementation(() => {})

      await auditionButton(wrapper).trigger('click')

      expect(toggle).toHaveBeenCalledTimes(1)
    })

    it('reads "Stop" with its own icon while a clip loads or plays, and stays enabled', async () => {
      const wrapper = mountPage()
      const audition = useAuditionStore()
      const playIcon = auditionButton(wrapper).get('svg').classes()

      audition.status = 'loading'
      await wrapper.vm.$nextTick()
      const loading = auditionButton(wrapper)
      expect(loading.text()).toBe('Stop')
      expect(loading.get('svg').classes()).not.toEqual(playIcon)
      expect(loading.attributes('disabled')).toBeUndefined()

      audition.status = 'playing'
      await wrapper.vm.$nextTick()
      expect(auditionButton(wrapper).text()).toBe('Stop')

      audition.status = 'idle'
      await wrapper.vm.$nextTick()
      expect(auditionButton(wrapper).text()).toBe('Play across split')
    })

    it('stops the audition when the page goes away', () => {
      const wrapper = mountPage()
      const stop = vi.spyOn(useAuditionStore(), 'stop')

      wrapper.unmount()

      expect(stop).toHaveBeenCalled()
    })
  })

  describe('the Split | Range control', () => {
    it('starts on Split, with Range disabled while there is no range', () => {
      const wrapper = mountPage()

      expect(viewOption(wrapper, 'Split').attributes('aria-checked')).toBe('true')
      expect(viewOption(wrapper, 'Range').attributes('disabled')).toBeDefined()
    })

    it('shows the zoom view and its buttons, and no Range view, on Split', () => {
      const wrapper = mountPage()

      expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Waveform of the range"]').exists()).toBe(false)
      expect(addSplitButton(wrapper).exists()).toBe(true)
      expect(auditionButton(wrapper).exists()).toBe(true)
    })

    it('swaps in the Range view, titled by the range, when a range is made', async () => {
      const wrapper = mountPage()

      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      expect(viewOption(wrapper, 'Range').attributes('aria-checked')).toBe('true')
      expect(viewOption(wrapper, 'Range').attributes('disabled')).toBeUndefined()
      expect(wrapper.find('[aria-label="Waveform of the range"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(false)
      expect(panelTitle(wrapper)).toBe('0:00:10.00 – 0:00:20.00 · 0:10.00')
    })

    it('leaves the zoom view’s buttons out of the Range view', async () => {
      const wrapper = mountPage()

      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      const labels = wrapper.findAll('button').map((button) => button.text())
      expect(labels).not.toContain('Add split')
      expect(labels).not.toContain('Play across split')
    })

    it('switches between the two views with the control, keeping the range', async () => {
      const wrapper = mountPage()
      const split = useSplitStore()
      split.setRange(10, 20)
      await wrapper.vm.$nextTick()

      await viewOption(wrapper, 'Split').trigger('click')
      expect(split.view).toBe('split')
      expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(true)
      expect(panelTitle(wrapper)).toBe('0:00:21.00')

      await viewOption(wrapper, 'Range').trigger('click')
      expect(split.view).toBe('range')
      expect(split.range).toEqual({ startSeconds: 10, endSeconds: 20 })
      expect(wrapper.find('[aria-label="Waveform of the range"]').exists()).toBe(true)
    })

    it('goes back to Split when a track row selects a split', async () => {
      const wrapper = mountPage()
      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')

      expect(viewOption(wrapper, 'Split').attributes('aria-checked')).toBe('true')
      expect(panelTitle(wrapper)).toBe('0:01:11.50')
    })

    it('stops the audition when the view changes', async () => {
      const wrapper = mountPage()
      const stop = vi.spyOn(useAuditionStore(), 'stop')

      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      expect(stop).toHaveBeenCalled()
    })
  })

  describe('the export button', () => {
    it('is enabled once the file is ready', () => {
      const wrapper = mountPage()

      expect(exportButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('is disabled while the file is not ready', async () => {
      const wrapper = mountPage()
      useSourceFileStore().status = 'loading'
      await wrapper.vm.$nextTick()

      expect(exportButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('is disabled while an export runs', async () => {
      const wrapper = mountPage()
      useExportTracksStore().status = 'running'
      await wrapper.vm.$nextTick()

      expect(exportButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('stops the audition, then starts the export', async () => {
      const wrapper = mountPage()
      const order: string[] = []
      vi.spyOn(useAuditionStore(), 'stop').mockImplementation(() => {
        order.push('stop')
      })
      vi.spyOn(useExportTracksStore(), 'start').mockImplementation(() => {
        order.push('start')
        return Promise.resolve()
      })

      await exportButton(wrapper).trigger('click')

      expect(order).toEqual(['stop', 'start'])
    })
  })
})
