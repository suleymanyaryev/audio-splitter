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

function dialog() {
  return document.querySelector('[role="alertdialog"]')
}

function dialogButton(text: string) {
  const button = [...(dialog()?.querySelectorAll('button') ?? [])].find(
    (candidate) => candidate.textContent === text,
  )
  if (!button) throw new Error(`no "${text}" button`)
  return button
}

// A track named for each of the first `edits` entries: the first track, then the split's.
async function mountEdited(edits: number) {
  const split = useSplitStore()
  const names = ['Opener', 'Closer']
  for (const [index, name] of names.slice(0, edits).entries()) {
    split.renameTrack(split.splits[index - 1]?.id ?? null, name)
  }
  const wrapper = mount(LoudnessSettings, { attachTo: document.body })
  await flushPromises()
  return { split, wrapper }
}

describe('LoudnessSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSplitStore().detect(curveWithOneGap(), { windowSeconds: 0.05, durationSeconds: 20 })
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

  it('finds the gaps again when the minimum gap length moves above the gap', async () => {
    const wrapper = mount(LoudnessSettings, { attachTo: document.body })
    await flushPromises()
    const split = useSplitStore()
    expect(split.splits).toHaveLength(1)

    // The gap is 2 s long, the default minimum: one step up (0.1 s) puts the minimum above it.
    const thumb = wrapper.get('[aria-label="Minimum gap length"]')
    await thumb.trigger('keydown', { key: 'ArrowRight' })

    expect(split.minimumGapLength).toBeCloseTo(DEFAULT_MINIMUM_GAP_SECONDS + 0.1, 9)
    expect(split.splits).toHaveLength(0)
    wrapper.unmount()
  })

  describe('with edits to protect', () => {
    afterEach(() => {
      document.body.replaceChildren()
    })

    it('asks first, counting the edits, and leaves the value where it was', async () => {
      const { split, wrapper } = await mountEdited(2)
      const before = split.silenceThreshold

      await wrapper
        .get('[aria-label="Silence threshold"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      expect(dialog()?.textContent).toContain('Replace your edits?')
      expect(dialog()?.textContent).toContain(
        'This replaces your 2 edits with freshly detected splits.',
      )
      expect(split.silenceThreshold).toBe(before)
      expect(split.hasEdits).toBe(true)
      wrapper.unmount()
    })

    it('asks with pending splits and no edits, counting them, and keeps the buttons it has', async () => {
      const { split, wrapper } = await mountEdited(0)
      split.addPendingSplit(4, false)
      split.addPendingSplit(7, false)
      expect(split.hasEdits).toBe(false)

      await wrapper
        .get('[aria-label="Silence threshold"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      expect(dialog()?.textContent).toContain('Replace your edits?')
      expect(dialog()?.textContent).toContain(
        'This replaces your 2 pending splits with freshly detected splits.',
      )
      expect(
        [...(dialog()?.querySelectorAll('button') ?? [])].map((button) => button.textContent),
      ).toEqual(['Keep edits', 'Replace'])
      wrapper.unmount()
    })

    it('counts the edits and the pending splits together, and "Replace" drops both', async () => {
      const { split, wrapper } = await mountEdited(1)
      split.addPendingSplit(4, false)
      await wrapper
        .get('[aria-label="Silence threshold"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()
      expect(dialog()?.textContent).toContain(
        'This replaces your 1 edit and 1 pending split with freshly detected splits.',
      )

      dialogButton('Replace').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(split.hasEdits).toBe(false)
      expect(split.pendingSplits).toEqual([])
      wrapper.unmount()
    })

    it('says "1 edit" for a single edit', async () => {
      const { wrapper } = await mountEdited(1)

      await wrapper
        .get('[aria-label="Silence threshold"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      expect(dialog()?.textContent).toContain(
        'This replaces your 1 edit with freshly detected splits.',
      )
      wrapper.unmount()
    })

    it('puts focus on "Keep edits", which closes the question and keeps the value and the edits', async () => {
      const { split, wrapper } = await mountEdited(2)
      const before = split.silenceThreshold
      await wrapper
        .get('[aria-label="Silence threshold"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()
      expect(document.activeElement).toBe(dialogButton('Keep edits'))

      dialogButton('Keep edits').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(split.silenceThreshold).toBe(before)
      expect(split.hasEdits).toBe(true)
      wrapper.unmount()
    })

    it('applies the value asked about, with fresh splits and no edits, on "Replace"', async () => {
      const { split, wrapper } = await mountEdited(2)
      const before = split.silenceThreshold ?? 0
      await wrapper
        .get('[aria-label="Silence threshold"]')
        .trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      dialogButton('Replace').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(split.silenceThreshold).toBeCloseTo(before + 0.1, 9)
      expect(split.hasEdits).toBe(false)
      expect(split.tracks[0]?.name).toBe('1')
      wrapper.unmount()
    })

    it('guards the minimum gap length the same way, and asks no more once the edits are gone', async () => {
      const { split, wrapper } = await mountEdited(2)
      const thumb = wrapper.get('[aria-label="Minimum gap length"]')

      await thumb.trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()
      expect(split.minimumGapLength).toBe(DEFAULT_MINIMUM_GAP_SECONDS)
      dialogButton('Replace').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      await thumb.trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(split.minimumGapLength).toBeCloseTo(DEFAULT_MINIMUM_GAP_SECONDS + 0.2, 9)
      wrapper.unmount()
    })
  })
})
