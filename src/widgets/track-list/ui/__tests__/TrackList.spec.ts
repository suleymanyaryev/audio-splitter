import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { mount } from '@vue/test-utils'
import { useSplitStore } from '@/entities/split/model/split.ts'
import TrackList from '../TrackList.vue'

// 100 s at 50 ms per window: loud, a 2 s silence from 20 s, loud, a 2 s silence from 70.5 s, loud.
function curveWithTwoGaps() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 400, 440)
  curve.fill(-70, 1410, 1450)
  return curve
}

/*
Each row, in order, as number, name (a track's field value, or a split row's text), start and
length. A split row has no number and no length.
*/
function rows(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('tbody tr').map((row) => {
    const [number, name, start, length] = row.findAll('td')
    const field = row.find<HTMLInputElement>('input')
    return [
      number?.text(),
      field.exists() ? field.element.value : name?.text(),
      start?.text(),
      length?.text(),
    ]
  })
}

// The rows of the tracks, and of the splits between them, in time order.
const trackRows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('tbody tr').filter((row) => row.find('input').exists())
const splitRows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('tbody tr').filter((row) => !row.find('input').exists())

function nameField(wrapper: ReturnType<typeof mount>, trackNumber: number) {
  return wrapper.get<HTMLInputElement>(`input[aria-label="Name of track ${trackNumber}"]`)
}

// What the three name fields show, in order.
const fieldValues = (wrapper: ReturnType<typeof mount>) =>
  [1, 2, 3].map((number) => nameField(wrapper, number).element.value)

function removeButton(wrapper: ReturnType<typeof mount>, trackNumber: number) {
  return wrapper.get(`button[aria-label="Remove track ${trackNumber}"]`)
}

function mountWithTwoGaps() {
  const split = useSplitStore()
  split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
  split.addGapSplits()
  return { split, wrapper: mount(TrackList) }
}

// Each row's `aria-current`, in order: 'true' on the marked one.
const marked = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('tbody tr').map((row) => row.attributes('aria-current'))

// What the tooltip says once the button takes the keyboard.
async function tooltipOf(button: { trigger: (event: string) => Promise<void> }) {
  await button.trigger('focus')
  const text = document.querySelector('[role="tooltip"]')?.textContent
  await button.trigger('blur')
  return text
}

