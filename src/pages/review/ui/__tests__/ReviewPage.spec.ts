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

// The page with the track of that number selected, as a click on its row's number button does.
async function mountPageWithTrack(number: number) {
  const wrapper = mountPage()
  await wrapper.get(`[aria-label^="Select track ${number}"]`).trigger('click')
  return wrapper
}

async function mountPageWithRange() {
  const wrapper = mountPage()
  useSplitStore().setRange(10, 20)
  await wrapper.vm.$nextTick()
  return wrapper
}

// A title-row icon button has no text: its accessible name is its label. The other buttons are
// named by their words.
function nameOf(button: { attributes: (name: string) => string | undefined; text: () => string }) {
  return button.attributes('aria-label') ?? button.text()
}

// What the tooltip says once the button takes the keyboard.
async function tooltipOf(button: { trigger: (event: string) => Promise<void> }) {
  await button.trigger('focus')
  const text = document.querySelector('[role="tooltip"]')?.textContent
  await button.trigger('blur')
  return text
}

// The buttons of the zoom panel's title row: those with a label and no text.
function iconButtons(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button[aria-label]').filter((button) => button.text() === '')
}

function addSplitButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((candidate) => nameOf(candidate) === 'Add split')
  if (!button) throw new Error('no Add split button')
  return button
}

function deleteSplitButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((candidate) => nameOf(candidate) === 'Delete split')
  if (!button) throw new Error('no Delete split button')
  return button
}

// The primary button of the zoom panel's title row; its name is "Play across split" or "Stop".
function auditionButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => ['Play across split', 'Stop'].includes(nameOf(candidate)))
  if (!button) throw new Error('no audition button')
  return button
}

// The primary button of the Range view's title row: "Play", "Pause" or "Stop".
function rangeButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => ['Play', 'Pause', 'Stop'].includes(nameOf(candidate)))
  if (!button) throw new Error('no range button')
  return button
}

// The icon button left of the range button.
function backButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('button[aria-label="Back to range start"]')
}

function exportButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === 'Export to folder…')
  if (!button) throw new Error('no Export button')
  return button
}

function viewOption(wrapper: ReturnType<typeof mount>, name: 'Split' | 'Track' | 'Range') {
  const option = wrapper
    .get('[role="radiogroup"][aria-label="Panel view"]')
    .findAll('[role="radio"]')
    .find((candidate) => candidate.text() === name)
  if (!option) throw new Error(`no ${name} option`)
  return option
}

// The panel's title: the zoom view's time, the track's name and ends, or the range's.
const panelTitle = (wrapper: ReturnType<typeof mount>) => wrapper.get('h2.text-lg').text()

