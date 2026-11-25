import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { flushPromises, mount } from '@vue/test-utils'
import { DEFAULT_MINIMUM_GAP_SECONDS, DEFAULT_OFFSET_DB } from '@/entities/split/config/defaults.ts'
import type { FoundMatch } from '@/entities/split/lib/find-matches.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import LoudnessSettings from '../LoudnessSettings.vue'

/*
The worker is replaced by an answer the spec chooses: which matches the search says there are, or
the reason it fails with. `isHolding` keeps the answer back, so the busy state can be looked at.
*/
const search = vi.hoisted(() => ({
  answer: [] as FoundMatch[],
  failure: null as string | null,
  isHolding: false,
  release: () => {},
}))
vi.mock('@/entities/split/api/find-matches-client.ts', () => ({
  findMatchesInWorker: () =>
    new Promise((resolve, reject) => {
      const answer = () => {
        if (search.failure === null) resolve(search.answer)
        else reject(new Error(search.failure))
      }
      if (search.isHolding) search.release = answer
      else answer()
    }),
}))

// A match of the later track with the earlier one, whatever they share.
function match(later: number, earlier: number, kind: FoundMatch['kind']): FoundMatch {
  return {
    later,
    earlier,
    kind,
    laterShared: { from: 0, to: 30 },
    earlierShared: { from: 0, to: 30 },
  }
}

// 20 s at 50 ms per window: loud, a 2 s silence from 10 s, loud again.
function curveWithOneGap() {
  const curve = new Float32Array(400).fill(-10)
  curve.fill(-70, 200, 240)
  return curve
}

// Find splits pressed, then the first track and the second named: two hand-made edits.
function mountEdited() {
  const split = useSplitStore()
  split.findSplits()
  split.renameTrack(null, 'Opener')
  split.renameTrack(split.splits[0]!.id, 'Closer')
  const wrapper = mount(LoudnessSettings, { attachTo: document.body })
  return { split, wrapper }
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

function clearButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Clear splits')
  if (!button) throw new Error('no Clear splits button')
  return button
}

function buttonNamed(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === text)
  if (!button) throw new Error(`no ${text} button`)
  return button
}

// What the tooltip around the button says once it takes the keyboard.
async function tooltipOf(button: { trigger: (event: string) => Promise<void> }) {
  await button.trigger('focus')
  const text = document.querySelector('[role="tooltip"]')?.textContent
  await button.trigger('blur')
  return text
}

// Three loud stretches of 35 s with a 2 s silence between each two: three tracks of 30 s or more.
function curveWithThreeLongTracks() {
  const curve = new Float32Array(2140).fill(-10)
  curve.fill(-70, 700, 740)
  curve.fill(-70, 1440, 1480)
  return curve
}

function findDuplicatesButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find(
      (candidate) =>
        candidate.text().includes('duplicates') && !candidate.text().includes('Find splits'),
    )
  if (!button) throw new Error('no Find duplicates button')
  return button
}

function findSplitsButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().startsWith('Find splits'))
  if (!button) throw new Error('no Find splits button')
  return button
}