describe('TrackList', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    // jsdom has no layout and no scrollIntoView.
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    scrollIntoView.mockClear()
  })

  it('lists each track, with a split row between every two, in time order', () => {
    useSplitStore().open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    useSplitStore().addGapSplits()

    const wrapper = mount(TrackList)

    expect(wrapper.findAll('thead th').map((cell) => cell.text())).toEqual([
      '#',
      'Name',
      'Start',
      'Length',
      'Actions',
    ])
    expect(rows(wrapper)).toEqual([
      ['1', '01', '0:00:00.00', '0:00:21'],
      ['', 'Split 1', '0:00:21.00', ''],
      ['2', '02', '0:00:21.00', '0:00:50'],
      ['', 'Split 2', '0:01:11.50', ''],
      ['3', '03', '0:01:11.50', '0:00:28'],
    ])
  })

  it('shows one track over the whole file when there are no splits', () => {
    useSplitStore().open(new Float32Array(400).fill(-10), {
      windowSeconds: 0.05,
      durationSeconds: 20,
    })

    expect(rows(mount(TrackList))).toEqual([['1', '01', '0:00:00.00', '0:00:20']])
  })

  it('keeps its rows when the minimum gap length changes, since that changes only the gaps', async () => {
    const split = useSplitStore()
    split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    split.addGapSplits()
    const wrapper = mount(TrackList)
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)

    split.setMinimumGapLength(3)

    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('tbody tr')).toHaveLength(5)
  })

  describe('leaving a track out', () => {
    it('has a button on each track row beside "Remove track", named for the track and what it does', () => {
      const { wrapper } = mountWithTwoGaps()

      for (const number of [1, 2, 3]) {
        expect(wrapper.find(`button[aria-label="Leave out track ${number}"]`).exists()).toBe(true)
      }
      expect(wrapper.findAll('button[aria-label^="Bring back"]')).toHaveLength(0)
      expect(
        trackRows(wrapper)[1]
          ?.findAll('button')
          .map((button) => button.attributes('aria-label')),
      ).toEqual(['Select track 2, starts at 0:00:21.00', 'Leave out track 2', 'Remove track 2'])
    })

    it('is there with one track too, where there is nothing to remove', () => {
      useSplitStore().open(new Float32Array(400).fill(-10), {
        windowSeconds: 0.05,
        durationSeconds: 20,
      })

      const wrapper = mount(TrackList)

      expect(wrapper.find('button[aria-label="Leave out track 1"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Remove track 1"]').exists()).toBe(false)
    })

    it('leaves the track out, reads "Bring back track N" then, and brings it back', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await wrapper.get('button[aria-label="Leave out track 2"]').trigger('click')

      expect(split.tracks[1]?.isLeftOut).toBe(true)
      expect(wrapper.find('button[aria-label="Leave out track 2"]').exists()).toBe(false)

      await wrapper.get('button[aria-label="Bring back track 2"]').trigger('click')

      expect(split.tracks[1]?.isLeftOut).toBe(false)
      expect(wrapper.find('button[aria-label="Leave out track 2"]').exists()).toBe(true)
    })

    it('changes no split and no name, and does only what it says, without selecting the row', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const before = split.selection

      await wrapper.get('button[aria-label="Leave out track 3"]').trigger('click')

      expect(split.splits).toHaveLength(2)
      expect(split.selection).toEqual(before)
    })

    it('mutes the left-out row, and shows its default name with no number', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.setTrackNamePrefix('set-')

      await wrapper.get('button[aria-label="Leave out track 2"]').trigger('click')

      expect(trackRows(wrapper)[1]?.classes()).toContain('text-muted')
      expect(trackRows(wrapper)[0]?.classes()).not.toContain('text-muted')
      expect(fieldValues(wrapper)).toEqual(['set-01', 'set-', 'set-02'])
      // The number column keeps the place in the file.
      expect(
        rows(wrapper)
          .map((row) => row[0])
          .filter(Boolean),
      ).toEqual(['1', '2', '3'])
    })

    it('keeps the screen reader’s labels at the track’s place in the file', async () => {
      const { wrapper } = mountWithTwoGaps()

      await wrapper.get('button[aria-label="Leave out track 1"]').trigger('click')

      expect(wrapper.find('input[aria-label="Name of track 2"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label^="Select track 3"]').exists()).toBe(true)
    })
  })

  it('scrolls inside a box as tall as the zoom view', () => {
    useSplitStore().open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    useSplitStore().addGapSplits()

    const wrapper = mount(TrackList)

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['h-40', 'overflow-y-auto']))
  })

  describe('split rows', () => {
    it('has no number button and no name field, and no length', () => {
      const { wrapper } = mountWithTwoGaps()

      for (const row of splitRows(wrapper)) {
        expect(row.find('input').exists()).toBe(false)
        expect(row.findAll('button[aria-label^="Select track"]')).toHaveLength(0)
        expect(row.findAll('td')[3]?.text()).toBe('')
      }
    })

    it('offers a trash button on every split row, naming the split’s time', () => {
      const { wrapper } = mountWithTwoGaps()

      const labels = splitRows(wrapper).map((row) =>
        row.findAll('button').map((button) => button.attributes('aria-label')),
      )

      expect(labels).toEqual([['Delete split at 0:00:21.00'], ['Delete split at 0:01:11.50']])
    })

    it('has no button that deletes a split on a track row', () => {
      const { wrapper } = mountWithTwoGaps()

      for (const row of trackRows(wrapper)) {
        expect(row.findAll('button[aria-label^="Delete"]')).toHaveLength(0)
      }
    })

    it('deletes its split, which merges the tracks either side of it', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await wrapper.get('button[aria-label="Delete split at 0:01:11.50"]').trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([21])
      expect(trackRows(wrapper)).toHaveLength(2)
      expect(splitRows(wrapper)).toHaveLength(1)
    })

    it('does not select the row the button was clicked in', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.selectTrack(split.tracks[0]!)

      await wrapper.get('button[aria-label="Delete split at 0:01:11.50"]').trigger('click')

      expect(split.selectedTrack?.number).toBe(1)
      expect(split.selectedSplit).toBeNull()
    })

    it('selects its split when the row is clicked, with the zoom view shown on it', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.selectTrack(split.tracks[1]!)

      await splitRows(wrapper)[1]?.trigger('click')

      expect(split.selectedSplit).toBe(split.splits[1])
      expect(split.selectedTrack).toBeNull()
      expect(split.view).toBe('split')
      expect(split.zoomCentreSeconds).toBe(71.5)
    })

    it('numbers the splits from 1 in time order, and renumbers when one goes', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      split.deleteSplit(split.splits[0]!.id)
      await wrapper.vm.$nextTick()

      expect(splitRows(wrapper).map((row) => row.findAll('td')[1]?.text())).toEqual(['Split 1'])
      expect(splitRows(wrapper)[0]?.findAll('td')[2]?.text()).toBe('0:01:11.50')
    })
  })

  describe('removing a track', () => {
    it('offers a merge button on every track row, named after the track', () => {
      const { wrapper } = mountWithTwoGaps()

      const labels = trackRows(wrapper).map((row) =>
        row
          .findAll('button[aria-label^="Remove"]')
          .map((button) => button.attributes('aria-label')),
      )

      expect(labels).toEqual([['Remove track 1'], ['Remove track 2'], ['Remove track 3']])
    })

    it('offers no merge button on a split row', () => {
      const { wrapper } = mountWithTwoGaps()

      for (const row of splitRows(wrapper)) {
        expect(row.findAll('button[aria-label^="Remove"]')).toHaveLength(0)
      }
    })

    it('offers none when there is only one track', () => {
      useSplitStore().open(new Float32Array(400).fill(-10), {
        windowSeconds: 0.05,
        durationSeconds: 20,
      })

      const wrapper = mount(TrackList)

      expect(wrapper.findAll('button[aria-label^="Remove"]')).toHaveLength(0)
    })

    it('goes when the last tracks are merged into one', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await removeButton(wrapper, 2).trigger('click')

      expect(split.tracks).toHaveLength(1)
      expect(wrapper.findAll('button[aria-label^="Remove"]')).toHaveLength(0)
    })

    it('removes the track, which merges it with its neighbours, in the middle', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await removeButton(wrapper, 2).trigger('click')

      expect(split.splits).toHaveLength(0)
      expect(rows(wrapper)).toEqual([['1', '01', '0:00:00.00', '0:01:40']])
    })

    it('merges the first track into the next', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await removeButton(wrapper, 1).trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
    })

    it('merges the last track into the previous one', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await removeButton(wrapper, 3).trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([21])
    })

    it('does not select the row it was clicked in', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.selectTrack(split.tracks[0]!)

      await removeButton(wrapper, 3).trigger('click')

      expect(split.selectedTrack?.number).toBe(1)
    })

    it('leaves a split selected as it was, if it was not deleted', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const kept = split.splits[1]

      split.selectSplit(kept!.id)
      await removeButton(wrapper, 1).trigger('click')

      expect(split.selectedSplit).toBe(kept)
    })

    it('has an icon unlike the trash of a split row', () => {
      const { wrapper } = mountWithTwoGaps()

      const merge = removeButton(wrapper, 2).get('svg').classes()
      const trash = wrapper.get('button[aria-label^="Delete split"] svg').classes()

      expect(merge.join(' ')).toMatch(/merge/)
      expect(trash.join(' ')).toMatch(/trash/)
      expect(merge).not.toEqual(trash)
    })
  })

  describe('renaming a track', () => {
    it('holds a name field in every row, the track 1 row included, capped at 100 characters', () => {
      const { wrapper } = mountWithTwoGaps()

      for (const number of [1, 2, 3]) {
        expect(nameField(wrapper, number).attributes('maxlength')).toBe('100')
      }
    })

    it('shows a track its own name once it has one', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      split.renameTrack(split.splits[1]?.id ?? null, 'Outro')
      await wrapper.vm.$nextTick()

      expect(nameField(wrapper, 3).element.value).toBe('Outro')
      expect(nameField(wrapper, 2).element.value).toBe('02')
    })

    it('saves the name on Enter', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const field = nameField(wrapper, 3)

      await field.trigger('focus')
      await field.setValue('Intro')
      await field.trigger('keydown', { key: 'Enter' })

      expect(split.tracks[2]?.name).toBe('Intro')
      expect(split.editCount).toBe(1)
    })

    it('saves the name when the field loses focus', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const field = nameField(wrapper, 2)

      await field.trigger('focus')
      await field.setValue('Sunrise')
      await field.trigger('blur')

      expect(split.tracks[1]?.name).toBe('Sunrise')
    })

    it('names the first track, which starts with the file', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const field = nameField(wrapper, 1)

      await field.trigger('focus')
      await field.setValue('Opener')
      await field.trigger('blur')

      expect(split.tracks[0]?.name).toBe('Opener')
    })

    it('puts the old name back on Escape and saves nothing', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const field = nameField(wrapper, 3)

      await field.trigger('focus')
      await field.setValue('Intro')
      await field.trigger('keydown', { key: 'Escape' })
      await field.trigger('blur')

      expect(field.element.value).toBe('03')
      expect(split.tracks[2]?.name).toBe('03')
      expect(split.hasEdits).toBe(false)
    })

    it('falls back to the number when the name is emptied', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.renameTrack(split.splits[1]?.id ?? null, 'Outro')
      await wrapper.vm.$nextTick()
      const field = nameField(wrapper, 3)

      await field.trigger('focus')
      await field.setValue(' '.repeat(3))
      await field.trigger('keydown', { key: 'Enter' })
      await wrapper.vm.$nextTick()

      expect(split.tracks[2]?.name).toBe('03')
      expect(field.element.value).toBe('03')
    })

    it('shows the trimmed name after saving', async () => {
      const { wrapper } = mountWithTwoGaps()
      const field = nameField(wrapper, 3)

      await field.trigger('focus')
      await field.setValue('  Intro ')
      await field.trigger('keydown', { key: 'Enter' })
      await wrapper.vm.$nextTick()

      expect(field.element.value).toBe('Intro')
    })

    it('counts no edit when the field is left as it was found', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const field = nameField(wrapper, 3)

      await field.trigger('focus')
      await field.trigger('blur')

      expect(split.tracks[2]?.name).toBe('03')
      expect(split.hasEdits).toBe(false)
    })

    it('selects the track when its field is focused', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await nameField(wrapper, 3).trigger('focus')

      expect(split.selectedTrack?.number).toBe(3)
    })

    it('selects the first track when its field is focused', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await nameField(wrapper, 1).trigger('focus')

      expect(split.selectedTrack?.number).toBe(1)
    })
  })

  describe('the track name prefix', () => {
    it('shows each unnamed track as the prefix and its number, following the prefix at once', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      split.setTrackNamePrefix('dreamscape-')
      await wrapper.vm.$nextTick()
      expect(fieldValues(wrapper)).toEqual(['dreamscape-01', 'dreamscape-02', 'dreamscape-03'])

      split.setTrackNamePrefix('')
      await wrapper.vm.$nextTick()
      expect(fieldValues(wrapper)).toEqual(['01', '02', '03'])
    })

    it('leaves a renamed track’s name alone when the prefix changes', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.renameTrack(split.splits[0]!.id, 'Intro')

      split.setTrackNamePrefix('set-')
      await wrapper.vm.$nextTick()

      expect(fieldValues(wrapper)).toEqual(['set-01', 'Intro', 'set-03'])
    })

    it('mutes the names of unnamed tracks and not the names the user typed', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.renameTrack(split.splits[0]!.id, 'Intro')
      await wrapper.vm.$nextTick()

      expect(nameField(wrapper, 1).classes()).toContain('text-muted')
      expect(nameField(wrapper, 2).classes()).toContain('text-ink')
      expect(nameField(wrapper, 2).classes()).not.toContain('text-muted')
    })

    it('shows the name in full strength while it is being edited', async () => {
      const { wrapper } = mountWithTwoGaps()
      const field = nameField(wrapper, 1)

      await field.trigger('focus')

      expect(field.classes()).toContain('text-ink')
      expect(field.classes()).not.toContain('text-muted')
    })

    it('starts editing an unnamed track from its prefixed name, and saving it unchanged is no rename', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.setTrackNamePrefix('set-')
      await wrapper.vm.$nextTick()
      const field = nameField(wrapper, 2)

      await field.trigger('focus')
      expect(field.element.value).toBe('set-02')
      await field.trigger('keydown', { key: 'Enter' })

      expect(split.tracks[1]?.ownName).toBeNull()
      expect(split.hasEdits).toBe(false)
    })

    it('names the track after an edit of its prefixed name, and a later prefix change leaves it', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.setTrackNamePrefix('set-')
      await wrapper.vm.$nextTick()
      const field = nameField(wrapper, 2)

      await field.trigger('focus')
      await field.setValue('set-02 live')
      await field.trigger('keydown', { key: 'Enter' })
      split.setTrackNamePrefix('other-')
      await wrapper.vm.$nextTick()

      expect(split.tracks[1]?.ownName).toBe('set-02 live')
      expect(fieldValues(wrapper)).toEqual(['other-01', 'set-02 live', 'other-03'])
    })

    it('falls back to the prefixed name when a name is cleared', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.setTrackNamePrefix('set-')
      split.renameTrack(split.splits[1]!.id, 'Outro')
      await wrapper.vm.$nextTick()
      const field = nameField(wrapper, 3)

      await field.trigger('focus')
      await field.setValue('')
      await field.trigger('keydown', { key: 'Enter' })
      await wrapper.vm.$nextTick()

      expect(split.tracks[2]?.ownName).toBeNull()
      expect(field.element.value).toBe('set-03')
    })
  })

  describe('selecting a track', () => {
    it('selects the track when its row is clicked', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await trackRows(wrapper)[2]?.trigger('click')

      expect(split.selectedTrack?.number).toBe(3)
      expect(split.selectedSplit).toBeNull()
    })

    it('selects the first track when its row is clicked', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      await trackRows(wrapper)[0]?.trigger('click')

      expect(split.selectedTrack?.number).toBe(1)
    })

    it('can be selected from the keyboard through a button in the number cell, the first row too', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      const button = trackRows(wrapper)[2]?.get('button')
      await button?.trigger('click')

      expect(button?.attributes('aria-label')).toBe('Select track 3, starts at 0:01:11.50')
      expect(split.selectedTrack?.number).toBe(3)

      const first = trackRows(wrapper)[0]?.get('button')
      await first?.trigger('click')

      expect(first?.attributes('aria-label')).toBe('Select track 1, starts at 0:00:00.00')
      expect(split.selectedTrack?.number).toBe(1)
    })
  })

  describe('the marked row', () => {
    it('is the row of the selected track, in the selected-row style', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const all = wrapper.findAll('tbody tr')

      // Detection selects track 1, so its row is the marked one.
      expect(marked(wrapper)).toEqual(['true', undefined, undefined, undefined, undefined])

      await trackRows(wrapper)[1]?.trigger('click')

      expect(marked(wrapper)).toEqual([undefined, undefined, 'true', undefined, undefined])
      expect(all[2]?.classes()).toEqual(expect.arrayContaining(['bg-land/50', 'font-semibold']))
      expect(all[0]?.classes()).not.toContain('bg-land/50')

      split.selectTrack(split.tracks[0]!)
      await wrapper.vm.$nextTick()

      expect(marked(wrapper)).toEqual(['true', undefined, undefined, undefined, undefined])
    })

    it('is the row of the selected split, in the same style, and only that one', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.selectTrack(split.tracks[1]!)
      await wrapper.vm.$nextTick()

      split.selectSplit(split.splits[1]!.id)
      await wrapper.vm.$nextTick()

      expect(marked(wrapper)).toEqual([undefined, undefined, undefined, 'true', undefined])
      expect(wrapper.findAll('tbody tr')[3]?.classes()).toEqual(
        expect.arrayContaining(['bg-land/50', 'font-semibold']),
      )
    })

    it('lights the selected split row with its number in a rust chip, and no other row', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      const rows = () => wrapper.findAll('tbody tr')
      expect(wrapper.findAll('tbody .bg-split')).toHaveLength(0)

      split.selectSplit(split.splits[1]!.id)
      await wrapper.vm.$nextTick()

      const chips = wrapper.findAll('tbody .bg-split')
      expect(chips).toHaveLength(1)
      expect(chips[0]?.text()).toBe('2')
      expect(rows()[3]?.find('.bg-split').exists()).toBe(true)
    })

    it('is no row when nothing is selected', async () => {
      const { split, wrapper } = mountWithTwoGaps()

      split.moveZoomTo(50)
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('tbody tr[aria-current]')).toHaveLength(0)
    })

    it('is kept in view when a track is selected', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      scrollIntoView.mockClear()

      split.selectTrack(split.tracks[2]!)
      await wrapper.vm.$nextTick()

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(wrapper.findAll('tbody tr')[4]?.element)
    })

    it('is kept in view when a split is selected', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      scrollIntoView.mockClear()

      split.selectSplit(split.splits[1]!.id)
      await wrapper.vm.$nextTick()

      expect(scrollIntoView.mock.contexts.at(-1)).toBe(wrapper.findAll('tbody tr')[3]?.element)
    })

    it('is kept in view when the selected track changes in place', async () => {
      const { split, wrapper } = mountWithTwoGaps()
      split.selectTrack(split.tracks[1]!)
      await wrapper.vm.$nextTick()
      scrollIntoView.mockClear()

      split.selectTrack(split.tracks[0]!)
      await wrapper.vm.$nextTick()

      expect(scrollIntoView.mock.contexts.at(-1)).toBe(wrapper.findAll('tbody tr')[0]?.element)
    })
  })

  describe('tooltips', () => {
    it('says "Remove track N" on the merge button', async () => {
      const { wrapper } = mountWithTwoGaps()

      expect(await tooltipOf(removeButton(wrapper, 2))).toBe('Remove track 2')
    })

    it('says "Delete split at …" on the trash button', async () => {
      const { wrapper } = mountWithTwoGaps()

      const trash = wrapper.get('button[aria-label="Delete split at 0:01:11.50"]')

      expect(await tooltipOf(trash)).toBe('Delete split at 0:01:11.50')
    })
  })
})