describe('ReviewPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('the title row’s icon buttons', () => {
    it('are Add split, Delete split and Play across split in the Split view, named and told by their keys', async () => {
      const wrapper = mountPage()
      const names = iconButtons(wrapper)
        .map((button) => nameOf(button))
        .filter((name) => ['Add split', 'Delete split', 'Play across split'].includes(name))

      expect(names).toEqual(['Add split', 'Delete split', 'Play across split'])
      expect(await tooltipOf(deleteSplitButton(wrapper))).toBe('Delete split (Delete)')
      expect(await tooltipOf(auditionButton(wrapper))).toBe('Play across split (Space)')

      // A disabled button takes no focus, so the window moves off the split to enable Add split.
      useSplitStore().moveZoomTo(46)
      await wrapper.vm.$nextTick()
      expect(await tooltipOf(addSplitButton(wrapper))).toBe('Add split')
    })

    it('keep today’s enabled states in the Split view', async () => {
      const wrapper = mountPage()
      // Split 1 is selected with the window on it: nothing to add, everything else is there.
      expect(addSplitButton(wrapper).attributes('disabled')).toBeDefined()
      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeUndefined()
      expect(auditionButton(wrapper).attributes('disabled')).toBeUndefined()

      useSplitStore().moveZoomTo(46)
      await wrapper.vm.$nextTick()

      expect(addSplitButton(wrapper).attributes('disabled')).toBeUndefined()
      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeDefined()
      expect(auditionButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('say Stop (Space) in the Split view while a clip plays', async () => {
      const wrapper = mountPage()
      useAuditionStore().status = 'playing'
      await wrapper.vm.$nextTick()

      expect(await tooltipOf(auditionButton(wrapper))).toBe('Stop (Space)')
    })

    it('are Back to track start and Play in the Track view, with no Add split', async () => {
      const wrapper = await mountPageWithTrack(2)

      expect(wrapper.find('button[aria-label="Add split"]').exists()).toBe(false)
      expect(await tooltipOf(wrapper.get('button[aria-label="Back to track start"]'))).toBe(
        'Back to track start (Home)',
      )
      expect(await tooltipOf(rangeButton(wrapper))).toBe('Play (Space)')
    })

    it('are Add split, Back to range start and Play in the Range view, with their keys', async () => {
      const wrapper = await mountPageWithRange()
      useSplitStore().placeMark(15)
      await wrapper.vm.$nextTick()

      expect(await tooltipOf(addSplitButton(wrapper))).toBe('Add split (Enter)')
      expect(await tooltipOf(backButton(wrapper))).toBe('Back to range start (Home)')
      expect(await tooltipOf(rangeButton(wrapper))).toBe('Play (Space)')
      expect(addSplitButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('have a Play whose name and tooltip follow its state in the Track view and the Range view', async () => {
      const wrapper = await mountPageWithRange()
      const audition = useAuditionStore()

      for (const [status, label] of [
        ['loading', 'Stop'],
        ['playing', 'Pause'],
        ['paused', 'Play'],
        ['idle', 'Play'],
      ] as const) {
        audition.stretchStatus = status
        await wrapper.vm.$nextTick()
        expect(nameOf(rangeButton(wrapper))).toBe(label)
        expect(await tooltipOf(rangeButton(wrapper))).toBe(`${label} (Space)`)
      }
    })

    it('leave the view control and Export to folder with their words', () => {
      const wrapper = mountPage()

      expect(viewOption(wrapper, 'Split').text()).toBe('Split')
      expect(exportButton(wrapper).text()).toBe('Export to folder…')
    })
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

  describe('Delete split', () => {
    it('is enabled while a split is selected, and disabled with none', async () => {
      const wrapper = mountPage()

      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeUndefined()

      useSplitStore().moveZoomTo(46)
      await wrapper.vm.$nextTick()

      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('deletes the selected split, which merges the tracks either side, and selects its neighbour', async () => {
      const wrapper = mountPage()
      const split = useSplitStore()

      await deleteSplitButton(wrapper).trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
      expect(split.tracks).toHaveLength(2)
      expect(split.selectedSplit?.seconds).toBe(71.5)
    })

    it('counts as an edit, as the Delete key does', async () => {
      const wrapper = mountPage()
      const split = useSplitStore()

      await deleteSplitButton(wrapper).trigger('click')

      expect(split.editCount).toBe(1)
    })

    it('hands the keyboard to the split that is selected next, so it can be nudged at once', async () => {
      const wrapper = mountPage()

      await deleteSplitButton(wrapper).trigger('click')
      await wrapper.vm.$nextTick()

      expect(document.activeElement).toBe(
        wrapper.get('[role="slider"][aria-label="Split 1"]').element,
      )
    })

    it('is disabled once the last split is deleted', async () => {
      const wrapper = mountPage()

      await deleteSplitButton(wrapper).trigger('click')
      await deleteSplitButton(wrapper).trigger('click')

      expect(useSplitStore().splits).toHaveLength(0)
      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('sits between "Add split" and "Play across split"', () => {
      const wrapper = mountPage()

      const labels = wrapper.findAll('button').map((button) => nameOf(button))

      expect(labels.indexOf('Add split')).toBeLessThan(labels.indexOf('Delete split'))
      expect(labels.indexOf('Delete split')).toBeLessThan(labels.indexOf('Play across split'))
    })

    it('is not in the Track view or the Range view', async () => {
      const wrapper = await mountPageWithTrack(2)
      const texts = () => wrapper.findAll('button').map((button) => nameOf(button))
      expect(texts()).not.toContain('Delete split')

      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      expect(texts()).not.toContain('Delete split')
    })
  })

  describe('Add split in the Range view', () => {
    it('is disabled while there is no mark, and enabled once there is room at the mark', async () => {
      const wrapper = await mountPageWithRange()
      const split = useSplitStore()
      expect(addSplitButton(wrapper).attributes('disabled')).toBeDefined()

      split.placeMark(15)
      await wrapper.vm.$nextTick()

      expect(addSplitButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('is disabled within a second of a split, whatever the zoom window says', async () => {
      const wrapper = await mountPageWithRange()
      const split = useSplitStore()
      split.setRange(15, 30)

      // The split at 21 s is 0.5 s away. Split 1 is selected, so the window's centre is on it too:
      // it is the mark's own rule that disables the button.
      split.placeMark(20.5)
      await wrapper.vm.$nextTick()

      expect(split.canAddSplitAtMark).toBe(false)
      expect(addSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('adds a split at the mark, and stays in the Range view with the mark and nothing selected', async () => {
      const wrapper = await mountPageWithRange()
      const split = useSplitStore()
      split.placeMark(15)
      const selectedId = split.selectedSplit?.id
      await wrapper.vm.$nextTick()

      await addSplitButton(wrapper).trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([15, 21, 71.5])
      expect(split.view).toBe('range')
      expect(split.selectedSplit?.id).toBe(selectedId)
      expect(split.markSeconds).toBe(15)
      expect(split.editCount).toBe(1)
      expect(wrapper.find('[aria-label="Waveform of the range"]').exists()).toBe(true)
      // A split within a second of the mark now, so it cannot be added twice.
      expect(addSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('comes before the "Back to range start" and range buttons', async () => {
      const wrapper = await mountPageWithRange()

      const labels = wrapper.findAll('button').map((button) => nameOf(button))

      expect(labels.indexOf('Add split')).toBeLessThan(labels.indexOf('Back to range start'))
      expect(labels.indexOf('Back to range start')).toBeLessThan(labels.indexOf('Play'))
    })
  })

  describe('the audition button', () => {
    it('reads "Play across split" and is enabled while a split is selected', () => {
      const wrapper = mountPage()

      const button = auditionButton(wrapper)

      expect(nameOf(button)).toBe('Play across split')
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
      expect(nameOf(loading)).toBe('Stop')
      expect(loading.get('svg').classes()).not.toEqual(playIcon)
      expect(loading.attributes('disabled')).toBeUndefined()

      audition.status = 'playing'
      await wrapper.vm.$nextTick()
      expect(nameOf(auditionButton(wrapper))).toBe('Stop')

      audition.status = 'idle'
      await wrapper.vm.$nextTick()
      expect(nameOf(auditionButton(wrapper))).toBe('Play across split')
    })

    it('stops the audition when the page goes away', () => {
      const wrapper = mountPage()
      const stop = vi.spyOn(useAuditionStore(), 'stop')

      wrapper.unmount()

      expect(stop).toHaveBeenCalled()
    })
  })

  describe('the Split | Track | Range control', () => {
    it('starts on Split, with Track and Range disabled while there is nothing to show', () => {
      const wrapper = mountPage()

      expect(viewOption(wrapper, 'Split').attributes('aria-checked')).toBe('true')
      expect(viewOption(wrapper, 'Track').attributes('disabled')).toBeDefined()
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

    it('leaves the audition button out of the Range view', async () => {
      const wrapper = mountPage()

      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      const labels = wrapper.findAll('button').map((button) => nameOf(button))
      expect(labels).toContain('Add split')
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

    it('goes back to Split when a split is selected', async () => {
      const wrapper = mountPage()
      const split = useSplitStore()
      split.setRange(10, 20)
      await wrapper.vm.$nextTick()

      split.selectSplit(split.splits[1]!.id)
      await wrapper.vm.$nextTick()

      expect(viewOption(wrapper, 'Split').attributes('aria-checked')).toBe('true')
      expect(panelTitle(wrapper)).toBe('0:01:11.50')
    })

    describe('the Track view', () => {
      it('swaps in the Track view, titled by the track, when a track is selected', async () => {
        const wrapper = await mountPageWithTrack(3)

        expect(viewOption(wrapper, 'Track').attributes('aria-checked')).toBe('true')
        expect(viewOption(wrapper, 'Track').attributes('disabled')).toBeUndefined()
        expect(wrapper.find('[aria-label="Waveform of the track"]').exists()).toBe(true)
        expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(false)
        expect(panelTitle(wrapper)).toBe('3 · 0:01:11.50 – 0:01:40.00')
      })

      it('shows the first track too', async () => {
        const wrapper = await mountPageWithTrack(1)

        expect(wrapper.find('[aria-label="Waveform of the track"]').exists()).toBe(true)
        expect(panelTitle(wrapper)).toBe('1 · 0:00:00.00 – 0:00:21.00')
      })

      it('has no "Add split" and no "Play across split" in its title row', async () => {
        const wrapper = await mountPageWithTrack(2)

        const labels = wrapper.findAll('button').map((button) => nameOf(button))
        expect(labels).not.toContain('Add split')
        expect(labels).not.toContain('Play across split')
      })

      it('has "Back to track start" and Play, and no "Back to range start"', async () => {
        const wrapper = await mountPageWithTrack(2)
        const labels = wrapper.findAll('button').map((button) => nameOf(button))

        expect(labels.indexOf('Back to track start')).toBe(labels.indexOf('Play') - 1)
        expect(labels).not.toContain('Back to range start')
        expect(wrapper.get('button[aria-label="Back to track start"]').text()).toBe('')
      })

      it('shows the zoom window where it was, with no split selected, on Split', async () => {
        const wrapper = mountPage()
        const split = useSplitStore()
        split.moveZoomTo(50)
        await wrapper.get('[aria-label^="Select track 3"]').trigger('click')

        await viewOption(wrapper, 'Split').trigger('click')

        expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(true)
        expect(panelTitle(wrapper)).toBe('No split selected')
        expect(split.zoomCentreSeconds).toBe(50)
        expect(split.selectedSplit).toBeNull()
        expect(viewOption(wrapper, 'Track').attributes('disabled')).toBeUndefined()
      })

      it('switches back to the Track view with the control, keeping the track', async () => {
        const wrapper = await mountPageWithTrack(2)
        await viewOption(wrapper, 'Split').trigger('click')

        await viewOption(wrapper, 'Track').trigger('click')

        expect(wrapper.find('[aria-label="Waveform of the track"]').exists()).toBe(true)
        expect(panelTitle(wrapper)).toBe('2 · 0:00:21.00 – 0:01:11.50')
      })

      it('goes back to Split, with Track disabled, when a setting change clears the track', async () => {
        const wrapper = await mountPageWithTrack(2)

        useSplitStore().setMinimumGapLength(2.5)
        await wrapper.vm.$nextTick()

        expect(viewOption(wrapper, 'Split').attributes('aria-checked')).toBe('true')
        expect(viewOption(wrapper, 'Track').attributes('disabled')).toBeDefined()
      })

      it('plays the track as a stretch when Play is clicked', async () => {
        const wrapper = await mountPageWithTrack(2)
        const toggleStretch = vi
          .spyOn(useAuditionStore(), 'toggleStretch')
          .mockImplementation(() => {})

        await rangeButton(wrapper).trigger('click')

        expect(toggleStretch).toHaveBeenCalledExactlyOnceWith({
          startSeconds: 21,
          endSeconds: 71.5,
        })
      })

      it('moves the playhead to the track’s start when "Back to track start" is clicked', async () => {
        const wrapper = await mountPageWithTrack(2)
        const backToStretchStart = vi
          .spyOn(useAuditionStore(), 'backToStretchStart')
          .mockImplementation(() => {})

        await wrapper.get('button[aria-label="Back to track start"]').trigger('click')

        expect(backToStretchStart).toHaveBeenCalledExactlyOnceWith({
          startSeconds: 21,
          endSeconds: 71.5,
        })
      })

      it('reads "Stop" while the track is decoded, "Pause" while it plays and "Play" when paused, enabled throughout', async () => {
        const wrapper = await mountPageWithTrack(2)
        const audition = useAuditionStore()
        const back = () => wrapper.get('button[aria-label="Back to track start"]')

        expect(nameOf(rangeButton(wrapper))).toBe('Play')
        for (const [status, label] of [
          ['loading', 'Stop'],
          ['playing', 'Pause'],
          ['paused', 'Play'],
        ] as const) {
          audition.stretchStatus = status
          await wrapper.vm.$nextTick()
          expect(nameOf(rangeButton(wrapper))).toBe(label)
          expect(rangeButton(wrapper).attributes('disabled')).toBeUndefined()
          expect(back().attributes('disabled')).toBeUndefined()
        }
      })

      it('stops the sound when the view changes to Split', async () => {
        const wrapper = await mountPageWithTrack(2)
        const stop = vi.spyOn(useAuditionStore(), 'stop')

        await viewOption(wrapper, 'Split').trigger('click')

        expect(stop).toHaveBeenCalled()
      })

      it('swaps to the Range view and back to the Track view through the control', async () => {
        const wrapper = await mountPageWithTrack(2)
        const split = useSplitStore()
        split.setRange(10, 20)
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[aria-label="Waveform of the range"]').exists()).toBe(true)

        await viewOption(wrapper, 'Track').trigger('click')

        expect(split.view).toBe('track')
        expect(wrapper.find('[aria-label="Waveform of the track"]').exists()).toBe(true)
      })

      it('stops the audition when the view changes to the Track view', async () => {
        const wrapper = mountPage()
        const stop = vi.spyOn(useAuditionStore(), 'stop')

        await wrapper.get('[aria-label^="Select track 3"]').trigger('click')

        expect(stop).toHaveBeenCalled()
      })
    })

    it('stops the audition when the view changes', async () => {
      const wrapper = mountPage()
      const stop = vi.spyOn(useAuditionStore(), 'stop')

      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      expect(stop).toHaveBeenCalled()
    })
  })

  describe('the "Back to range start" button', () => {
    it('is an icon button just left of the range button, enabled whatever the player is doing', async () => {
      const wrapper = await mountPageWithRange()
      const audition = useAuditionStore()
      const labels = wrapper.findAll('button').map((button) => nameOf(button))

      expect(labels.indexOf('Back to range start')).toBe(labels.indexOf('Play') - 1)
      expect(backButton(wrapper).text()).toBe('')

      for (const status of ['loading', 'playing', 'paused'] as const) {
        audition.stretchStatus = status
        await wrapper.vm.$nextTick()
        expect(backButton(wrapper).attributes('disabled')).toBeUndefined()
      }
    })

    it('is not there in the Split view', () => {
      const wrapper = mountPage()

      expect(wrapper.find('button[aria-label="Back to range start"]').exists()).toBe(false)
    })

    it('moves the playhead to the range’s start when clicked', async () => {
      const wrapper = await mountPageWithRange()
      const backToRangeStart = vi
        .spyOn(useAuditionStore(), 'backToStretchStart')
        .mockImplementation(() => {})

      await backButton(wrapper).trigger('click')

      expect(backToRangeStart).toHaveBeenCalledTimes(1)
    })
  })

  describe('the range button', () => {
    it('reads "Play" and is enabled while the range is idle', async () => {
      const wrapper = await mountPageWithRange()

      expect(nameOf(rangeButton(wrapper))).toBe('Play')
      expect(rangeButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('is not there in the Split view, where the audition button is', () => {
      const wrapper = mountPage()

      expect(wrapper.findAll('button').map((button) => nameOf(button))).not.toContain('Play')
    })

    it('calls the player when clicked', async () => {
      const wrapper = await mountPageWithRange()
      const toggleRange = vi.spyOn(useAuditionStore(), 'toggleStretch').mockImplementation(() => {})

      await rangeButton(wrapper).trigger('click')

      expect(toggleRange).toHaveBeenCalledTimes(1)
    })

    it('reads "Stop" while the range is decoded, "Pause" while it plays and "Play" when paused', async () => {
      const wrapper = await mountPageWithRange()
      const audition = useAuditionStore()
      const playIcon = rangeButton(wrapper).get('svg').classes()

      audition.stretchStatus = 'loading'
      await wrapper.vm.$nextTick()
      expect(nameOf(rangeButton(wrapper))).toBe('Stop')
      expect(rangeButton(wrapper).attributes('disabled')).toBeUndefined()

      audition.stretchStatus = 'playing'
      await wrapper.vm.$nextTick()
      expect(nameOf(rangeButton(wrapper))).toBe('Pause')
      expect(rangeButton(wrapper).get('svg').classes()).not.toEqual(playIcon)

      audition.stretchStatus = 'paused'
      await wrapper.vm.$nextTick()
      expect(nameOf(rangeButton(wrapper))).toBe('Play')
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
