import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DOMWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useShortcutsDialogStore } from '@/widgets/shortcuts-dialog/model/shortcuts-dialog.ts'
import { trackExtent } from '@/widgets/split-zoom/lib/track-extent.ts'
import { useAuditionStore } from '@/widgets/split-zoom/model/audition.ts'
import { FakeFolder } from '@/widgets/track-strip/model/__tests__/fake-folder.ts'
import { useExportSingleStore } from '@/widgets/track-strip/model/export-single.ts'
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
  return mount(ReviewPage, { attachTo: document.body })
}

/*
The page on the Split view with split 1 selected, as a click on its row does: analysis opens on
track 1 in the Track view, and these specs are about the zoom view.
*/
async function mountPageOnSplit() {
  const wrapper = mountPage()
  const split = useSplitStore()
  split.selectSplit(split.splits[0]!.id)
  await wrapper.vm.$nextTick()
  return wrapper
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

const shortcutsDialog = () => document.querySelector('[role="dialog"]')
const firstSection = () => shortcutsDialog()?.querySelector('h3')?.textContent

function pressQuestionMark(target: Element | Document = document) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true, cancelable: true }))
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

// The primary button of the Split view's title row: "Play across split", "Pause" or "Stop".
function auditionButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => ['Play across split', 'Pause', 'Stop'].includes(nameOf(candidate)))
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
const panelTitle = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('h2.text-lg, h2.text-display').text()

// The single export's name dialog renders into document.body, outside the wrapper.
const dialog = () => document.querySelector('[role="dialog"]')
const nameField = () => dialog()?.querySelector('input') as HTMLInputElement
const savedLine = (wrapper: ReturnType<typeof mount>) => wrapper.find('[role="status"]')

function exportButtonOf(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.get(`button[aria-label="${label}"]`)
}

async function typeName(text: string) {
  nameField().value = text
  nameField().dispatchEvent(new Event('input'))
  await flushPromises()
}

async function pressEnterInField() {
  nameField().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
}

// The buttons of the zoom panel's title row, in order.
function titleRowButtons(wrapper: ReturnType<typeof mount>) {
  const row = new DOMWrapper(wrapper.get('h2.text-lg, h2.text-display').element.parentElement!)
  return row.findAll('button[aria-label]').map((button) => button.attributes('aria-label'))
}

// Track 2 exported under its default name: the saved line is on show.
async function exportTrack2() {
  const wrapper = await mountPageWithTrack(2)
  await exportButtonOf(wrapper, 'Export track…').trigger('click')
  await flushPromises()
  await pressEnterInField()
  expect(savedLine(wrapper).exists()).toBe(true)
  return wrapper
}

// Track 2 runs 21 s to 71.5 s; its mark is at 40 s once placed.
async function mountWithMark(seconds = 40) {
  const wrapper = await mountPageWithTrack(2)
  useSplitStore().placeTrackMark(seconds)
  await wrapper.vm.$nextTick()
  return wrapper
}

const addPendingButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('button[aria-label="Add pending split"]')
const applyButton = (wrapper: ReturnType<typeof mount>) => wrapper.get('button[aria-label="Apply"]')
const deletePendingButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('button[aria-label="Delete pending split"]')
const playheadInRange = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('[role="slider"][aria-label="Playhead in the range"]').element

// The volume's mute button, whichever way it reads, and its slider once Reka has placed the thumb.
const muteButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('button[aria-label="Mute"], button[aria-label="Unmute"]')
async function volumeSlider(wrapper: ReturnType<typeof mount>) {
  await flushPromises()
  return wrapper.get('[role="slider"][aria-label="Volume"]')
}

// Track 2 (21 s to 71.5 s) has pending splits at 30 s and 50 s; track 3 is 71.5 s to 100 s.
async function mountWithPending() {
  const wrapper = await mountWithMark()
  const split = useSplitStore()
  split.addPendingSplit(30, false)
  split.addPendingSplit(50, false)
  await wrapper.vm.$nextTick()
  return { split, wrapper }
}

// A key as the user presses it: on the focused element, or on the page when nothing has the focus.
function pressKey(
  key: string,
  init: KeyboardEventInit = {},
  target: Element | Document = document,
) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

/*
A mouse click as a browser does it: the press moves the focus to the control unless the press is
prevented (jsdom moves nothing by itself), then the click.
*/
async function mouseClick(element: Element) {
  const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  element.dispatchEvent(press)
  if (!press.defaultPrevented && element instanceof HTMLElement) element.focus()
  await clickElement(element)
}

// A key pressed where the focus is: on the focused control, or on the page when nothing has it.
function pressWhereFocused(key: string) {
  const focused = document.activeElement
  return pressKey(key, {}, focused === null || focused === document.body ? document : focused)
}

// jsdom has no PointerEvent: a mouse event of that name, with the pointer's id.
function pointerEvent(type: string) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  return event
}

// A drag on a slider as a browser does it: Reka takes the focus for the thumb when it starts.
async function dragSlider(thumb: Element) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => true
  Element.prototype.releasePointerCapture = () => {}
  const roots: Element[] = []
  for (let up = thumb.parentElement; up; up = up.parentElement) {
    if (up instanceof HTMLElement && up.dataset.orientation !== undefined) roots.push(up)
  }
  const root = roots.at(-1)
  if (!root) throw new Error('no slider root')
  root.dispatchEvent(pointerEvent('pointerdown'))
  await flushPromises()
  root.dispatchEvent(pointerEvent('pointerup'))
  await flushPromises()
}