describe('LoudnessSettings', () => {
  beforeEach(() => {
    // The default settings are kept in localStorage, which a spec must not inherit from another.
    localStorage.clear()
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
    split.findSplits()
    expect(split.gaps).toHaveLength(1)

    // The gap is 2 s long, the default minimum: one step up (0.1 s) puts the minimum above it.
    const thumb = wrapper.get('[aria-label="Minimum gap length"]')
    await thumb.trigger('keydown', { key: 'ArrowRight' })

    expect(split.minimumGapLength).toBeCloseTo(DEFAULT_MINIMUM_GAP_SECONDS + 0.1, 9)
    expect(split.gaps).toHaveLength(0)
    expect(split.splits).toHaveLength(1)
    wrapper.unmount()
  })

  describe('Find splits', () => {
    it('says how many splits a press would add', () => {
      const wrapper = mount(LoudnessSettings)

      expect(findSplitsButton(wrapper).text()).toBe('Find splits (1)')
      expect(findSplitsButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('adds the splits, and is disabled at 0 once they are there', async () => {
      const wrapper = mount(LoudnessSettings)

      await findSplitsButton(wrapper).trigger('click')

      const split = useSplitStore()
      expect(split.splits.map((point) => point.seconds)).toEqual([expect.closeTo(11, 9)])
      expect(findSplitsButton(wrapper).text()).toBe('Find splits (0)')
      expect(findSplitsButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('follows the sliders live', async () => {
      const wrapper = mount(LoudnessSettings, { attachTo: document.body })
      await flushPromises()

      // One step above the 2 s gap: no gap is left to find.
      await wrapper
        .get('[aria-label="Minimum gap length"]')
        .trigger('keydown', { key: 'ArrowRight' })

      expect(findSplitsButton(wrapper).text()).toBe('Find splits (0)')
      wrapper.unmount()
    })
  })

  describe('Find duplicates', () => {
    beforeEach(() => {
      search.answer = []
      search.failure = null
      search.isHolding = false
      const split = useSplitStore()
      split.open(curveWithThreeLongTracks(), { windowSeconds: 0.05, durationSeconds: 107 })
      split.findSplits()
    })

    it('sits beside "Find splits" and says nothing before the first press', () => {
      const wrapper = mount(LoudnessSettings)

      expect(
        wrapper
          .findAll('button')
          .map((button) => button.text())
          .slice(0, 2),
      ).toEqual(['Find splits (0)', 'Find duplicates'])
      expect(findDuplicatesButton(wrapper).attributes('disabled')).toBeUndefined()
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    })

    it('is disabled while fewer than two tracks are 30 s or longer', () => {
      useSplitStore().open(curveWithOneGap(), { windowSeconds: 0.05, durationSeconds: 20 })

      const wrapper = mount(LoudnessSettings)

      expect(findDuplicatesButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('counts what the search found, and changes no split', async () => {
      search.answer = [match(2, 0, 'full')]
      const wrapper = mount(LoudnessSettings)
      const split = useSplitStore()

      await findDuplicatesButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="status"]').text()).toBe('1 duplicate')
      expect(split.splits).toHaveLength(2)
      expect(split.editCount).toBe(0)
    })

    it('counts the partial matches after the duplicates', async () => {
      search.answer = [match(1, 0, 'full'), match(2, 0, 'holds'), match(2, 1, 'part-of')]
      const wrapper = mount(LoudnessSettings)

      await findDuplicatesButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="status"]').text()).toBe('1 duplicate, 2 partial matches')
    })

    it('says so when the search found none', async () => {
      const wrapper = mount(LoudnessSettings)

      await findDuplicatesButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="status"]').text()).toBe('No duplicates found')
    })

    it('says why the search failed, and can be pressed again', async () => {
      search.failure = 'Out of memory'
      const wrapper = mount(LoudnessSettings)

      await findDuplicatesButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toBe("Couldn't find duplicates: Out of memory")
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
      expect(findDuplicatesButton(wrapper).attributes('disabled')).toBeUndefined()

      search.failure = null
      await findDuplicatesButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.get('[role="status"]').text()).toBe('No duplicates found')
    })

    it('is busy and disabled while the search runs, and ready again after', async () => {
      search.isHolding = true
      const wrapper = mount(LoudnessSettings)

      await findDuplicatesButton(wrapper).trigger('click')

      expect(findDuplicatesButton(wrapper).text()).toBe('Finding duplicates…')
      expect(findDuplicatesButton(wrapper).attributes('aria-busy')).toBe('true')
      expect(findDuplicatesButton(wrapper).attributes('disabled')).toBeDefined()

      search.release()
      await flushPromises()

      expect(findDuplicatesButton(wrapper).text()).toBe('Find duplicates')
      expect(findDuplicatesButton(wrapper).attributes('aria-busy')).toBe('false')
      expect(findDuplicatesButton(wrapper).attributes('disabled')).toBeUndefined()
    })
  })

  describe('Clear splits', () => {
    afterEach(() => {
      document.body.replaceChildren()
    })

    it('is disabled while there is no split', () => {
      const wrapper = mount(LoudnessSettings)

      expect(clearButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('runs at once, with no question, when there is nothing of the user’s to lose', async () => {
      const split = useSplitStore()
      split.findSplits()
      const wrapper = mount(LoudnessSettings, { attachTo: document.body })

      await clearButton(wrapper).trigger('click')
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(split.splits).toEqual([])
      wrapper.unmount()
    })

    it('asks first after an edit, counting it, and clears on "Clear splits"', async () => {
      const { split, wrapper } = mountEdited()

      await clearButton(wrapper).trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain('Clear splits?')
      expect(dialog()?.textContent).toContain(
        'This deletes every split and name, and discards your 2 edits.',
      )
      expect(split.splits).toHaveLength(1)

      dialogButton('Clear splits').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(split.splits).toEqual([])
      expect(split.hasEdits).toBe(false)
      wrapper.unmount()
    })

    it('asks for pending splits alone, and counts them with the edits when there are both', async () => {
      const split = useSplitStore()
      split.findSplits()
      split.addPendingSplit(4, false)
      split.addPendingSplit(7, false)
      const wrapper = mount(LoudnessSettings, { attachTo: document.body })

      await clearButton(wrapper).trigger('click')
      await flushPromises()
      expect(dialog()?.textContent).toContain('discards your 2 pending splits.')
      dialogButton('Keep splits').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      split.renameTrack(null, 'Opener')
      await clearButton(wrapper).trigger('click')
      await flushPromises()
      expect(dialog()?.textContent).toContain('discards your 1 edit and 2 pending splits.')
      wrapper.unmount()
    })

    it('puts focus on "Keep splits", which closes the question and keeps everything', async () => {
      const { split, wrapper } = mountEdited()
      await clearButton(wrapper).trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(dialogButton('Keep splits'))

      dialogButton('Keep splits').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(split.splits).toHaveLength(1)
      expect(split.editCount).toBe(2)
      wrapper.unmount()
    })
  })

  describe('the default settings', () => {
    afterEach(() => {
      document.body.replaceChildren()
    })

    it('disables both actions while the sliders match built-in default settings', () => {
      const wrapper = mount(LoudnessSettings)

      expect(buttonNamed(wrapper, 'Save as default').attributes('disabled')).toBeDefined()
      expect(buttonNamed(wrapper, 'Restore built-in').attributes('disabled')).toBeDefined()
    })

    it('enables "Save as default" once a slider moves, and says what it would save', async () => {
      const wrapper = mount(LoudnessSettings, { attachTo: document.body })
      await flushPromises()

      await wrapper.get('[aria-label="Silence threshold"]').trigger('keydown', { key: 'ArrowLeft' })

      const save = buttonNamed(wrapper, 'Save as default')
      expect(save.attributes('disabled')).toBeUndefined()
      // The median is -10 dB, so one step down is 18.1 dB under it.
      expect(await tooltipOf(save)).toBe('Save 18.1 dB under the median and 2 s as the default')
      wrapper.unmount()
    })

    it('saves, which disables the button and enables "Restore built-in"', async () => {
      const wrapper = mount(LoudnessSettings, { attachTo: document.body })
      await flushPromises()
      await wrapper
        .get('[aria-label="Minimum gap length"]')
        .trigger('keydown', { key: 'ArrowLeft' })

      await buttonNamed(wrapper, 'Save as default').trigger('click')

      expect(buttonNamed(wrapper, 'Save as default').attributes('disabled')).toBeDefined()
      expect(buttonNamed(wrapper, 'Restore built-in').attributes('disabled')).toBeUndefined()
      expect(await tooltipOf(buttonNamed(wrapper, 'Restore built-in'))).toBe(
        'Put the default settings back to 18 dB under the median and 2 s',
      )
      wrapper.unmount()
    })

    it('restores the built-in ones, and moves this file’s sliders there', async () => {
      const wrapper = mount(LoudnessSettings, { attachTo: document.body })
      await flushPromises()
      const split = useSplitStore()
      await wrapper
        .get('[aria-label="Minimum gap length"]')
        .trigger('keydown', { key: 'ArrowLeft' })
      await buttonNamed(wrapper, 'Save as default').trigger('click')

      await buttonNamed(wrapper, 'Restore built-in').trigger('click')

      expect(split.minimumGapLength).toBe(DEFAULT_MINIMUM_GAP_SECONDS)
      expect(wrapper.text()).toContain(`${DEFAULT_MINIMUM_GAP_SECONDS.toFixed(1)} s`)
      expect(buttonNamed(wrapper, 'Restore built-in').attributes('disabled')).toBeDefined()
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
