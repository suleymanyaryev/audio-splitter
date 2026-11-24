import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { flushPromises, mount } from '@vue/test-utils'
import { DEFAULT_MINIMUM_GAP_SECONDS, DEFAULT_OFFSET_DB } from '@/entities/split/config/defaults.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import LoudnessSettings from '../LoudnessSettings.vue'

// 20 s at 50 ms per window: loud, a 2 s silence from 10 s, loud again.
function curveWithOneGap() {
  const curve = new Float32Array(400).fill(-10)
  curve.fill(-70, 200, 240)
  return curve
}

// Find gaps pressed, then the first track and the second named: two hand-made edits.
function mountEdited() {
  const split = useSplitStore()
  split.addGapSplits()
  split.renameTrack(null, 'Opener')
  split.renameTrack(split.splits[0]!.id, 'Closer')
  const wrapper = mount(LoudnessSettings, { attachTo: document.body })
  return { split, wrapper }
}

function findGapsButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().startsWith('Find gaps'))
  if (!button) throw new Error('no Find gaps button')
  return button
}

describe('LoudnessSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSplitStore().open(curveWithOneGap(), { windowSeconds: 0.05, durationSeconds: 20 })
  })

  it('reads out both settings of the split store, with a real minus sign', () => {
    const wrapper = mount(LoudnessSettings)

    // The median is -10 dB, so the threshold starts the default offset under it.
    expect(wrapper.text()).toContain('Silence threshold')
    expect(wrapper.text()).toContain(`−${(10 + DEFAULT_OFFSET_DB).toFixed(1)} dB`)
    expect(wrapper.text()).toContain('Minimum gap length')
    expect(wrapper.text()).toContain(`${DEFAULT_MINIMUM_GAP_SECONDS.toFixed(1)} s`)
  })

  it('moves the threshold in tenths of a dB through the store', async () => {
    const wrapper = mount(LoudnessSettings, { attachTo: document.body })
    await flushPromises()

    const thumb = wrapper.get('[aria-label="Silence threshold"]')
    await thumb.trigger('keydown', { key: 'ArrowRight' })

    const moved = -10 - DEFAULT_OFFSET_DB + 0.1
    expect(useSplitStore().silenceThreshold).toBeCloseTo(moved, 9)
    expect(wrapper.text()).toContain(`−${Math.abs(moved).toFixed(1)} dB`)
    wrapper.unmount()
  })

  it('moves the minimum gap length above the gap, which drops the gap and no split', async () => {
    const wrapper = mount(LoudnessSettings, { attachTo: document.body })
    await flushPromises()
    const split = useSplitStore()
    split.addGapSplits()
    expect(split.gaps).toHaveLength(1)

    // The gap is 2 s long, the default minimum: one step up (0.1 s) puts the minimum above it.
    const thumb = wrapper.get('[aria-label="Minimum gap length"]')
    await thumb.trigger('keydown', { key: 'ArrowRight' })

    expect(split.minimumGapLength).toBeCloseTo(DEFAULT_MINIMUM_GAP_SECONDS + 0.1, 9)
    expect(split.gaps).toHaveLength(0)
    expect(split.splits).toHaveLength(1)
    wrapper.unmount()
  })

  describe('Find gaps', () => {
    it('says how many splits a press would add', () => {
      const wrapper = mount(LoudnessSettings)

      expect(findGapsButton(wrapper).text()).toBe('Find gaps (1)')
      expect(findGapsButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('adds the splits, and is disabled at 0 once they are there', async () => {
      const wrapper = mount(LoudnessSettings)

      await findGapsButton(wrapper).trigger('click')

      const split = useSplitStore()
      expect(split.splits.map((point) => point.seconds)).toEqual([expect.closeTo(11, 9)])
      expect(findGapsButton(wrapper).text()).toBe('Find gaps (0)')
      expect(findGapsButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('follows the sliders live', async () => {
      const wrapper = mount(LoudnessSettings, { attachTo: document.body })
      await flushPromises()

      // One step above the 2 s gap: no gap is left to find.
      await wrapper
        .get('[aria-label="Minimum gap length"]')
        .trigger('keydown', { key: 'ArrowRight' })

      expect(findGapsButton(wrapper).text()).toBe('Find gaps (0)')
      wrapper.unmount()
    })
  })

  describe('with work to protect', () => {
    afterEach(() => {
      document.body.replaceChildren()
    })

    it('moves a setting with no question, keeping the edits, the splits and the pending splits', async () => {
      const { split, wrapper } = mountEdited()
      split.addPendingSplit(4, false)
      const before = split.silenceThreshold ?? 0

      await wrapper
        .get('[aria-label="Silence threshold"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      expect(document.querySelector('[role="alertdialog"]')).toBeNull()
      expect(split.silenceThreshold).toBeCloseTo(before + 0.1, 9)
      expect(split.editCount).toBe(2)
      expect(split.pendingSplits).toEqual([4])
      expect(split.splits).toHaveLength(1)
      wrapper.unmount()
    })

    it('moves the minimum gap length the same way', async () => {
      const { split, wrapper } = mountEdited()

      await wrapper
        .get('[aria-label="Minimum gap length"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      expect(document.querySelector('[role="alertdialog"]')).toBeNull()
      expect(split.minimumGapLength).toBeCloseTo(DEFAULT_MINIMUM_GAP_SECONDS + 0.1, 9)
      expect(split.tracks.map((track) => track.name)).toEqual(['Opener', 'Closer'])
      wrapper.unmount()
    })
  })
})