const question = () => document.querySelector('[role="alertdialog"]')
function questionButton(text: string) {
  const button = [...(question()?.querySelectorAll('button') ?? [])].find(
    (candidate) => candidate.textContent === text,
  )
  if (!button) throw new Error(`no "${text}" button`)
  return button
}
async function clickElement(element: Element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

describe('ReviewPage', () => {
  beforeEach(() => {
    // The volume is kept in localStorage, which a spec must not inherit from another.
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('the title row’s icon buttons', () => {
    it('are Add split, Delete split and Play across split in the Split view, named and told by their keys', async () => {
      const wrapper = await mountPageOnSplit()
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
      const wrapper = await mountPageOnSplit()
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

    it('say Stop (Space) in the Split view while a clip is decoded, and Pause (Space) while it plays', async () => {
      const wrapper = await mountPageOnSplit()
      const audition = useAuditionStore()
      audition.status = 'loading'
      await wrapper.vm.$nextTick()
      expect(await tooltipOf(auditionButton(wrapper))).toBe('Stop (Space)')

      audition.status = 'playing'
      await wrapper.vm.$nextTick()
      expect(await tooltipOf(auditionButton(wrapper))).toBe('Pause (Space)')
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
    it('is disabled while the window centre is within a second of a split', async () => {
      const wrapper = await mountPageOnSplit()

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

    it('leaves the arrow keys moving the new split, so it can be nudged at once', async () => {
      const wrapper = mountPage()
      const split = useSplitStore()
      split.moveZoomTo(46)
      await wrapper.vm.$nextTick()

      await addSplitButton(wrapper).trigger('click')
      pressKey('ArrowRight')

      expect(split.selectedSplit?.seconds).toBeCloseTo(46.01)
    })
  })

  describe('Delete split', () => {
    it('is enabled while a split is selected, and disabled with none', async () => {
      const wrapper = await mountPageOnSplit()

      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeUndefined()

      useSplitStore().moveZoomTo(46)
      await wrapper.vm.$nextTick()

      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('deletes the selected split, which merges the tracks either side, and selects its neighbour', async () => {
      const wrapper = await mountPageOnSplit()
      const split = useSplitStore()

      await deleteSplitButton(wrapper).trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
      expect(split.tracks).toHaveLength(2)
      expect(split.selectedSplit?.seconds).toBe(71.5)
    })

    it('counts as an edit, as the Delete key does', async () => {
      const wrapper = await mountPageOnSplit()
      const split = useSplitStore()

      await deleteSplitButton(wrapper).trigger('click')

      expect(split.editCount).toBe(1)
    })

    it('leaves the arrow keys moving the split that is selected next', async () => {
      const wrapper = await mountPageOnSplit()
      const split = useSplitStore()

      await deleteSplitButton(wrapper).trigger('click')
      pressKey('ArrowLeft')

      expect(split.selectedSplit?.seconds).toBeCloseTo(71.49)
    })

    it('is disabled once the last split is deleted', async () => {
      const wrapper = await mountPageOnSplit()

      await deleteSplitButton(wrapper).trigger('click')
      await deleteSplitButton(wrapper).trigger('click')

      expect(useSplitStore().splits).toHaveLength(0)
      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('sits between "Add split" and "Play across split"', async () => {
      const wrapper = await mountPageOnSplit()

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
    it('reads "Play across split" and is enabled while a split is selected', async () => {
      const wrapper = await mountPageOnSplit()

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
      const wrapper = await mountPageOnSplit()
      const toggle = vi.spyOn(useAuditionStore(), 'toggle').mockImplementation(() => {})

      await auditionButton(wrapper).trigger('click')

      expect(toggle).toHaveBeenCalledTimes(1)
    })

    it('reads "Stop" while a clip loads, "Pause" while it plays and "Play across split" when paused, with its own icons, enabled throughout', async () => {
      const wrapper = await mountPageOnSplit()
      const audition = useAuditionStore()
      const playIcon = auditionButton(wrapper).get('svg').classes()

      audition.status = 'loading'
      await wrapper.vm.$nextTick()
      // The button is patched in place, so what each state looks like is read at once.
      const stopIcon = auditionButton(wrapper).get('svg').classes()
      expect(nameOf(auditionButton(wrapper))).toBe('Stop')
      expect(stopIcon).not.toEqual(playIcon)
      expect(auditionButton(wrapper).attributes('disabled')).toBeUndefined()

      audition.status = 'playing'
      await wrapper.vm.$nextTick()
      const pauseIcon = auditionButton(wrapper).get('svg').classes()
      expect(nameOf(auditionButton(wrapper))).toBe('Pause')
      expect(pauseIcon).not.toEqual(playIcon)
      expect(pauseIcon).not.toEqual(stopIcon)
      expect(auditionButton(wrapper).attributes('disabled')).toBeUndefined()

      audition.status = 'paused'
      await wrapper.vm.$nextTick()
      expect(nameOf(auditionButton(wrapper))).toBe('Play across split')
      expect(auditionButton(wrapper).get('svg').classes()).toEqual(playIcon)
      expect(auditionButton(wrapper).attributes('disabled')).toBeUndefined()

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
    it('starts on Track, with track 1 shown and Range disabled while there is no range', () => {
      const wrapper = mountPage()

      expect(viewOption(wrapper, 'Track').attributes('aria-checked')).toBe('true')
      expect(viewOption(wrapper, 'Track').attributes('disabled')).toBeUndefined()
      expect(viewOption(wrapper, 'Range').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[aria-label="Waveform of the track"]').exists()).toBe(true)
      expect(panelTitle(wrapper)).toBe('1 · 0:00:00.00 – 0:00:21.00')
    })

    it('shows the file’s opening seconds, with no split selected, when Split is chosen', async () => {
      const wrapper = mountPage()

      await viewOption(wrapper, 'Split').trigger('click')

      expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(true)
      expect(panelTitle(wrapper)).toBe('No split selected')
      expect(deleteSplitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('shows the zoom view and its buttons, and no Range view, on Split', async () => {
      const wrapper = await mountPageOnSplit()

      expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Waveform of the range"]').exists()).toBe(false)
      expect(addSplitButton(wrapper).exists()).toBe(true)
      expect(auditionButton(wrapper).exists()).toBe(true)
    })

    it('sets the split time in the 32 px figure on Split', async () => {
      const wrapper = await mountPageOnSplit()

      expect(wrapper.get('h2.text-display').text()).toMatch(/^\d:\d\d:\d\d\.\d\d$/)
      expect(wrapper.find('h2.text-lg').exists()).toBe(false)
    })

    it('keeps the Track and Range titles in Headline, not the 32 px figure', async () => {
      const onTrack = mountPage()
      expect(onTrack.find('h2.text-lg').exists()).toBe(true)
      expect(onTrack.find('h2.text-display').exists()).toBe(false)
      onTrack.unmount()

      const onRange = await mountPageWithRange()
      expect(onRange.find('h2.text-lg').exists()).toBe(true)
      expect(onRange.find('h2.text-display').exists()).toBe(false)
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
      expect(panelTitle(wrapper)).toBe('No split selected')

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

      it('shows track 1 again when a setting change finds the splits again', async () => {
        const wrapper = await mountPageWithTrack(2)

        useSplitStore().setMinimumGapLength(2.5)
        await wrapper.vm.$nextTick()

        expect(viewOption(wrapper, 'Track').attributes('aria-checked')).toBe('true')
        expect(panelTitle(wrapper)).toMatch(/^1 · /)
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
        const wrapper = await mountPageOnSplit()
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

    it('is not there in the Split view', async () => {
      const wrapper = await mountPageOnSplit()

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

    it('is not there in the Split view, where the audition button is', async () => {
      const wrapper = await mountPageOnSplit()

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

  describe('the shortcuts dialog', () => {
    it('opens on ? pressed anywhere on the page', async () => {
      mountPage()
      expect(shortcutsDialog()).toBeNull()

      pressQuestionMark()
      await flushPromises()

      expect(shortcutsDialog()?.textContent).toContain('Keyboard shortcuts')
    })

    it('does not open on ? typed into a track name, which stays a question mark', async () => {
      const wrapper = mountPage()
      const field = wrapper.get('input[aria-label="Name of track 1"]')

      pressQuestionMark(field.element)
      await flushPromises()

      expect(shortcutsDialog()).toBeNull()
    })

    it('puts the Split view first while it is on show', async () => {
      await mountPageOnSplit()

      pressQuestionMark()
      await flushPromises()

      expect(firstSection()).toBe('Split view')
    })

    it('puts the Track view first while a track is on show', async () => {
      await mountPageWithTrack(2)

      pressQuestionMark()
      await flushPromises()

      expect(firstSection()).toBe('Track view')
    })

    it('puts the Range view first while a range is on show', async () => {
      await mountPageWithRange()

      pressQuestionMark()
      await flushPromises()

      expect(firstSection()).toBe('Range view')
    })

    it('closes on Escape', async () => {
      mountPage()
      pressQuestionMark()
      await flushPromises()

      shortcutsDialog()?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      await flushPromises()

      expect(shortcutsDialog()).toBeNull()
    })

    it('is closed when the page goes away', async () => {
      const wrapper = mountPage()
      pressQuestionMark()
      await flushPromises()

      wrapper.unmount()
      await flushPromises()

      expect(useShortcutsDialogStore().isOpen).toBe(false)
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

  describe('single export', () => {
    let folder: FakeFolder

    beforeEach(() => {
      const sourceFile = useSourceFileStore()
      sourceFile.file = new File([], 'Evening Set.m4a')
      sourceFile.format = 'm4a'
      folder = new FakeFolder('', [], 'Music')
      vi.stubGlobal(
        'showDirectoryPicker',
        vi.fn(() => Promise.resolve(folder)),
      )
      vi.spyOn(sourceFile, 'cutTrack').mockResolvedValue(Uint8Array.of(1, 2, 3))
    })

    afterEach(() => {
      // Not `vi.unstubAllGlobals`: that would also remove the setup file's ResizeObserver.
      Reflect.deleteProperty(globalThis, 'showDirectoryPicker')
    })

    it('has "Export track…" after Play in the Track view and "Export range…" in the Range view, and neither in the Split view', async () => {
      // The volume's mute button ends every title row, after these.
      const track = await mountPageWithTrack(2)
      const trackNames = titleRowButtons(track)
      expect(trackNames.at(-2)).toBe('Export track…')
      expect(trackNames.at(-3)).toBe('Play')
      expect(await tooltipOf(exportButtonOf(track, 'Export track…'))).toBe('Export track…')

      const range = await mountPageWithRange()
      expect(titleRowButtons(range).at(-2)).toBe('Export range…')

      const onSplit = await mountPageOnSplit()
      expect(onSplit.find('button[aria-label^="Export "]').exists()).toBe(false)
    })

    it('opens the name dialog on the track, with "<source stem> NN", and does not stop the sound', async () => {
      const wrapper = await mountPageWithTrack(2)
      const stop = vi.spyOn(useAuditionStore(), 'stop')

      await exportButtonOf(wrapper, 'Export track…').trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain('Export track')
      expect(nameField().value).toBe('Evening Set 02')
      expect(stop).not.toHaveBeenCalled()
    })

    it('opens with the track’s own name when it has one', async () => {
      const wrapper = await mountPageWithTrack(2)
      const split = useSplitStore()
      split.renameTrack(split.splits[0]!.id, 'Chorus')

      await exportButtonOf(wrapper, 'Export track…').trigger('click')
      await flushPromises()

      expect(nameField().value).toBe('Chorus')
    })

    it('confirms with Enter: stops the sound first, writes the file, closes and says where it went', async () => {
      const wrapper = await mountPageWithTrack(2)
      const order: string[] = []
      vi.spyOn(useAuditionStore(), 'stop').mockImplementation(() => {
        order.push('stop')
      })
      vi.spyOn(useExportSingleStore(), 'confirm').mockImplementation(async (name) => {
        order.push(`confirm ${name}`)
        await Promise.resolve()
      })
      await exportButtonOf(wrapper, 'Export track…').trigger('click')
      await flushPromises()
      await typeName('Chorus')

      await pressEnterInField()

      expect(order).toEqual(['stop', 'confirm Chorus'])
    })

    it('writes the file and shows "Saved <file> in <folder>" in the Track view once the dialog closes', async () => {
      const wrapper = await mountPageWithTrack(2)
      await exportButtonOf(wrapper, 'Export track…').trigger('click')
      await flushPromises()
      await typeName('Chorus')

      await pressEnterInField()

      expect(dialog()).toBeNull()
      expect(folder.files.has('02 Chorus.m4a')).toBe(true)
      expect(savedLine(wrapper).text()).toBe('Saved 02 Chorus.m4a in Music')
    })

    it('has OK off and Enter doing nothing while the name is empty', async () => {
      const wrapper = await mountPageWithTrack(2)
      await exportButtonOf(wrapper, 'Export track…').trigger('click')
      await flushPromises()
      await typeName('')

      await pressEnterInField()

      const ok = [...document.querySelectorAll('button')].find(
        (candidate) => candidate.textContent.trim() === 'OK',
      )
      expect(ok?.disabled).toBe(true)
      expect(dialog()).not.toBeNull()
      expect(folder.files.size).toBe(0)
    })

    describe('the saved line', () => {
      it('goes at the next press in the view', async () => {
        const wrapper = await exportTrack2()

        // jsdom has no pointer capture, which the view's own press handler asks for.
        const view = wrapper.get('[aria-label="Playhead in the track"]')
        view.element.setPointerCapture = () => {}
        await view.trigger('pointerdown')

        expect(savedLine(wrapper).exists()).toBe(false)
      })

      it('goes at a key the view acts on', async () => {
        const wrapper = await exportTrack2()

        pressKey('ArrowRight')
        await wrapper.vm.$nextTick()

        expect(savedLine(wrapper).exists()).toBe(false)
      })

      it('stays at a key no view acts on, Tab or a letter', async () => {
        const wrapper = await exportTrack2()

        pressKey('Tab')
        pressKey('x')
        await wrapper.vm.$nextTick()

        expect(savedLine(wrapper).exists()).toBe(true)
      })

      it('goes at a selection change', async () => {
        const wrapper = await exportTrack2()

        await wrapper.get('[aria-label^="Select track 3"]').trigger('click')

        expect(savedLine(wrapper).exists()).toBe(false)
      })

      it('goes at a view switch, and stays gone on coming back', async () => {
        const wrapper = await exportTrack2()

        await viewOption(wrapper, 'Split').trigger('click')
        await viewOption(wrapper, 'Track').trigger('click')

        expect(savedLine(wrapper).exists()).toBe(false)
      })

      it('stays when a track is renamed', async () => {
        const wrapper = await exportTrack2()
        const split = useSplitStore()

        split.renameTrack(split.splits[1]!.id, 'Outro')
        await wrapper.vm.$nextTick()

        expect(savedLine(wrapper).exists()).toBe(true)
      })

      it('goes when a new range is dragged out, whose line it is not', async () => {
        const wrapper = await mountPageWithRange()
        await exportButtonOf(wrapper, 'Export range…').trigger('click')
        await flushPromises()
        await pressEnterInField()
        expect(savedLine(wrapper).exists()).toBe(true)

        useSplitStore().setRange(30, 40)
        await wrapper.vm.$nextTick()

        expect(savedLine(wrapper).exists()).toBe(false)
      })

      it('stays while the user does something else on the page', async () => {
        const wrapper = await exportTrack2()

        await exportButton(wrapper).element.dispatchEvent(
          new Event('pointerdown', { bubbles: true }),
        )
        await wrapper.vm.$nextTick()

        expect(savedLine(wrapper).exists()).toBe(true)
      })
    })

    describe('the range', () => {
      it('opens the name dialog with "<source stem> <start>–<end>"', async () => {
        const wrapper = await mountPageWithRange()

        await exportButtonOf(wrapper, 'Export range…').trigger('click')
        await flushPromises()

        expect(dialog()?.textContent).toContain('Export range')
        expect(nameField().value).toBe('Evening Set 0.00.10–0.00.20')
      })

      it('writes "<name>.m4a", names no track and shows the saved line in the Range view', async () => {
        const wrapper = await mountPageWithRange()
        await exportButtonOf(wrapper, 'Export range…').trigger('click')
        await flushPromises()
        await typeName('Chorus clip')

        await pressEnterInField()

        expect(folder.files.has('Chorus clip.m4a')).toBe(true)
        expect(savedLine(wrapper).text()).toBe('Saved Chorus clip.m4a in Music')
        expect(useSplitStore().editCount).toBe(0)
      })
    })

    it('is off while the full export runs', async () => {
      const wrapper = await mountPageWithTrack(2)
      useExportTracksStore().status = 'running'
      await wrapper.vm.$nextTick()

      expect(exportButtonOf(wrapper, 'Export track…').attributes('disabled')).toBeDefined()
    })
  })

  describe('pending splits', () => {
    it('are Add pending split and Apply after the view control in the Track view, then Back, Play and Export', async () => {
      const wrapper = await mountPageWithTrack(2)

      expect(titleRowButtons(wrapper)).toEqual([
        'Add pending split',
        'Apply',
        'Back to track start',
        'Play',
        'Export track…',
        'Mute',
      ])
    })

    it('add a Delete pending split between Apply and Back only while one is selected', async () => {
      const wrapper = await mountWithMark()
      expect(deletePendingButton(wrapper).exists()).toBe(false)

      await addPendingButton(wrapper).trigger('click')

      expect(titleRowButtons(wrapper).slice(0, 4)).toEqual([
        'Add pending split',
        'Apply',
        'Delete pending split',
        'Back to track start',
      ])

      useSplitStore().deselectPendingSplit()
      await wrapper.vm.$nextTick()
      expect(deletePendingButton(wrapper).exists()).toBe(false)
    })

    it('are icon buttons with tooltips: Add pending split (Enter), Apply, Delete pending split (Delete)', async () => {
      const wrapper = await mountWithMark()

      expect(await tooltipOf(addPendingButton(wrapper))).toBe('Add pending split (Enter)')

      useSplitStore().addPendingSplit(30, true)
      await wrapper.vm.$nextTick()
      expect(applyButton(wrapper).text()).toBe('')
      expect(await tooltipOf(applyButton(wrapper))).toBe('Apply')
      expect(await tooltipOf(deletePendingButton(wrapper))).toBe('Delete pending split (Delete)')
    })

    it('are not in the Split view or the Range view', async () => {
      for (const wrapper of [await mountPageOnSplit(), await mountPageWithRange()]) {
        const labels = titleRowButtons(wrapper)
        expect(labels).not.toContain('Add pending split')
        expect(labels).not.toContain('Apply')
        expect(labels).not.toContain('Delete pending split')
      }
    })

    describe('Add pending split', () => {
      it('is disabled with no mark, and enabled once there is room at the mark', async () => {
        const wrapper = await mountPageWithTrack(2)
        expect(addPendingButton(wrapper).attributes('disabled')).toBeDefined()

        useSplitStore().placeTrackMark(40)
        await wrapper.vm.$nextTick()

        expect(addPendingButton(wrapper).attributes('disabled')).toBeUndefined()
      })

      it('is disabled when the mark is within a second of the track’s end or of a pending split', async () => {
        const wrapper = await mountWithMark(21.5)
        expect(addPendingButton(wrapper).attributes('disabled')).toBeDefined()

        const split = useSplitStore()
        split.placeTrackMark(71)
        await wrapper.vm.$nextTick()
        expect(addPendingButton(wrapper).attributes('disabled')).toBeDefined()

        split.addPendingSplit(40, false)
        split.placeTrackMark(40.5)
        await wrapper.vm.$nextTick()
        expect(addPendingButton(wrapper).attributes('disabled')).toBeDefined()
      })

      it('is disabled while a pending split is selected, and enabled again once it is not', async () => {
        const wrapper = await mountWithMark()
        await addPendingButton(wrapper).trigger('click')
        useSplitStore().placeTrackMark(55)
        await wrapper.vm.$nextTick()
        expect(addPendingButton(wrapper).attributes('disabled')).toBeDefined()

        await deletePendingButton(wrapper).trigger('click')

        expect(addPendingButton(wrapper).attributes('disabled')).toBeUndefined()
      })

      it('adds a pending split at the mark and selects it', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()

        await addPendingButton(wrapper).trigger('click')

        expect(split.pendingSplits).toEqual([40])
        expect(split.selectedPendingSplit).toBe(40)
        expect(split.splits).toHaveLength(2)
      })
    })

    describe('Delete pending split', () => {
      it('deletes the selected one', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()
        split.addPendingSplit(30, false)
        split.addPendingSplit(50, true)
        await wrapper.vm.$nextTick()

        await deletePendingButton(wrapper).trigger('click')

        expect(split.pendingSplits).toEqual([30])
        expect(deletePendingButton(wrapper).exists()).toBe(false)
      })
    })

    describe('Apply', () => {
      it('is disabled with no pending split, and enabled with one, selected or not', async () => {
        const wrapper = await mountWithMark()
        expect(applyButton(wrapper).attributes('disabled')).toBeDefined()

        const split = useSplitStore()
        split.addPendingSplit(30, false)
        await wrapper.vm.$nextTick()
        expect(applyButton(wrapper).attributes('disabled')).toBeUndefined()

        split.selectPendingSplit(30)
        await wrapper.vm.$nextTick()
        expect(applyButton(wrapper).attributes('disabled')).toBeUndefined()
      })

      it('turns them into splits and shows the Split view on the first new one, centred', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()
        split.addPendingSplit(50, false)
        split.addPendingSplit(30, true)
        await wrapper.vm.$nextTick()

        await applyButton(wrapper).trigger('click')

        expect(split.splits.map((point) => point.seconds)).toEqual([21, 30, 50, 71.5])
        expect(split.editCount).toBe(2)
        expect(split.view).toBe('split')
        expect(split.selectedSplit?.seconds).toBe(30)
        expect(split.zoomCentreSeconds).toBe(30)
        expect(panelTitle(wrapper)).toBe('0:00:30.00')
        expect(wrapper.find('[aria-label="Zoomed waveform of the split"]').exists()).toBe(true)
      })

      it('leaves the arrow keys moving the new split, with nothing focused', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()
        split.addPendingSplit(30, false)
        await wrapper.vm.$nextTick()

        await applyButton(wrapper).trigger('click')
        await flushPromises()
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        pressKey('ArrowRight')

        expect(split.selectedSplit?.seconds).toBeCloseTo(30.01)
      })
    })

    describe('Export track…', () => {
      it('is disabled while the track has pending splits, with the reason as its tooltip', async () => {
        const wrapper = await mountWithMark()
        const button = exportButtonOf(wrapper, 'Export track…')
        expect(button.attributes('disabled')).toBeUndefined()

        useSplitStore().addPendingSplit(30, false)
        await wrapper.vm.$nextTick()

        expect(button.attributes('disabled')).toBeDefined()
        // A disabled button takes no focus event from the test tools, so the event goes direct.
        button.element.dispatchEvent(new FocusEvent('focus'))
        await wrapper.vm.$nextTick()
        expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
          'Apply or delete pending splits first',
        )
      })

      it('is enabled again once they are applied or deleted', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()
        split.addPendingSplit(30, true)
        await wrapper.vm.$nextTick()
        split.deleteSelectedPendingSplit()
        await wrapper.vm.$nextTick()

        expect(exportButtonOf(wrapper, 'Export track…').attributes('disabled')).toBeUndefined()
      })

      it('has no reason while it is enabled, and keeps "Export range…" free of it', async () => {
        const wrapper = await mountWithMark()
        expect(await tooltipOf(exportButtonOf(wrapper, 'Export track…'))).toBe('Export track…')

        useSplitStore().setRange(10, 20)
        await wrapper.vm.$nextTick()
        expect(exportButtonOf(wrapper, 'Export range…').attributes('disabled')).toBeUndefined()
      })
    })
  })

  describe('the discard question', () => {
    it('asks "Discard 2 pending splits?" with Apply first, Discard and Cancel, Apply first focused', async () => {
      const { split, wrapper } = await mountWithPending()

      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()

      expect(question()?.textContent).toContain('Discard 2 pending splits?')
      expect(
        [...(question()?.querySelectorAll('button') ?? [])].map((button) => button.textContent),
      ).toEqual(['Apply first', 'Discard', 'Cancel'])
      expect(document.activeElement).toBe(questionButton('Apply first'))
      // Nothing has happened yet.
      expect(split.selectedTrack?.number).toBe(2)
      expect(split.pendingSplits).toEqual([30, 50])
    })

    it('says "Discard 1 pending split?" for a single one', async () => {
      const wrapper = await mountWithMark()
      useSplitStore().addPendingSplit(30, false)
      await wrapper.vm.$nextTick()

      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()

      expect(question()?.textContent).toContain('Discard 1 pending split?')
    })

    it('"Apply first" applies them, then selects the track asked for', async () => {
      const { split, wrapper } = await mountWithPending()
      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()

      await clickElement(questionButton('Apply first'))

      expect(question()).toBeNull()
      expect(split.splits.map((point) => point.seconds)).toEqual([21, 30, 50, 71.5])
      expect(split.editCount).toBe(2)
      expect(split.pendingSplits).toEqual([])
      expect(split.selectedTrack?.startSeconds).toBe(71.5)
      expect(split.view).toBe('track')
    })

    it('"Discard" drops them, then selects the track asked for', async () => {
      const { split, wrapper } = await mountWithPending()
      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()

      await clickElement(questionButton('Discard'))

      expect(question()).toBeNull()
      expect(split.splits).toHaveLength(2)
      expect(split.editCount).toBe(0)
      expect(split.pendingSplits).toEqual([])
      expect(split.selectedTrack?.number).toBe(3)
    })

    it('"Cancel" and Escape do nothing and keep the pending splits', async () => {
      const { split, wrapper } = await mountWithPending()
      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()

      await clickElement(questionButton('Cancel'))

      expect(question()).toBeNull()
      expect(split.pendingSplits).toEqual([30, 50])
      expect(split.selectedTrack?.number).toBe(2)

      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()
      question()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushPromises()

      expect(question()).toBeNull()
      expect(split.pendingSplits).toEqual([30, 50])
      expect(split.selectedTrack?.number).toBe(2)
    })

    it('is asked before a Track list merge or trash button deletes one of the track’s end splits', async () => {
      const { split, wrapper } = await mountWithPending()

      await wrapper.get('button[aria-label="Remove track 3"]').trigger('click')
      await flushPromises()
      expect(question()?.textContent).toContain('Discard 2 pending splits?')
      await clickElement(questionButton('Cancel'))

      await wrapper.get('button[aria-label^="Delete split at 0:00:21.00"]').trigger('click')
      await flushPromises()
      expect(question()?.textContent).toContain('Discard 2 pending splits?')
      expect(split.splits).toHaveLength(2)
      await clickElement(questionButton('Discard'))
      expect(split.splits.map((point) => point.seconds)).toEqual([71.5])
    })

    it('is asked before a split is selected from the Track list or the track strip', async () => {
      const { split, wrapper } = await mountWithPending()

      await wrapper.get('tr:has(button[aria-label^="Delete split at 0:00:21.00"])').trigger('click')
      await flushPromises()

      expect(question()?.textContent).toContain('Discard 2 pending splits?')
      expect(split.selectedSplit).toBeNull()
    })

    it('asks nothing without pending splits, for the selected track again, or for a view switch', async () => {
      const wrapper = await mountWithMark()
      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()
      expect(question()).toBeNull()
      expect(useSplitStore().selectedTrack?.number).toBe(3)

      const split = useSplitStore()
      split.addPendingSplit(80, false)
      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await viewOption(wrapper, 'Split').trigger('click')
      await viewOption(wrapper, 'Track').trigger('click')
      await flushPromises()

      expect(question()).toBeNull()
      expect(split.pendingSplits).toEqual([80])
    })

    it('is asked when a split is added from the zoom view with pending splits, which selects it', async () => {
      const { split, wrapper } = await mountWithPending()
      await viewOption(wrapper, 'Split').trigger('click')
      split.zoomCentreSeconds = 46
      await wrapper.vm.$nextTick()

      await addSplitButton(wrapper).trigger('click')
      await flushPromises()

      expect(question()?.textContent).toContain('Discard 2 pending splits?')
      expect(split.splits).toHaveLength(2)
    })
  })

  describe('the volume', () => {
    const views = [
      ['Split', mountPageOnSplit],
      ['Track', () => mountPageWithTrack(2)],
      ['Range', mountPageWithRange],
    ] as const

    describe.each(views)('in the %s view', (_, mountView) => {
      it('ends the title row with a Mute button and a slider named Volume that reads in dB', async () => {
        const wrapper = await mountView()
        const slider = await volumeSlider(wrapper)

        expect(titleRowButtons(wrapper).at(-1)).toBe('Mute')
        expect(await tooltipOf(muteButton(wrapper))).toBe('Mute')
        expect(slider.attributes('aria-valuemin')).toBe('-40')
        expect(slider.attributes('aria-valuemax')).toBe('0')
        expect(slider.attributes('aria-valuenow')).toBe('0')
        expect(slider.attributes('aria-valuetext')).toBe('0 dB')
      })

      it('steps the level by 1 dB from the keyboard, in the player', async () => {
        const wrapper = await mountView()
        const slider = await volumeSlider(wrapper)

        await slider.trigger('keydown', { key: 'ArrowLeft' })
        await slider.trigger('keydown', { key: 'ArrowLeft' })

        expect(useAuditionStore().volumeDecibels).toBe(-2)
        expect(slider.attributes('aria-valuenow')).toBe('-2')
        expect(slider.attributes('aria-valuetext')).toBe('−2 dB')
      })

      it('mutes and unmutes, the button and its tooltip saying what the next press does', async () => {
        const wrapper = await mountView()
        const audition = useAuditionStore()

        await muteButton(wrapper).trigger('click')

        expect(audition.isMuted).toBe(true)
        expect(muteButton(wrapper).attributes('aria-label')).toBe('Unmute')
        expect(await tooltipOf(muteButton(wrapper))).toBe('Unmute')

        await muteButton(wrapper).trigger('click')

        expect(audition.isMuted).toBe(false)
        expect(muteButton(wrapper).attributes('aria-label')).toBe('Mute')
      })
    })

    it('shows the level and the mute the player already has', async () => {
      const audition = useAuditionStore()
      audition.setVolume(-12)
      audition.toggleMute()

      const wrapper = await mountPageOnSplit()
      const slider = await volumeSlider(wrapper)

      expect(slider.attributes('aria-valuetext')).toBe('−12 dB')
      expect(muteButton(wrapper).attributes('aria-label')).toBe('Unmute')
    })

    it('is one setting for every view: a level set in one is the level in the next', async () => {
      const wrapper = await mountPageOnSplit()
      const slider = await volumeSlider(wrapper)
      await slider.trigger('keydown', { key: 'Home' })

      await viewOption(wrapper, 'Track').trigger('click')

      const inTrackView = await volumeSlider(wrapper)
      expect(inTrackView.attributes('aria-valuetext')).toBe('−40 dB')
    })
  })

  describe('the keys on the page', () => {
    it('move the selected split in the Split view after a click on its track-list row, with the focus on the page', async () => {
      const wrapper = await mountPageOnSplit()
      const split = useSplitStore()
      const row = wrapper.findAll('tr').find((candidate) => candidate.text().startsWith('Split 2'))
      await row!.trigger('click')
      expect(document.activeElement).toBe(document.body)

      pressKey('ArrowLeft')
      expect(split.selectedSplit?.seconds).toBeCloseTo(71.49)

      pressKey('ArrowRight', { shiftKey: true })
      expect(split.selectedSplit?.seconds).toBeCloseTo(71.59)
    })

    it('change nothing in the Split view with Cmd+Backspace or Alt+Left', async () => {
      await mountPageOnSplit()
      const split = useSplitStore()

      pressKey('Backspace', { metaKey: true })
      pressKey('ArrowLeft', { altKey: true })

      expect(split.splits.map((point) => point.seconds)).toEqual([21, 71.5])
    })

    it('act in the Track view with the focus on the page, after a click on a track-list row', async () => {
      const wrapper = await mountWithMark()
      const split = useSplitStore()
      const toggleStretch = vi
        .spyOn(useAuditionStore(), 'toggleStretch')
        .mockImplementation(() => {})
      expect(document.activeElement).toBe(document.body)

      pressKey(' ')
      pressKey('Enter')
      await wrapper.vm.$nextTick()

      expect(toggleStretch).toHaveBeenCalledTimes(1)
      expect(split.pendingSplits).toEqual([40])
    })

    it('act in the Range view without its frame ever having the focus', async () => {
      const wrapper = await mountPageWithRange()
      const split = useSplitStore()
      split.placeMark(15)
      await wrapper.vm.$nextTick()
      const audition = useAuditionStore()
      const range = split.range!

      pressKey('ArrowLeft')
      pressKey('Enter')
      await wrapper.vm.$nextTick()

      expect(audition.stretchPlayheadSeconds(range)).toBe(10)
      expect(split.splits.map((point) => point.seconds)).toContain(15)
      expect(document.activeElement).not.toBe(playheadInRange(wrapper))
    })

    it('leave a track name its Backspace, and the selected pending split its place', async () => {
      const wrapper = await mountWithMark()
      const split = useSplitStore()
      split.addPendingSplit(40, true)
      await wrapper.vm.$nextTick()
      const field = wrapper.get('input')

      const event = pressKey('Backspace', {}, field.element)
      await wrapper.vm.$nextTick()

      expect(event.defaultPrevented).toBe(false)
      expect(split.pendingSplits).toEqual([40])
      expect(split.selectedPendingSplit).toBe(40)
    })

    it('stay out while the discard question is open, and Escape closes only the question', async () => {
      const { split, wrapper } = await mountWithPending()
      split.selectPendingSplit(30)
      await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
      await flushPromises()
      expect(question()).not.toBeNull()

      pressKey('Delete', {}, question()!)
      pressKey('Escape', {}, question()!)
      await flushPromises()

      expect(question()).toBeNull()
      expect(split.pendingSplits).toEqual([30, 50])
      expect(split.selectedPendingSplit).toBe(30)
    })

    it('stay out while the shortcuts dialog is open', async () => {
      const wrapper = await mountWithMark()
      const toggleStretch = vi
        .spyOn(useAuditionStore(), 'toggleStretch')
        .mockImplementation(() => {})
      pressQuestionMark()
      await flushPromises()

      pressKey(' ')
      pressKey('Enter')

      expect(toggleStretch).not.toHaveBeenCalled()
      expect(useSplitStore().pendingSplits).toEqual([])
      wrapper.unmount()
    })

    it('leave Space and Enter to a button reached with Tab, and give it the arrows', async () => {
      const wrapper = await mountWithMark()
      const split = useSplitStore()
      const audition = useAuditionStore()
      const toggleStretch = vi.spyOn(audition, 'toggleStretch').mockImplementation(() => {})
      const stretch = trackExtent(split.selectedTrack!)
      const button = rangeButton(wrapper).element as HTMLElement
      button.focus()

      pressKey(' ', {}, button)
      pressKey('Enter', {}, button)
      expect(toggleStretch).not.toHaveBeenCalled()
      expect(split.pendingSplits).toEqual([])

      pressKey('ArrowRight', {}, button)
      expect(audition.stretchPlayheadSeconds(stretch)).toBe(22)
    })

    it('are left to the browser with Ctrl, Cmd or Alt held', async () => {
      const wrapper = await mountWithMark()
      const toggleStretch = vi
        .spyOn(useAuditionStore(), 'toggleStretch')
        .mockImplementation(() => {})

      pressKey(' ', { ctrlKey: true })
      pressKey(' ', { metaKey: true })
      pressKey(' ', { altKey: true })
      await wrapper.vm.$nextTick()

      expect(toggleStretch).not.toHaveBeenCalled()
    })

    describe('after a mouse click', () => {
      it('on Play in the Track view, Space pauses the track and does not press Play again', async () => {
        const wrapper = await mountWithMark()
        const toggleStretch = vi
          .spyOn(useAuditionStore(), 'toggleStretch')
          .mockImplementation(() => {})

        await mouseClick(rangeButton(wrapper).element)
        expect(toggleStretch).toHaveBeenCalledTimes(1)
        pressWhereFocused(' ')

        expect(toggleStretch).toHaveBeenCalledTimes(2)
      })

      it('on Play while a track name is being edited, the field lets go and Space acts on the view', async () => {
        const wrapper = await mountWithMark()
        const toggleStretch = vi
          .spyOn(useAuditionStore(), 'toggleStretch')
          .mockImplementation(() => {})
        const field = wrapper.get('input').element
        field.focus()
        expect(document.activeElement).toBe(field)

        await mouseClick(rangeButton(wrapper).element)
        pressWhereFocused(' ')

        expect(document.activeElement).not.toBe(field)
        expect(toggleStretch).toHaveBeenCalledTimes(2)
      })

      it('on the Split | Track | Range control, the arrows go to the view now on show', async () => {
        const wrapper = await mountPageWithRange()
        const split = useSplitStore()
        const audition = useAuditionStore()

        await mouseClick(viewOption(wrapper, 'Track').element)
        pressWhereFocused('ArrowRight')

        expect(split.view).toBe('track')
        const start = trackExtent(split.selectedTrack!)
        expect(audition.stretchPlayheadSeconds(start)).toBe(start.startSeconds + 1)
      })

      it('on a track-list row, Space acts on the view on show', async () => {
        const wrapper = await mountWithMark()
        const toggleStretch = vi
          .spyOn(useAuditionStore(), 'toggleStretch')
          .mockImplementation(() => {})

        await mouseClick(wrapper.get('[aria-label^="Select track 2"]').element)
        pressWhereFocused(' ')

        expect(toggleStretch).toHaveBeenCalledTimes(1)
      })

      it('on a track-strip block, Space acts on the view on show', async () => {
        const wrapper = await mountWithMark()
        const toggleStretch = vi
          .spyOn(useAuditionStore(), 'toggleStretch')
          .mockImplementation(() => {})
        const block = wrapper
          .findAll('button')
          .find((candidate) => nameOf(candidate).startsWith('2, '))

        await mouseClick(block!.element)
        pressWhereFocused(' ')

        expect(toggleStretch).toHaveBeenCalledTimes(1)
      })

      it('on a drag of the silence threshold, Left moves the playhead and the threshold stays', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()
        const audition = useAuditionStore()

        await dragSlider(wrapper.get('[role="slider"][aria-label="Silence threshold"]').element)
        // The drag may have found other splits, so the track is the one the drag left selected.
        const stretch = trackExtent(split.selectedTrack!)
        const threshold = split.silenceThreshold
        pressWhereFocused('ArrowRight')

        expect(audition.stretchPlayheadSeconds(stretch)).toBe(stretch.startSeconds + 1)
        expect(split.silenceThreshold).toBe(threshold)
      })
    })

    it('switch to the new view as the view on show changes', async () => {
      const wrapper = await mountWithMark()
      const split = useSplitStore()
      const toggleStretch = vi
        .spyOn(useAuditionStore(), 'toggleStretch')
        .mockImplementation(() => {})
      split.setRange(10, 20)
      split.showView('range')
      await wrapper.vm.$nextTick()

      pressKey(' ')

      expect(toggleStretch).toHaveBeenCalledExactlyOnceWith(split.range)
    })
  })
})
