import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
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
  return { split, wrapper: mount(SplitZoom, { attachTo: document.body }) }
}

function focusElement(element: Element) {
  if (element instanceof HTMLElement) element.focus()
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
      const { split, wrapper } = setup()
      const handle = wrapper.get('[role="slider"]')

      await handle.trigger('keydown', { key: 'ArrowRight' })
      expect(split.selectedSplit?.seconds).toBeCloseTo(21.01)

      await handle.trigger('keydown', { key: 'ArrowLeft' })
      await handle.trigger('keydown', { key: 'ArrowLeft' })
      expect(split.selectedSplit?.seconds).toBeCloseTo(20.99)
    })

    it('moves the split 100 ms with Shift and Left or Right', async () => {
      const { split, wrapper } = setup()
      const handle = wrapper.get('[role="slider"]')

      await handle.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
      expect(split.selectedSplit?.seconds).toBeCloseTo(21.1)

      await handle.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
      await handle.trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
      expect(split.selectedSplit?.seconds).toBeCloseTo(20.9)
    })

    it('follows the split: the slider value and the handle move with it', async () => {
      const { wrapper } = setup()
      const handle = wrapper.get('[role="slider"]')

      await handle.trigger('keydown', { key: 'ArrowRight', shiftKey: true })

      expect(handle.attributes('aria-valuetext')).toBe('0:00:21.10')
      // 0.1 s right of the centre of a 20 s window: 50.5 %.
      expect(handle.attributes('style')).toContain('left: 50.5%')
    })

    it('stops at the edge of the zoom window', async () => {
      const { split, wrapper } = setup()
      const selected = split.selectedSplit
      if (selected) split.moveSplit(selected.id, 30.95)
      await wrapper.vm.$nextTick()

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight', shiftKey: true })

      expect(split.selectedSplit?.seconds).toBeCloseTo(31)
    })

    it('does not scroll the page or handle other keys', async () => {
      const { split, wrapper } = setup()
      const handle = wrapper.get('[role="slider"]')

      const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })
      handle.element.dispatchEvent(arrow)
      const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
      handle.element.dispatchEvent(space)

      expect(arrow.defaultPrevented).toBe(true)
      expect(space.defaultPrevented).toBe(false)
      expect(split.splits).toHaveLength(2)
    })
  })

  describe('deleting with the keyboard', () => {
    it('deletes the selected split on Delete and selects the next one', async () => {
      const { split, wrapper } = setup()

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'Delete' })

      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
      expect(split.selectedSplit?.seconds).toBe(71.5)
    })

    it('takes Backspace for Delete, which is what the delete key of a Mac keyboard sends', async () => {
      const { split, wrapper } = setup()

      await wrapper.get('[role="slider"]').trigger('keydown', { key: 'Backspace' })

      expect(split.splits).toHaveLength(1)
    })

    it('keeps focus on the handle while a split is still selected', async () => {
      const { wrapper } = setup()
      const handle = wrapper.get('[role="slider"]')
      focusElement(handle.element)
      expect(document.activeElement).toBe(handle.element)

      await handle.trigger('keydown', { key: 'Delete' })
      await wrapper.vm.$nextTick()

      expect(document.activeElement).toBe(wrapper.get('[role="slider"]').element)
      expect(wrapper.get('[role="slider"]').attributes('aria-valuetext')).toBe('0:01:11.50')
    })

    it('moves focus to the zoom view itself when the last split is gone', async () => {
      const { split, wrapper } = setup()
      split.deleteSplit(split.splits[1]?.id ?? -1)
      await wrapper.vm.$nextTick()
      const handle = wrapper.get('[role="slider"]')
      focusElement(handle.element)

      await handle.trigger('keydown', { key: 'Delete' })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[role="slider"]').exists()).toBe(false)
      expect(document.activeElement).toBe(wrapper.element)
    })
  })

  describe('focusHandle', () => {
    it('puts the keyboard on the handle, so a split just added can be nudged at once', async () => {
      const { split, wrapper } = setup()
      split.moveZoomTo(46)
      split.addSplit()

      await wrapper.vm.focusHandle()

      expect(document.activeElement).toBe(wrapper.get('[role="slider"]').element)
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
