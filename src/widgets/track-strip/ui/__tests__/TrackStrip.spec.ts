import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { flushPromises, mount } from '@vue/test-utils'
import { useSplitStore } from '@/entities/split/model/split.ts'
import TrackStrip from '../TrackStrip.vue'

// The worker is replaced by an answer: the third track repeats the first.
vi.mock('@/entities/split/api/find-matches-client.ts', () => ({
  findMatchesInWorker: () => Promise.resolve([{ duplicate: 2, kept: 0 }]),
}))

// 100 s at 50 ms per window: loud, a 2 s silence from 20 s, loud, a 2 s silence from 70.5 s, loud.
function curveWithTwoGaps() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 400, 440)
  curve.fill(-70, 1410, 1450)
  return curve
}

// The strip measures itself once mounted, and draws its blocks on the next render.
async function mountStrip() {
  const wrapper = mount(TrackStrip)
  await flushPromises()
  return wrapper
}

// The track blocks: the items of the list whose button is no split's.
function blocks(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAll('ol > li')
    .filter((item) => !item.find('button[aria-label^="Split "]').exists())
}

// The split items between them, as the buttons that select a split.
function splitItems(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button[aria-label^="Split "]')
}

// 107 s: three loud stretches of 35 s with a 2 s silence between each two.
function curveWithThreeLongTracks() {
  const curve = new Float32Array(2140).fill(-10)
  curve.fill(-70, 700, 740)
  curve.fill(-70, 1440, 1480)
  return curve
}

async function mountWithDuplicate() {
  const split = useSplitStore()
  split.open(curveWithThreeLongTracks(), { windowSeconds: 0.05, durationSeconds: 107 })
  split.addGapSplits()
  await split.findDuplicates()
  return { split, wrapper: await mountStrip() }
}

async function mountWithTwoGaps() {
  const split = useSplitStore()
  split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
  split.addGapSplits()
  return { split, wrapper: await mountStrip() }
}

describe('TrackStrip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // jsdom measures nothing: the strip is 1016 px wide, which after two 8 px split items leaves 1000 px.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1016)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('draws one block per track, wide in proportion to its length, with name and length', async () => {
    useSplitStore().open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    useSplitStore().addGapSplits()

    const wrapper = await mountStrip()

    expect(blocks(wrapper)).toHaveLength(3)
    expect(blocks(wrapper).map((block) => block.text())).toEqual([
      '10:00:21',
      '20:00:50',
      '30:00:28',
    ])
    // 21 : 50.5 : 28.5 of 100 s over 1000 px.
    expect(blocks(wrapper).map((block) => block.attributes('style'))).toEqual([
      'width: 210px;',
      'width: 505px;',
      'width: 285px;',
    ])
  })

  it('labels an unnamed block with its number and a renamed one with its name, as typed', async () => {
    const { split, wrapper } = await mountWithTwoGaps()
    split.setTrackNamePrefix('dreamscape-')
    split.renameTrack(split.splits[0]!.id, 'Intro')
    await flushPromises()

    expect(blocks(wrapper).map((block) => block.text())).toEqual([
      '10:00:21',
      'Intro0:00:50',
      '30:00:28',
    ])
  })

  it('gives the full name in the tooltip and the accessible label', async () => {
    const { split, wrapper } = await mountWithTwoGaps()
    split.setTrackNamePrefix('dreamscape-')
    split.renameTrack(split.splits[0]!.id, 'Intro')
    await flushPromises()

    expect(blocks(wrapper).map((block) => block.attributes('title'))).toEqual([
      'dreamscape-01, 0:00:21',
      'Intro, 0:00:50',
      'dreamscape-03, 0:00:28',
    ])
    expect(blocks(wrapper).map((block) => block.get('button').attributes('aria-label'))).toEqual([
      'dreamscape-01, 0:00:21',
      'Intro, 0:00:50',
      'dreamscape-03, 0:00:28',
    ])
  })

  it('is one block over the whole file when there are no splits', async () => {
    useSplitStore().open(new Float32Array(400).fill(-10), {
      windowSeconds: 0.05,
      durationSeconds: 20,
    })

    const wrapper = await mountStrip()

    expect(blocks(wrapper)).toHaveLength(1)
    expect(blocks(wrapper)[0]?.text()).toBe('10:00:20')
    expect(blocks(wrapper)[0]?.attributes('style')).toContain('width: 1016px')
  })

  it('drops the length, then the name, of blocks too narrow for them, keeping both in the title', async () => {
    useSplitStore().open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    useSplitStore().addGapSplits()
    // 116 px leaves 100 px for the three tracks: 21, 50.5 and 28.5 px.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(116)

    const wrapper = await mountStrip()

    // The first and third block are under 32 px: no text. The second, 50 px, has only its name.
    expect(blocks(wrapper).map((block) => block.text())).toEqual(['', '2', ''])
    // A sliver has no padding: border-box padding would keep it from getting narrower than itself.
    expect(blocks(wrapper)[0]?.classes()).not.toContain('px-1')
    expect(blocks(wrapper)[1]?.classes()).toContain('px-1')
    expect(blocks(wrapper)[0]?.attributes('title')).toBe('01, 0:00:21')
    // A block with no text is still a button with a name.
    expect(blocks(wrapper).map((block) => block.get('button').attributes('aria-label'))).toEqual([
      '01, 0:00:21',
      '02, 0:00:50',
      '03, 0:00:28',
    ])
  })

  it('keeps its blocks when the minimum gap length changes, since that changes only the gaps', async () => {
    const split = useSplitStore()
    split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    split.addGapSplits()
    const wrapper = await mountStrip()
    expect(blocks(wrapper)).toHaveLength(3)

    split.setMinimumGapLength(3)
    await wrapper.vm.$nextTick()

    expect(blocks(wrapper)).toHaveLength(3)
  })

  describe('a left-out track', () => {
    it('is a hollow block with a dashed border, where the land shows through', async () => {
      const { split, wrapper } = await mountWithTwoGaps()

      split.toggleLeftOut(split.splits[0]!.id)
      await flushPromises()

      const [first, left, last] = blocks(wrapper)
      expect(left?.classes()).toEqual(
        expect.arrayContaining(['border-dashed', 'border-track', 'bg-transparent', 'text-ink']),
      )
      expect(left?.classes()).not.toContain('bg-track')
      expect(first?.classes()).toContain('bg-track')
      expect(last?.classes()).toContain('bg-track')
    })

    it('says "left out" in its tooltip and accessible label, with its place as the name when unnamed', async () => {
      const { split, wrapper } = await mountWithTwoGaps()
      split.setTrackNamePrefix('dreamscape-')

      split.toggleLeftOut(split.splits[0]!.id)
      await flushPromises()

      expect(blocks(wrapper)[1]?.attributes('title')).toBe('dreamscape-02, 0:00:50, left out')
      expect(blocks(wrapper)[1]?.get('button').attributes('aria-label')).toBe(
        'dreamscape-02, 0:00:50, left out',
      )
      // Its visible label is still its number: the track's place in the file.
      expect(blocks(wrapper)[1]?.text()).toContain('2')
    })

    it('stays a button that selects its track, marked by an ink border while selected', async () => {
      const { split, wrapper } = await mountWithTwoGaps()
      split.toggleLeftOut(split.splits[0]!.id)
      await flushPromises()

      await blocks(wrapper)[1]?.get('button').trigger('click')

      expect(split.selectedTrack?.number).toBe(2)
      expect(blocks(wrapper)[1]?.classes()).toContain('border-ink')
      expect(blocks(wrapper)[1]?.classes()).not.toContain('border-on-track')
    })

    it('is a solid block again once it is brought back', async () => {
      const { split, wrapper } = await mountWithTwoGaps()
      split.toggleLeftOut(split.splits[0]!.id)
      await flushPromises()

      split.toggleLeftOut(split.splits[0]!.id)
      await flushPromises()

      expect(blocks(wrapper)[1]?.classes()).toContain('bg-track')
      expect(blocks(wrapper)[1]?.classes()).not.toContain('border-dashed')
      expect(blocks(wrapper)[1]?.attributes('title')).toBe('02, 0:00:50')
    })
  })

  describe('a duplicate', () => {
    it('is drawn as a left-out block, and the kept copy as any other', async () => {
      const { wrapper } = await mountWithDuplicate()

      const [first, second, third] = blocks(wrapper)
      expect(third?.classes()).toEqual(
        expect.arrayContaining(['border-dashed', 'border-track', 'bg-transparent', 'text-ink']),
      )
      expect(first?.classes()).toContain('bg-track')
      expect(second?.classes()).toContain('bg-track')
    })

    it('gives its words in its tooltip and accessible label', async () => {
      const { wrapper } = await mountWithDuplicate()

      expect(blocks(wrapper)[2]?.attributes('title')).toBe('03, 0:00:34, left out, duplicate of 01')
      expect(blocks(wrapper)[2]?.get('button').attributes('aria-label')).toBe(
        '03, 0:00:34, left out, duplicate of 01',
      )
      expect(blocks(wrapper)[0]?.attributes('title')).toBe('01, 0:00:36')
    })

    it('adds the name of the kept copy to its words', async () => {
      const { split, wrapper } = await mountWithDuplicate()
      split.renameTrack(null, 'Opening')
      await flushPromises()

      expect(blocks(wrapper)[2]?.attributes('title')).toBe(
        '03, 0:00:34, left out, duplicate of 01 Opening',
      )
    })

    it('is a solid block again once an edit drops its match', async () => {
      const { split, wrapper } = await mountWithDuplicate()

      split.addSplitAt(90)
      await flushPromises()

      expect(blocks(wrapper)[2]?.classes()).toContain('bg-track')
      expect(blocks(wrapper)[2]?.classes()).not.toContain('border-dashed')
    })
  })

  describe('selecting a track', () => {
    it('selects the track when its block is clicked', async () => {
      const { split, wrapper } = await mountWithTwoGaps()

      await blocks(wrapper)[2]?.get('button').trigger('click')

      expect(split.selectedTrack?.number).toBe(3)
      expect(split.selectedSplit).toBeNull()
    })

    it('makes every block a button, the first included, which selects its track', async () => {
      const { split, wrapper } = await mountWithTwoGaps()

      expect(blocks(wrapper).map((block) => block.find('button').exists())).toEqual([
        true,
        true,
        true,
      ])

      await blocks(wrapper)[0]?.get('button').trigger('click')

      expect(split.selectedTrack?.number).toBe(1)
    })

    it('marks the block of the selected track as current, in a 2 px on-track border', async () => {
      const { split, wrapper } = await mountWithTwoGaps()

      // Detection selects track 1.
      expect(wrapper.findAll('li[aria-current]')).toHaveLength(1)
      expect(blocks(wrapper)[0]?.element.closest('li')?.getAttribute('aria-current')).toBe('true')

      split.selectTrack(split.tracks[1]!)
      await wrapper.vm.$nextTick()

      expect(blocks(wrapper).map((block) => block.attributes('aria-current'))).toEqual([
        undefined,
        'true',
        undefined,
      ])
      expect(blocks(wrapper)[1]?.classes()).toContain('border-on-track')
      expect(blocks(wrapper)[0]?.classes()).not.toContain('border-on-track')
    })

    it('marks the first block when the first track is selected', async () => {
      const { split, wrapper } = await mountWithTwoGaps()

      split.selectTrack(split.tracks[0]!)
      await wrapper.vm.$nextTick()

      expect(blocks(wrapper)[0]?.attributes('aria-current')).toBe('true')
    })

    it('marks no block when a split is selected', async () => {
      const { split, wrapper } = await mountWithTwoGaps()
      split.selectTrack(split.tracks[1]!)
      await wrapper.vm.$nextTick()

      split.selectSplit(split.splits[0]!.id)
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('li[aria-current]')).toHaveLength(0)
    })

    it('keeps the name and length of a block in the button too', async () => {
      const { wrapper } = await mountWithTwoGaps()

      expect(blocks(wrapper)[1]?.get('button').text()).toBe('20:00:50')
    })
  })
  describe('split items', () => {
    it('puts one between every two blocks, and none at the ends', async () => {
      const { wrapper } = await mountWithTwoGaps()

      const order = wrapper
        .findAll('ol > li')
        .map((item) => (item.find('button[aria-label^="Split "]').exists() ? 'split' : 'block'))

      expect(order).toEqual(['block', 'split', 'block', 'split', 'block'])
    })

    it('has none for a single track', async () => {
      useSplitStore().open(new Float32Array(400).fill(-10), {
        windowSeconds: 0.05,
        durationSeconds: 20,
      })

      const wrapper = await mountStrip()

      expect(splitItems(wrapper)).toHaveLength(0)
    })

    it('is 8 px wide', async () => {
      const { wrapper } = await mountWithTwoGaps()

      const items = splitItems(wrapper).map((button) => button.element.parentElement!)

      expect(items.map((item) => item.getAttribute('style'))).toEqual([
        'width: 8px;',
        'width: 8px;',
      ])
    })

    it('names the split and its time', async () => {
      const { wrapper } = await mountWithTwoGaps()

      expect(splitItems(wrapper).map((item) => item.attributes('aria-label'))).toEqual([
        'Split 1, 0:00:21.00',
        'Split 2, 0:01:11.50',
      ])
    })

    it('selects the split when clicked, and shows the zoom view centred on it', async () => {
      const { split, wrapper } = await mountWithTwoGaps()
      split.selectTrack(split.tracks[0]!)
      expect(split.view).toBe('track')

      await splitItems(wrapper)[1]?.trigger('click')

      expect(split.selectedSplit?.seconds).toBe(71.5)
      expect(split.selectedTrack).toBeNull()
      expect(split.view).toBe('split')
      expect(split.zoomCentreSeconds).toBe(71.5)
    })

    it('is current when its split is selected, and only then', async () => {
      const { split, wrapper } = await mountWithTwoGaps()

      // Detection selects track 1, so no split is current yet.
      expect(wrapper.findAll('button[aria-current]')).toHaveLength(0)

      split.selectSplit(split.splits[0]!.id)
      await wrapper.vm.$nextTick()
      expect(splitItems(wrapper).map((item) => item.attributes('aria-current'))).toEqual([
        'true',
        undefined,
      ])

      split.selectSplit(split.splits[1]!.id)
      await wrapper.vm.$nextTick()
      expect(splitItems(wrapper).map((item) => item.attributes('aria-current'))).toEqual([
        undefined,
        'true',
      ])

      split.selectTrack(split.tracks[1]!)
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('button[aria-current]')).toHaveLength(0)
    })

    it('is land at rest and rust when hovered, focused or selected', async () => {
      const { split, wrapper } = await mountWithTwoGaps()
      split.selectSplit(split.splits[0]!.id)
      await wrapper.vm.$nextTick()
      const [selected, other] = splitItems(wrapper)

      expect(selected?.classes()).toContain('bg-split')
      expect(other?.classes()).not.toContain('bg-split')
      expect(other?.classes()).toContain('hover:bg-split')
      expect(other?.classes()).toContain('focus-visible:bg-split')
    })

    it('draws a focus ring on top of the rust fill, so a focused item differs from a selected one', async () => {
      const { wrapper } = await mountWithTwoGaps()

      for (const item of splitItems(wrapper)) {
        expect(item.classes()).toEqual(
          expect.arrayContaining(['focus-visible:outline-2', 'focus-visible:outline-ink']),
        )
        expect(item.classes()).not.toContain('focus-visible:outline-none')
      }
    })

    it('carries a rust rule at every split, selected or not', async () => {
      const { wrapper } = await mountWithTwoGaps()

      for (const item of splitItems(wrapper)) {
        expect(item.classes()).toEqual(
          expect.arrayContaining(['after:bg-split', 'after:w-0.5', 'tint-transition']),
        )
      }
    })

    it('follows a split that is added', async () => {
      const { split, wrapper } = await mountWithTwoGaps()

      split.selectSplit(split.splits[0]!.id)
      split.moveZoomTo(45)
      split.addSplit()
      await wrapper.vm.$nextTick()

      expect(splitItems(wrapper)).toHaveLength(3)
      expect(splitItems(wrapper).map((item) => item.attributes('aria-label')?.slice(0, 7))).toEqual(
        ['Split 1', 'Split 2', 'Split 3'],
      )
    })
  })
})
