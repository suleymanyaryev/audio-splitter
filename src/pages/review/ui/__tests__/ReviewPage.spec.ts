import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DOMWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { useShortcutsDialogStore } from '@/widgets/shortcuts-dialog/model/shortcuts-dialog.ts'
import { trackExtent } from '@/widgets/split-zoom/lib/track-extent.ts'
import { usePlayerStore } from '@/widgets/split-zoom/model/player.ts'
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

// The page as a file opens it: one track, no splits, the gaps shown.
function mountOpenedPage() {
  const sourceFile = useSourceFileStore()
  sourceFile.status = 'ready'
  sourceFile.durationSeconds = 100
  sourceFile.loudnessWindowSeconds = 0.05
  sourceFile.loudness = curveWithTwoGaps()
  return mount(ReviewPage, { attachTo: document.body })
}

/*
The page after "Find splits", which most specs start from: splits at 21 s and 71.5 s. Find splits runs
right after the page opens the file, before its first render.
*/
function mountPage() {
  const split = useSplitStore()
  split.$onAction(({ name, after }) => {
    if (name === 'open') after(() => split.findSplits())
  })
  return mountOpenedPage()
}

// The page for a source file of that name, which sets the track name prefix the page starts with.
function mountPageForFile(name: string) {
  useSourceFileStore().file = new File([], name)
  return mountPage()
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

/*
The page on the Split view with the zoom window at that time and no split selected, as a click on
empty ground in the whole-file view leaves it.
*/
async function mountAtCentre(seconds: number) {
  const wrapper = await mountPageOnSplit()
  useSplitStore().moveZoomTo(seconds)
  await wrapper.vm.$nextTick()
  expect(useSplitStore().selectedSplit).toBeNull()
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

const alertDialogText = () => document.querySelector('[role="alertdialog"]')?.textContent ?? ''
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

// The icon button left of the audition button.
function backToAuditionStartButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('button[aria-label="Back to audition start"]')
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

// The play speed's reset button, which shows the speed, and its slider once Reka has placed the thumb.
const playSpeedButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('button[aria-label^="Reset play speed"]')
async function playSpeedSlider(wrapper: ReturnType<typeof mount>) {
  await flushPromises()
  return wrapper.get('[role="slider"][aria-label="Play speed"]')
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

/*
The previous and next keys, track or split, are the physical ones to the right of P: the page
matches the code.
*/
const NEXT = { key: ']', code: 'BracketRight' }
const PREVIOUS = { key: '[', code: 'BracketLeft' }

// The player's play action, spied on and replaced, as the playback cases do.
function spyOnToggle() {
  return vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})
}

// The second split selected, as a click on its row does, on a page that is on the Split view.
async function selectSecondSplit(wrapper: ReturnType<typeof mount>) {
  const split = useSplitStore()
  split.selectSplit(split.splits[1]!.id)
  await wrapper.vm.$nextTick()
}

// The track list's row that is marked, by the label of its select button.
const markedTrack = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('tr[aria-current="true"] [aria-label^="Select track"]').attributes('aria-label')

// The track list's row that is marked, which reads "Split n" while a split is selected.
const markedSplit = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get('tr[aria-current="true"]').text()

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

  describe('opening a file', () => {
    it('shows one track and no splits, on track 1 in the Track view, with the gaps shown', () => {
      const wrapper = mountOpenedPage()
      const split = useSplitStore()

      expect(split.splits).toEqual([])
      expect(split.tracks).toHaveLength(1)
      expect(split.selectedTrack?.number).toBe(1)
      expect(split.view).toBe('track')
      expect(split.gaps).toHaveLength(2)
      expect(wrapper.text()).toContain('Tracks (1)')
    })

    it('adds a split in each gap when Find splits is pressed, and keeps the view', async () => {
      const wrapper = mountOpenedPage()
      const split = useSplitStore()
      const button = wrapper
        .findAll('button')
        .find((candidate) => candidate.text().startsWith('Find splits'))

      expect(button?.text()).toBe('Find splits (2)')
      await button?.trigger('click')

      expect(split.splits.map((point) => point.seconds)).toEqual([
        expect.closeTo(21, 9),
        expect.closeTo(71.5, 9),
      ])
      expect(split.selectedTrack?.number).toBe(1)
      expect(split.view).toBe('track')
      expect(button?.text()).toBe('Find splits (0)')
    })

    it('asks "Discard 1 pending split?" when a split would land inside the selected track', async () => {
      const wrapper = mountOpenedPage()
      const split = useSplitStore()
      split.addPendingSplit(10, true)
      const button = wrapper
        .findAll('button')
        .find((candidate) => candidate.text().startsWith('Find splits'))

      await button?.trigger('click')

      expect(alertDialogText()).toContain('Discard 1 pending split?')
      expect(split.splits).toEqual([])
    })
  })

  describe('leaving tracks out', () => {
    it('disables "Export to folder…" only while every track is left out', async () => {
      const wrapper = mountPage()
      const split = useSplitStore()
      expect(exportButton(wrapper).attributes('disabled')).toBeUndefined()

      for (const track of split.tracks) split.toggleLeftOut(track.startSplit?.id ?? null)
      await wrapper.vm.$nextTick()
      expect(exportButton(wrapper).attributes('disabled')).toBeDefined()

      split.toggleLeftOut(null)
      await wrapper.vm.$nextTick()
      expect(exportButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('leaves the selected track out with X in the Track view, and brings it back', async () => {
      const wrapper = await mountPageWithTrack(2)
      const split = useSplitStore()

      pressKey('x')
      await wrapper.vm.$nextTick()
      expect(split.tracks.map((track) => track.isLeftOut)).toEqual([false, true, false])
      expect(wrapper.find('button[aria-label="Bring back track 2"]').exists()).toBe(true)

      pressKey('x')
      await wrapper.vm.$nextTick()
      expect(split.tracks.map((track) => track.isLeftOut)).toEqual([false, false, false])
    })

    it('leaves X alone in the Split view, which has no track to leave out', async () => {
      const wrapper = await mountPageOnSplit()

      pressKey('x')
      await wrapper.vm.$nextTick()

      expect(useSplitStore().tracks.some((track) => track.isLeftOut)).toBe(false)
    })

    it('titles the Track view by the track’s place in the file, not by its export number', async () => {
      const wrapper = await mountPageWithTrack(2)
      useSplitStore().toggleLeftOut(null)
      await wrapper.vm.$nextTick()

      expect(panelTitle(wrapper)).toMatch(/^02 · /)
    })
  })

  describe('the track name prefix', () => {
    it('starts as the source file’s name without its extension, followed by "-"', () => {
      const wrapper = mountPageForFile('dreamscape.m4a')

      expect(useSplitStore().trackNamePrefix).toBe('dreamscape-')
      expect(
        wrapper.get<HTMLInputElement>('input[aria-label="Track name prefix"]').element.value,
      ).toBe('dreamscape-')
      expect(useSplitStore().tracks.map((track) => track.name)).toEqual([
        'dreamscape-01',
        'dreamscape-02',
        'dreamscape-03',
      ])
    })

    it('is empty for a file whose name has nothing before its extension', () => {
      mountPageForFile('.m4a')

      expect(useSplitStore().trackNamePrefix).toBe('')
    })

    it('starts again from the next file, since the page mounts again', () => {
      mountPageForFile('first.m4a').unmount()
      const wrapper = mountPageForFile('second.mp3')

      expect(useSplitStore().trackNamePrefix).toBe('second-')
      wrapper.unmount()
    })

    it('has its field in the header of the Track list panel', () => {
      const wrapper = mountPageForFile('dreamscape.m4a')

      const panel = wrapper.get(
        'section[aria-labelledby]:has(input[aria-label="Track name prefix"])',
      )

      expect(panel.get('h2').text()).toBe('Track list')
      expect(panel.get('label').text()).toBe('Prefix')
    })
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
      const player = usePlayerStore()
      player.status = 'loading'
      await wrapper.vm.$nextTick()
      expect(await tooltipOf(auditionButton(wrapper))).toBe('Stop (Space)')

      player.status = 'playing'
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
      const player = usePlayerStore()

      for (const [status, label] of [
        ['loading', 'Stop'],
        ['playing', 'Pause'],
        ['paused', 'Play'],
        ['idle', 'Play'],
      ] as const) {
        player.status = status
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
      const toggle = spyOnToggle()

      await auditionButton(wrapper).trigger('click')

      expect(toggle).toHaveBeenCalledTimes(1)
    })

    it('reads "Stop" while a clip loads, "Pause" while it plays and "Play across split" when paused, with its own icons, enabled throughout', async () => {
      const wrapper = await mountPageOnSplit()
      const player = usePlayerStore()
      const playIcon = auditionButton(wrapper).get('svg').classes()

      player.status = 'loading'
      await wrapper.vm.$nextTick()
      // The button is patched in place, so what each state looks like is read at once.
      const stopIcon = auditionButton(wrapper).get('svg').classes()
      expect(nameOf(auditionButton(wrapper))).toBe('Stop')
      expect(stopIcon).not.toEqual(playIcon)
      expect(auditionButton(wrapper).attributes('disabled')).toBeUndefined()

      player.status = 'playing'
      await wrapper.vm.$nextTick()
      const pauseIcon = auditionButton(wrapper).get('svg').classes()
      expect(nameOf(auditionButton(wrapper))).toBe('Pause')
      expect(pauseIcon).not.toEqual(playIcon)
      expect(pauseIcon).not.toEqual(stopIcon)
      expect(auditionButton(wrapper).attributes('disabled')).toBeUndefined()

      player.status = 'paused'
      await wrapper.vm.$nextTick()
      expect(nameOf(auditionButton(wrapper))).toBe('Play across split')
      expect(auditionButton(wrapper).get('svg').classes()).toEqual(playIcon)
      expect(auditionButton(wrapper).attributes('disabled')).toBeUndefined()

      player.status = 'idle'
      await wrapper.vm.$nextTick()
      expect(nameOf(auditionButton(wrapper))).toBe('Play across split')
    })

    it('stops the audition when the page goes away', () => {
      const wrapper = mountPage()
      const stop = vi.spyOn(usePlayerStore(), 'stop')

      wrapper.unmount()

      expect(stop).toHaveBeenCalled()
    })
  })

  describe('the "Back to audition start" button', () => {
    it('sits between "Delete split" and "Play across split", told by its key', async () => {
      const wrapper = await mountPageOnSplit()
      const labels = iconButtons(wrapper).map((button) => nameOf(button))

      expect(labels.indexOf('Back to audition start')).toBe(labels.indexOf('Delete split') + 1)
      expect(labels.indexOf('Back to audition start')).toBe(labels.indexOf('Play across split') - 1)
      expect(await tooltipOf(backToAuditionStartButton(wrapper))).toBe(
        'Back to audition start (Home)',
      )
      expect(labels).not.toContain('Back to split start')
    })

    it('takes the playhead back to the audition’s start when clicked', async () => {
      const wrapper = await mountPageOnSplit()
      const player = usePlayerStore()
      const selected = useSplitStore().selectedSplit!
      player.seek(selected.seconds + 3)
      expect(player.playheadSeconds()).toBe(selected.seconds + 3)

      await backToAuditionStartButton(wrapper).trigger('click')

      expect(player.playheadSeconds()).toBe(selected.seconds - 4)
    })

    it('is disabled while no split is selected', async () => {
      const wrapper = mountPage()
      useSplitStore().moveZoomTo(46)
      await wrapper.vm.$nextTick()

      expect(backToAuditionStartButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('is enabled whatever the audition is doing', async () => {
      const wrapper = await mountPageOnSplit()
      const player = usePlayerStore()

      for (const status of ['loading', 'playing', 'paused'] as const) {
        player.status = status
        await wrapper.vm.$nextTick()
        expect(backToAuditionStartButton(wrapper).attributes('disabled')).toBeUndefined()
      }
    })
  })

  describe('the Split | Track | Range control', () => {
    it('starts on Track, with track 1 shown and Range disabled while there is no range', () => {
      const wrapper = mountPage()

      expect(viewOption(wrapper, 'Track').attributes('aria-checked')).toBe('true')
      expect(viewOption(wrapper, 'Track').attributes('disabled')).toBeUndefined()
      expect(viewOption(wrapper, 'Range').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[aria-label="Waveform of the track"]').exists()).toBe(true)
      expect(panelTitle(wrapper)).toBe('01 · 0:00:00.00 – 0:00:21.00')
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
        expect(panelTitle(wrapper)).toBe('03 · 0:01:11.50 – 0:01:40.00')
      })

      it('shows the first track too', async () => {
        const wrapper = await mountPageWithTrack(1)

        expect(wrapper.find('[aria-label="Waveform of the track"]').exists()).toBe(true)
        expect(panelTitle(wrapper)).toBe('01 · 0:00:00.00 – 0:00:21.00')
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
        expect(panelTitle(wrapper)).toBe('02 · 0:00:21.00 – 0:01:11.50')
      })

      it('keeps the track when a setting changes, since that changes only the gaps', async () => {
        const wrapper = await mountPageWithTrack(2)

        useSplitStore().setMinimumGapLength(2.5)
        await wrapper.vm.$nextTick()

        expect(viewOption(wrapper, 'Track').attributes('aria-checked')).toBe('true')
        expect(panelTitle(wrapper)).toMatch(/^02 · /)
      })

      it('plays the track as a stretch when Play is clicked', async () => {
        const wrapper = await mountPageWithTrack(2)
        const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

        await rangeButton(wrapper).trigger('click')

        expect(toggleSpy).toHaveBeenCalledExactlyOnceWith()
      })

      it('moves the playhead to the track’s start when "Back to track start" is clicked', async () => {
        const wrapper = await mountPageWithTrack(2)
        const backToStartSpy = vi
          .spyOn(usePlayerStore(), 'backToStart')
          .mockImplementation(() => {})

        await wrapper.get('button[aria-label="Back to track start"]').trigger('click')

        expect(backToStartSpy).toHaveBeenCalledExactlyOnceWith()
      })

      it('reads "Stop" while the track is decoded, "Pause" while it plays and "Play" when paused, enabled throughout', async () => {
        const wrapper = await mountPageWithTrack(2)
        const player = usePlayerStore()
        const back = () => wrapper.get('button[aria-label="Back to track start"]')

        expect(nameOf(rangeButton(wrapper))).toBe('Play')
        for (const [status, label] of [
          ['loading', 'Stop'],
          ['playing', 'Pause'],
          ['paused', 'Play'],
        ] as const) {
          player.status = status
          await wrapper.vm.$nextTick()
          expect(nameOf(rangeButton(wrapper))).toBe(label)
          expect(rangeButton(wrapper).attributes('disabled')).toBeUndefined()
          expect(back().attributes('disabled')).toBeUndefined()
        }
      })

      it('stops the sound when the view changes to Split', async () => {
        const wrapper = await mountPageWithTrack(2)
        const stop = vi.spyOn(usePlayerStore(), 'stop')

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
        const stop = vi.spyOn(usePlayerStore(), 'stop')

        await wrapper.get('[aria-label^="Select track 3"]').trigger('click')

        expect(stop).toHaveBeenCalled()
      })
    })

    it('stops the audition when the view changes', async () => {
      const wrapper = mountPage()
      const stop = vi.spyOn(usePlayerStore(), 'stop')

      useSplitStore().setRange(10, 20)
      await wrapper.vm.$nextTick()

      expect(stop).toHaveBeenCalled()
    })
  })

  describe('the "Back to range start" button', () => {
    it('is an icon button just left of the range button, enabled whatever the player is doing', async () => {
      const wrapper = await mountPageWithRange()
      const player = usePlayerStore()
      const labels = wrapper.findAll('button').map((button) => nameOf(button))

      expect(labels.indexOf('Back to range start')).toBe(labels.indexOf('Play') - 1)
      expect(backButton(wrapper).text()).toBe('')

      for (const status of ['loading', 'playing', 'paused'] as const) {
        player.status = status
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
        .spyOn(usePlayerStore(), 'backToStart')
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
      const toggleRange = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

      await rangeButton(wrapper).trigger('click')

      expect(toggleRange).toHaveBeenCalledTimes(1)
    })

    it('reads "Stop" while the range is decoded, "Pause" while it plays and "Play" when paused', async () => {
      const wrapper = await mountPageWithRange()
      const player = usePlayerStore()
      const playIcon = rangeButton(wrapper).get('svg').classes()

      player.status = 'loading'
      await wrapper.vm.$nextTick()
      expect(nameOf(rangeButton(wrapper))).toBe('Stop')
      expect(rangeButton(wrapper).attributes('disabled')).toBeUndefined()

      player.status = 'playing'
      await wrapper.vm.$nextTick()
      expect(nameOf(rangeButton(wrapper))).toBe('Pause')
      expect(rangeButton(wrapper).get('svg').classes()).not.toEqual(playIcon)

      player.status = 'paused'
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
      vi.spyOn(usePlayerStore(), 'stop').mockImplementation(() => {
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
      // The play speed's reset button and the volume's mute button end every title row, after these.
      const track = await mountPageWithTrack(2)
      const trackNames = titleRowButtons(track)
      expect(trackNames.at(-3)).toBe('Export track…')
      expect(trackNames.at(-4)).toBe('Play')
      expect(await tooltipOf(exportButtonOf(track, 'Export track…'))).toBe('Export track…')

      const range = await mountPageWithRange()
      expect(titleRowButtons(range).at(-3)).toBe('Export range…')

      const onSplit = await mountPageOnSplit()
      expect(onSplit.find('button[aria-label^="Export "]').exists()).toBe(false)
    })

    it('opens the name dialog on the track, with the track’s shown name, and does not stop the sound', async () => {
      const wrapper = await mountPageWithTrack(2)
      const stop = vi.spyOn(usePlayerStore(), 'stop')

      await exportButtonOf(wrapper, 'Export track…').trigger('click')
      await flushPromises()

      expect(dialog()?.textContent).toContain('Export track')
      expect(nameField().value).toBe('Evening Set-02')
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
      vi.spyOn(usePlayerStore(), 'stop').mockImplementation(() => {
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
      expect(folder.files.has('Chorus.m4a')).toBe(true)
      expect(savedLine(wrapper).text()).toBe('Saved Chorus.m4a in Music')
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

      it('stays at ] on the last track', async () => {
        const wrapper = await mountPageWithTrack(3)
        await exportButtonOf(wrapper, 'Export track…').trigger('click')
        await flushPromises()
        await pressEnterInField()
        expect(savedLine(wrapper).exists()).toBe(true)

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(savedLine(wrapper).exists()).toBe(true)
      })

      it('stays at [ on the first track', async () => {
        const wrapper = await mountPageWithTrack(1)
        await exportButtonOf(wrapper, 'Export track…').trigger('click')
        await flushPromises()
        await pressEnterInField()
        expect(savedLine(wrapper).exists()).toBe(true)

        pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(savedLine(wrapper).exists()).toBe(true)
      })

      it('stays at a held ], a repeat that steps nowhere', async () => {
        const wrapper = await exportTrack2()

        pressKey(NEXT.key, { code: NEXT.code, repeat: true })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedTrack?.number).toBe(2)
        expect(savedLine(wrapper).exists()).toBe(true)
      })

      it('stays at ] that opens the discard question, which leaves the track as it was', async () => {
        const wrapper = await exportTrack2()
        useSplitStore().addPendingSplit(30, false)
        await wrapper.vm.$nextTick()

        pressKey(NEXT.key, { code: NEXT.code })
        await flushPromises()

        expect(question()).not.toBeNull()
        expect(savedLine(wrapper).exists()).toBe(true)
      })

      it('stays at a key no view acts on, Tab or a letter', async () => {
        const wrapper = await exportTrack2()

        pressKey('Tab')
        pressKey('q')
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
        'Reset play speed, now 1.0×',
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

        expect(usePlayerStore().volumeDecibels).toBe(-2)
        expect(slider.attributes('aria-valuenow')).toBe('-2')
        expect(slider.attributes('aria-valuetext')).toBe('−2 dB')
      })

      it('mutes and unmutes, the button and its tooltip saying what the next press does', async () => {
        const wrapper = await mountView()
        const player = usePlayerStore()

        await muteButton(wrapper).trigger('click')

        expect(player.isMuted).toBe(true)
        expect(muteButton(wrapper).attributes('aria-label')).toBe('Unmute')
        expect(await tooltipOf(muteButton(wrapper))).toBe('Unmute')

        await muteButton(wrapper).trigger('click')

        expect(player.isMuted).toBe(false)
        expect(muteButton(wrapper).attributes('aria-label')).toBe('Mute')
      })
    })

    it('shows the level and the mute the player already has', async () => {
      const player = usePlayerStore()
      player.setVolume(-12)
      player.toggleMute()

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

  describe('the play speed', () => {
    const views = [
      ['Split', mountPageOnSplit, () => useSplitStore().selectedSplit!.seconds],
      ['Track', () => mountPageWithTrack(2), () => usePlayerStore().playheadSeconds()!],
      ['Range', mountPageWithRange, () => usePlayerStore().playheadSeconds()!],
    ] as const

    describe.each(views)('in the %s view', (_, mountView, where) => {
      it('sits just before the volume control in the title row, with the speed on its button and a slider named Play speed that reads it', async () => {
        const wrapper = await mountView()
        const slider = await playSpeedSlider(wrapper)

        expect(titleRowButtons(wrapper).slice(-2)).toEqual(['Reset play speed, now 1.0×', 'Mute'])
        expect(playSpeedButton(wrapper).text()).toBe('1.0×')
        expect(slider.attributes('aria-valuemin')).toBe('0.5')
        expect(slider.attributes('aria-valuemax')).toBe('2')
        expect(slider.attributes('aria-valuenow')).toBe('1')
        expect(slider.attributes('aria-valuetext')).toBe('1.0×')
        const before = Node.DOCUMENT_POSITION_FOLLOWING
        const volume = await volumeSlider(wrapper)
        const reset = playSpeedButton(wrapper).element
        expect(reset.compareDocumentPosition(slider.element)).toBe(before)
        expect(slider.element.compareDocumentPosition(muteButton(wrapper).element)).toBe(before)
        expect(muteButton(wrapper).element.compareDocumentPosition(volume.element)).toBe(before)
      })

      it('steps the speed by 0.1 from the keyboard, in the player', async () => {
        const wrapper = await mountView()
        const slider = await playSpeedSlider(wrapper)

        for (let press = 0; press < 5; press++) {
          await slider.trigger('keydown', { key: 'ArrowRight' })
        }

        expect(usePlayerStore().playSpeed).toBe(1.5)
        expect(slider.attributes('aria-valuetext')).toBe('1.5×')
        expect(playSpeedButton(wrapper).text()).toBe('1.5×')
      })

      it('goes from 0.5× to 2.0× with Home and End', async () => {
        const wrapper = await mountView()
        const slider = await playSpeedSlider(wrapper)

        await slider.trigger('keydown', { key: 'Home' })
        expect(slider.attributes('aria-valuetext')).toBe('0.5×')
        expect(usePlayerStore().playSpeed).toBe(0.5)

        await slider.trigger('keydown', { key: 'End' })
        expect(slider.attributes('aria-valuetext')).toBe('2.0×')
        expect(usePlayerStore().playSpeed).toBe(2)
      })

      it('is reset to 1.0× by its button, which is on even at 1.0×', async () => {
        const wrapper = await mountView()
        const player = usePlayerStore()
        expect(playSpeedButton(wrapper).attributes('disabled')).toBeUndefined()
        player.setPlaySpeed(1.5)
        await wrapper.vm.$nextTick()
        expect(playSpeedButton(wrapper).text()).toBe('1.5×')

        await playSpeedButton(wrapper).trigger('click')

        expect(player.playSpeed).toBe(1)
        expect(playSpeedButton(wrapper).text()).toBe('1.0×')
        const slider = await playSpeedSlider(wrapper)
        expect(slider.attributes('aria-valuetext')).toBe('1.0×')
        expect(playSpeedButton(wrapper).attributes('disabled')).toBeUndefined()
        expect(await tooltipOf(playSpeedButton(wrapper))).toBe('Reset play speed to 1.0×')
      })

      it('leaves the speed and the volume independent', async () => {
        const wrapper = await mountView()
        const player = usePlayerStore()
        const speed = await playSpeedSlider(wrapper)
        const volume = await volumeSlider(wrapper)

        await speed.trigger('keydown', { key: 'End' })
        await volume.trigger('keydown', { key: 'Home' })

        expect(player.playSpeed).toBe(2)
        expect(player.volumeDecibels).toBe(-40)
      })

      it('leaves the view its keys after a drag of the slider and after a click on the button', async () => {
        const wrapper = await mountView()
        const slider = await playSpeedSlider(wrapper)

        await dragSlider(slider.element)
        expect(document.activeElement).not.toBe(slider.element)
        const afterDrag = where()
        pressWhereFocused('ArrowRight')
        expect(where()).toBeGreaterThan(afterDrag)

        await mouseClick(playSpeedButton(wrapper).element)
        expect(document.activeElement).not.toBe(playSpeedButton(wrapper).element)
        const afterClick = where()
        pressWhereFocused('ArrowRight')
        expect(where()).toBeGreaterThan(afterClick)
      })
    })

    it('shows the speed the player already has', async () => {
      usePlayerStore().setPlaySpeed(1.7)

      const wrapper = await mountPageOnSplit()
      const slider = await playSpeedSlider(wrapper)

      expect(slider.attributes('aria-valuetext')).toBe('1.7×')
      expect(playSpeedButton(wrapper).text()).toBe('1.7×')
    })

    it('is one setting for every view: a speed set in one is the speed in the next', async () => {
      const wrapper = await mountPageOnSplit()
      const slider = await playSpeedSlider(wrapper)
      await slider.trigger('keydown', { key: 'Home' })

      await viewOption(wrapper, 'Track').trigger('click')

      const inTrackView = await playSpeedSlider(wrapper)
      expect(inTrackView.attributes('aria-valuetext')).toBe('0.5×')
      expect(playSpeedButton(wrapper).text()).toBe('0.5×')
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
      const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})
      expect(document.activeElement).toBe(document.body)

      pressKey(' ')
      pressKey('Enter')
      await wrapper.vm.$nextTick()

      expect(toggleSpy).toHaveBeenCalledTimes(1)
      expect(split.pendingSplits).toEqual([40])
    })

    it('act in the Range view without its frame ever having the focus', async () => {
      const wrapper = await mountPageWithRange()
      const split = useSplitStore()
      split.placeMark(15)
      await wrapper.vm.$nextTick()
      const player = usePlayerStore()

      pressKey('ArrowLeft')
      pressKey('Enter')
      await wrapper.vm.$nextTick()

      expect(player.playheadSeconds()).toBe(10)
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
      const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})
      pressQuestionMark()
      await flushPromises()

      pressKey(' ')
      pressKey('Enter')

      expect(toggleSpy).not.toHaveBeenCalled()
      expect(useSplitStore().pendingSplits).toEqual([])
      wrapper.unmount()
    })

    it('leave Space and Enter to a button reached with Tab, and give it the arrows', async () => {
      const wrapper = await mountWithMark()
      const split = useSplitStore()
      const player = usePlayerStore()
      const toggleSpy = vi.spyOn(player, 'toggle').mockImplementation(() => {})
      const button = rangeButton(wrapper).element as HTMLElement
      button.focus()

      pressKey(' ', {}, button)
      pressKey('Enter', {}, button)
      expect(toggleSpy).not.toHaveBeenCalled()
      expect(split.pendingSplits).toEqual([])

      pressKey('ArrowRight', {}, button)
      expect(player.playheadSeconds()).toBe(22)
    })

    it('are left to the browser with Ctrl, Cmd or Alt held', async () => {
      const wrapper = await mountWithMark()
      const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

      pressKey(' ', { ctrlKey: true })
      pressKey(' ', { metaKey: true })
      pressKey(' ', { altKey: true })
      await wrapper.vm.$nextTick()

      expect(toggleSpy).not.toHaveBeenCalled()
    })

    describe('after a mouse click', () => {
      it('on Play in the Track view, Space pauses the track and does not press Play again', async () => {
        const wrapper = await mountWithMark()
        const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

        await mouseClick(rangeButton(wrapper).element)
        expect(toggleSpy).toHaveBeenCalledTimes(1)
        pressWhereFocused(' ')

        expect(toggleSpy).toHaveBeenCalledTimes(2)
      })

      it('on Play while a track name is being edited, the field lets go and Space acts on the view', async () => {
        const wrapper = await mountWithMark()
        const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})
        const field = wrapper.get('input').element
        field.focus()
        expect(document.activeElement).toBe(field)

        await mouseClick(rangeButton(wrapper).element)
        pressWhereFocused(' ')

        expect(document.activeElement).not.toBe(field)
        expect(toggleSpy).toHaveBeenCalledTimes(2)
      })

      it('on the Split | Track | Range control, the arrows go to the view now on show', async () => {
        const wrapper = await mountPageWithRange()
        const split = useSplitStore()
        const player = usePlayerStore()

        await mouseClick(viewOption(wrapper, 'Track').element)
        pressWhereFocused('ArrowRight')

        expect(split.view).toBe('track')
        const start = trackExtent(split.selectedTrack!)
        expect(player.playheadSeconds()).toBe(start.startSeconds + 1)
      })

      it('on a track-list row, Space acts on the view on show', async () => {
        const wrapper = await mountWithMark()
        const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})

        await mouseClick(wrapper.get('[aria-label^="Select track 2"]').element)
        pressWhereFocused(' ')

        expect(toggleSpy).toHaveBeenCalledTimes(1)
      })

      it('on a track-strip block, Space acts on the view on show', async () => {
        const wrapper = await mountWithMark()
        const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})
        const block = wrapper
          .findAll('button')
          .find((candidate) => nameOf(candidate).startsWith('02, '))

        await mouseClick(block!.element)
        pressWhereFocused(' ')

        expect(toggleSpy).toHaveBeenCalledTimes(1)
      })

      it('on a drag of the silence threshold, Left moves the playhead and the threshold stays', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()
        const player = usePlayerStore()

        await dragSlider(wrapper.get('[role="slider"][aria-label="Silence threshold"]').element)
        // The drag may have found other splits, so the track is the one the drag left selected.
        const stretch = trackExtent(split.selectedTrack!)
        const threshold = split.silenceThreshold
        pressWhereFocused('ArrowRight')

        expect(player.playheadSeconds()).toBe(stretch.startSeconds + 1)
        expect(split.silenceThreshold).toBe(threshold)
      })
    })

    it('switch to the new view as the view on show changes', async () => {
      const wrapper = await mountWithMark()
      const split = useSplitStore()
      const toggleSpy = vi.spyOn(usePlayerStore(), 'toggle').mockImplementation(() => {})
      split.setRange(10, 20)
      split.showView('range')
      await wrapper.vm.$nextTick()

      pressKey(' ')

      expect(toggleSpy).toHaveBeenCalledExactlyOnceWith()
    })
  })

  describe('the previous and next track keys', () => {
    it('selects the next track on ], marks its row and names it in the title', async () => {
      const wrapper = await mountPageWithTrack(1)

      const event = pressKey(NEXT.key, { code: NEXT.code })
      await wrapper.vm.$nextTick()

      expect(useSplitStore().selectedTrack?.number).toBe(2)
      expect(markedTrack(wrapper)).toContain('Select track 2')
      expect(panelTitle(wrapper)).toBe('02 · 0:00:21.00 – 0:01:11.50')
      expect(event.defaultPrevented).toBe(true)
    })

    it('selects the previous track on [', async () => {
      const wrapper = await mountPageWithTrack(3)

      pressKey(PREVIOUS.key, { code: PREVIOUS.code })
      await wrapper.vm.$nextTick()

      expect(markedTrack(wrapper)).toContain('Select track 2')
      expect(panelTitle(wrapper)).toBe('02 · 0:00:21.00 – 0:01:11.50')
    })

    it('works on a layout where the keys type other characters, by their physical code', async () => {
      const wrapper = await mountPageWithTrack(1)

      // German: the key right of P types ü and, next to it, +; the brackets are AltGr 8 and 9.
      pressKey('+', { code: NEXT.code })
      await wrapper.vm.$nextTick()

      expect(markedTrack(wrapper)).toContain('Select track 2')
    })

    it('leave Shift with the physical key that types ? to the shortcuts dialog, as on Dvorak', async () => {
      const wrapper = await mountPageWithTrack(2)

      pressKey('?', { code: PREVIOUS.code, shiftKey: true })
      await flushPromises()

      expect(shortcutsDialog()).not.toBeNull()
      expect(useSplitStore().selectedTrack?.number).toBe(2)
      wrapper.unmount()
    })

    it('select the splits by confidence with Shift: } the first, { from none the last', async () => {
      const wrapper = await mountPageWithTrack(1)
      const split = useSplitStore()
      // The second gap is the longer one, so the least deep split is the first.
      const [first, last] = split.splits

      pressKey('}', { code: 'BracketRight', shiftKey: true })
      await wrapper.vm.$nextTick()
      expect(split.selectedSplit?.id).toBe(first?.id)
      expect(split.view).toBe('split')

      pressKey('}', { code: 'BracketRight', shiftKey: true })
      expect(split.selectedSplit?.id).toBe(last?.id)

      pressKey('{', { code: 'BracketLeft', shiftKey: true })
      expect(split.selectedSplit?.id).toBe(first?.id)
      wrapper.unmount()
    })

    it('leave { and } to a dialog, a text field and a held key', async () => {
      const wrapper = await mountPageWithTrack(1)
      const split = useSplitStore()

      pressKey('}', { code: 'BracketRight', shiftKey: true, repeat: true })
      pressKey('}', { code: 'BracketRight', shiftKey: true }, wrapper.get('input').element)

      expect(split.selectedSplit).toBeNull()
      wrapper.unmount()
    })

    it('marks the new track’s block in the track strip', async () => {
      const wrapper = await mountPageWithTrack(1)
      const strip = wrapper.get('ol[aria-label="Tracks"]')

      pressKey(NEXT.key, { code: NEXT.code })
      await wrapper.vm.$nextTick()

      const marked = strip.findAll('li[aria-current="true"]')
      expect(marked).toHaveLength(1)
      expect(marked[0]!.get('button').attributes('aria-label')).toMatch(/^02, /)
    })

    it('lets go of the old track’s mark, as a click does', async () => {
      const wrapper = await mountWithMark()
      const split = useSplitStore()
      expect(split.trackMarkSeconds).toBe(40)

      pressKey(NEXT.key, { code: NEXT.code })
      await wrapper.vm.$nextTick()

      expect(split.trackMarkSeconds).toBeNull()
    })

    describe('at the first and last track', () => {
      it('do nothing, and the key is left to the browser', async () => {
        const wrapper = await mountPageWithTrack(1)
        const split = useSplitStore()

        const before = pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()
        expect(split.selectedTrack?.number).toBe(1)
        expect(before.defaultPrevented).toBe(false)

        await wrapper.get('[aria-label^="Select track 3"]').trigger('click')
        const after = pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()
        expect(split.selectedTrack?.number).toBe(3)
        expect(after.defaultPrevented).toBe(false)
      })
    })

    describe('are left alone', () => {
      it('with Shift held, which is the walk by confidence’s and selects a split instead', async () => {
        const wrapper = await mountPageWithTrack(1)

        pressKey('}', { code: NEXT.code, shiftKey: true })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedTrack).toBeNull()
        expect(useSplitStore().selectedSplit).not.toBeNull()
      })

      it('when the key is held down, which steps once', async () => {
        const wrapper = await mountPageWithTrack(1)

        pressKey(NEXT.key, { code: NEXT.code })
        pressKey(NEXT.key, { code: NEXT.code, repeat: true })
        pressKey(NEXT.key, { code: NEXT.code, repeat: true })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedTrack?.number).toBe(2)
      })

      it('in a track name', async () => {
        const wrapper = await mountPageWithTrack(1)
        const field = wrapper.get('input[aria-label="Name of track 1"]')

        const event = pressKey(NEXT.key, { code: NEXT.code }, field.element)
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedTrack?.number).toBe(1)
        expect(event.defaultPrevented).toBe(false)
      })

      it('while a dialog is open', async () => {
        const wrapper = await mountPageWithTrack(1)
        pressQuestionMark()
        await flushPromises()
        expect(shortcutsDialog()).not.toBeNull()

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedTrack?.number).toBe(1)
      })

      it('in the Range view', async () => {
        const wrapper = await mountWithMark()
        const split = useSplitStore()
        split.setRange(10, 20)
        await wrapper.vm.$nextTick()
        expect(split.view).toBe('range')
        expect(split.selectedTrack?.number).toBe(2)

        const next = pressKey(NEXT.key, { code: NEXT.code })
        const previous = pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(split.selectedTrack?.number).toBe(2)
        expect(next.defaultPrevented).toBe(false)
        expect(previous.defaultPrevented).toBe(false)
      })

      it.each([{ altKey: true }, { ctrlKey: true }, { metaKey: true }])(
        'with %o held, which stays with the browser',
        async (modifier) => {
          const wrapper = await mountPageWithTrack(2)

          const next = pressKey(NEXT.key, { code: NEXT.code, ...modifier })
          const previous = pressKey(PREVIOUS.key, { code: PREVIOUS.code, ...modifier })
          await wrapper.vm.$nextTick()

          expect(useSplitStore().selectedTrack?.number).toBe(2)
          expect(markedTrack(wrapper)).toContain('Select track 2')
          expect(next.defaultPrevented).toBe(false)
          expect(previous.defaultPrevented).toBe(false)
        },
      )
    })

    describe('on a track with pending splits', () => {
      it('open the discard question and change nothing yet, and the key is left to the browser', async () => {
        const { split, wrapper } = await mountWithPending()

        const event = pressKey(NEXT.key, { code: NEXT.code })
        await flushPromises()

        expect(question()?.textContent).toContain('Discard 2 pending splits?')
        expect(split.selectedTrack?.number).toBe(2)
        expect(split.pendingSplits).toEqual([30, 50])
        expect(event.defaultPrevented).toBe(false)
        wrapper.unmount()
      })

      it('select the next track after "Apply first", with no pending split left selected', async () => {
        const { split } = await mountWithPending()
        split.selectPendingSplit(30)
        pressKey(NEXT.key, { code: NEXT.code })
        await flushPromises()

        await clickElement(questionButton('Apply first'))

        expect(split.splits.map((point) => point.seconds)).toEqual([21, 30, 50, 71.5])
        expect(split.selectedTrack?.startSeconds).toBe(71.5)
        expect(split.selectedPendingSplit).toBeNull()
      })

      it('select the previous track after "Discard", with no pending split left selected', async () => {
        const { split } = await mountWithPending()
        split.selectPendingSplit(30)
        pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await flushPromises()

        await clickElement(questionButton('Discard'))

        expect(split.splits).toHaveLength(2)
        expect(split.selectedTrack?.number).toBe(1)
        expect(split.pendingSplits).toEqual([])
        expect(split.selectedPendingSplit).toBeNull()
      })

      it('stay on the track, with its pending splits, when cancelled', async () => {
        const { split } = await mountWithPending()
        split.selectPendingSplit(30)
        pressKey(NEXT.key, { code: NEXT.code })
        await flushPromises()

        await clickElement(questionButton('Cancel'))

        expect(split.selectedTrack?.number).toBe(2)
        expect(split.pendingSplits).toEqual([30, 50])
        expect(split.selectedPendingSplit).toBe(30)
      })
    })

    describe('carrying the sound over', () => {
      // Track 2 runs 21 s to 71.5 s and track 3 71.5 s to 100 s.

      it.each(['playing', 'loading'] as const)(
        'play the new track from its start when the track was %s',
        async (status) => {
          const wrapper = await mountPageWithTrack(2)
          const toggleSpy = spyOnToggle()
          usePlayerStore().status = status

          pressKey(NEXT.key, { code: NEXT.code })
          await wrapper.vm.$nextTick()

          expect(toggleSpy).toHaveBeenCalledExactlyOnceWith()
        },
      )

      it('play the previous track from its start on [', async () => {
        const wrapper = await mountPageWithTrack(2)
        const toggleSpy = spyOnToggle()
        usePlayerStore().status = 'playing'

        pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(toggleSpy).toHaveBeenCalledExactlyOnceWith()
      })

      it.each(['paused', 'idle'] as const)(
        'leave the new track resting at its start, with nothing playing, when the track was %s',
        async (status) => {
          const wrapper = await mountPageWithTrack(2)
          const toggleSpy = spyOnToggle()
          const player = usePlayerStore()
          // The player rests part-way along track 2, as after a seek: a step must not carry that on.
          player.seek(40)
          player.status = status
          await wrapper.vm.$nextTick()
          const playhead = () =>
            wrapper.get('[aria-label="Playhead in the track"]').attributes('aria-valuenow')
          expect(playhead()).toBe('40')

          pressKey(NEXT.key, { code: NEXT.code })
          await wrapper.vm.$nextTick()

          expect(toggleSpy).not.toHaveBeenCalled()
          expect(player.status).toBe('idle')
          expect(playhead()).toBe('71.5')
        },
      )

      it('carry on untouched at ] on the last track', async () => {
        const wrapper = await mountPageWithTrack(3)
        const toggleSpy = spyOnToggle()
        const player = usePlayerStore()
        player.status = 'playing'

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(toggleSpy).not.toHaveBeenCalled()
        expect(player.status).toBe('playing')
      })

      it('carry on untouched at [ on the first track', async () => {
        const wrapper = await mountPageWithTrack(1)
        const toggleSpy = spyOnToggle()
        const player = usePlayerStore()
        player.status = 'playing'

        pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(toggleSpy).not.toHaveBeenCalled()
        expect(player.status).toBe('playing')
      })

      it('neither step nor play on a held ], a repeat', async () => {
        const wrapper = await mountPageWithTrack(2)
        const toggleSpy = spyOnToggle()
        const player = usePlayerStore()
        player.status = 'playing'

        pressKey(NEXT.key, { code: NEXT.code, repeat: true })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedTrack?.number).toBe(2)
        expect(toggleSpy).not.toHaveBeenCalled()
        expect(player.status).toBe('playing')
      })

      it.each(['Apply first', 'Discard'])(
        'play nothing while the discard question is open, and the new track rests after "%s"',
        async (answer) => {
          const { split } = await mountWithPending()
          const toggleSpy = spyOnToggle()
          const player = usePlayerStore()
          player.status = 'playing'

          pressKey(NEXT.key, { code: NEXT.code })
          await flushPromises()
          expect(question()).not.toBeNull()
          expect(toggleSpy).not.toHaveBeenCalled()
          expect(player.status).toBe('playing')

          await clickElement(questionButton(answer))

          expect(split.selectedTrack?.startSeconds).toBe(71.5)
          expect(toggleSpy).not.toHaveBeenCalled()
          expect(player.status).toBe('idle')
        },
      )

      it('leave the sound alone when the question is cancelled', async () => {
        const { split } = await mountWithPending()
        const toggleSpy = spyOnToggle()
        const player = usePlayerStore()
        player.status = 'playing'
        pressKey(NEXT.key, { code: NEXT.code })
        await flushPromises()

        await clickElement(questionButton('Cancel'))

        expect(split.selectedTrack?.number).toBe(2)
        expect(toggleSpy).not.toHaveBeenCalled()
        expect(player.status).toBe('playing')
      })
    })

    it('are listed in the shortcuts dialog’s Track view section', async () => {
      await mountPageWithTrack(2)

      pressQuestionMark()
      await flushPromises()

      const section = [...(shortcutsDialog()?.querySelectorAll('section') ?? [])].find(
        (candidate) => candidate.querySelector('h3')?.textContent === 'Track view',
      )
      const rows = [...(section?.querySelectorAll('dt') ?? [])].map((term) => [
        term.textContent,
        term.nextElementSibling?.textContent,
      ])
      expect(rows).toContainEqual([
        '[ / ]',
        'Select the previous or next track; a playing track plays the new one from its start',
      ])
    })
  })

  describe('the previous and next split keys', () => {
    // The splits are at 21 s and 71.5 s; the page opens on split 1 in the Split view.

    it('selects the next split on ], marks its row, centres the window and titles it', async () => {
      const wrapper = await mountPageOnSplit()
      const split = useSplitStore()
      expect(markedSplit(wrapper)).toContain('Split 1')

      const event = pressKey(NEXT.key, { code: NEXT.code })
      await wrapper.vm.$nextTick()

      expect(split.selectedSplit?.seconds).toBe(71.5)
      expect(split.zoomCentreSeconds).toBe(71.5)
      expect(markedSplit(wrapper)).toContain('Split 2')
      expect(panelTitle(wrapper)).toBe('0:01:11.50')
      expect(event.defaultPrevented).toBe(true)
    })

    it('selects the previous split on [', async () => {
      const wrapper = await mountPageOnSplit()
      const split = useSplitStore()
      await selectSecondSplit(wrapper)
      expect(panelTitle(wrapper)).toBe('0:01:11.50')

      const event = pressKey(PREVIOUS.key, { code: PREVIOUS.code })
      await wrapper.vm.$nextTick()

      expect(split.zoomCentreSeconds).toBe(21)
      expect(markedSplit(wrapper)).toContain('Split 1')
      expect(panelTitle(wrapper)).toBe('0:00:21.00')
      expect(event.defaultPrevented).toBe(true)
    })

    it('works on a layout where the keys type other characters, by their physical code', async () => {
      const wrapper = await mountPageOnSplit()

      pressKey('+', { code: NEXT.code })
      await wrapper.vm.$nextTick()

      expect(markedSplit(wrapper)).toContain('Split 2')
    })

    describe('at the first and last split', () => {
      it('do nothing, and the key is left to the browser', async () => {
        const wrapper = await mountPageOnSplit()
        const split = useSplitStore()

        const before = pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()
        expect(split.selectedSplit?.seconds).toBe(21)
        expect(before.defaultPrevented).toBe(false)

        await selectSecondSplit(wrapper)
        const after = pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()
        expect(split.selectedSplit?.seconds).toBe(71.5)
        expect(split.zoomCentreSeconds).toBe(71.5)
        expect(after.defaultPrevented).toBe(false)
      })
    })

    describe('are left alone', () => {
      it('with Shift held, which leaves ? on Dvorak to the shortcuts dialog', async () => {
        const wrapper = await mountPageOnSplit()

        const event = pressKey('?', { code: NEXT.code, shiftKey: true })
        await flushPromises()

        expect(useSplitStore().selectedSplit?.seconds).toBe(21)
        expect(shortcutsDialog()).not.toBeNull()
        expect(event.defaultPrevented).toBe(true)
        wrapper.unmount()
      })

      it('when the key is held down, which steps once', async () => {
        const wrapper = await mountPageOnSplit()
        const split = useSplitStore()

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()
        split.selectSplit(split.splits[0]!.id)
        await wrapper.vm.$nextTick()
        pressKey(NEXT.key, { code: NEXT.code, repeat: true })
        pressKey(NEXT.key, { code: NEXT.code, repeat: true })
        await wrapper.vm.$nextTick()

        expect(split.selectedSplit?.seconds).toBe(21)
      })

      it('in a track name', async () => {
        const wrapper = await mountPageOnSplit()
        const field = wrapper.get('input[aria-label="Name of track 1"]')

        const event = pressKey(NEXT.key, { code: NEXT.code }, field.element)
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(21)
        expect(event.defaultPrevented).toBe(false)
      })

      it('while a dialog is open', async () => {
        const wrapper = await mountPageOnSplit()
        pressQuestionMark()
        await flushPromises()
        expect(shortcutsDialog()).not.toBeNull()

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(21)
      })
    })

    describe('with no split selected', () => {
      it('selects the first split after the zoom window’s centre on ], and centres on it', async () => {
        const wrapper = await mountAtCentre(10)
        const split = useSplitStore()

        const event = pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(split.selectedSplit?.seconds).toBe(21)
        expect(split.zoomCentreSeconds).toBe(21)
        expect(markedSplit(wrapper)).toContain('Split 1')
        expect(panelTitle(wrapper)).toBe('0:00:21.00')
        expect(event.defaultPrevented).toBe(true)
      })

      it('selects the last split before the centre on [', async () => {
        const wrapper = await mountAtCentre(80)
        const split = useSplitStore()

        const event = pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(split.selectedSplit?.seconds).toBe(71.5)
        expect(split.zoomCentreSeconds).toBe(71.5)
        expect(markedSplit(wrapper)).toContain('Split 2')
        expect(event.defaultPrevented).toBe(true)
      })

      it.each([
        ['] to the one after', NEXT, 71.5],
        ['[ to the one before', PREVIOUS, 21],
      ])('steps from a centre between two splits with %s', async (_name, key, seconds) => {
        const wrapper = await mountAtCentre(46)

        pressKey(key.key, { code: key.code })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(seconds)
      })

      it('looks strictly past a centre that lies on a split, so ] skips it', async () => {
        const wrapper = await mountAtCentre(21)

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(71.5)
      })

      it('looks strictly before a centre that lies on a split, so [ finds none', async () => {
        const wrapper = await mountAtCentre(21)

        const event = pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit).toBeNull()
        expect(event.defaultPrevented).toBe(false)
      })

      it.each([
        ['] after the last split', NEXT, 90],
        ['[ before the first split', PREVIOUS, 10],
      ])('do nothing, and the key is left to the browser, at %s', async (_name, key, seconds) => {
        const wrapper = await mountAtCentre(seconds)
        const split = useSplitStore()

        const event = pressKey(key.key, { code: key.code })
        await wrapper.vm.$nextTick()

        expect(split.selectedSplit).toBeNull()
        expect(split.zoomCentreSeconds).toBe(seconds)
        expect(event.defaultPrevented).toBe(false)
      })

      it('do nothing in a source file with no splits', async () => {
        const wrapper = await mountAtCentre(46)
        const split = useSplitStore()
        const ids = split.splits.map((point) => point.id)
        for (const id of ids) split.deleteSplit(id)
        split.moveZoomTo(46)
        await wrapper.vm.$nextTick()
        expect(split.splits).toHaveLength(0)

        const next = pressKey(NEXT.key, { code: NEXT.code })
        const previous = pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(split.selectedSplit).toBeNull()
        expect(split.zoomCentreSeconds).toBe(46)
        expect(next.defaultPrevented).toBe(false)
        expect(previous.defaultPrevented).toBe(false)
      })
    })

    it.each([{ altKey: true }, { ctrlKey: true }, { metaKey: true }])(
      'stay with the browser, and change nothing, with %o held',
      async (modifier) => {
        const wrapper = await mountPageOnSplit()

        const next = pressKey(NEXT.key, { code: NEXT.code, ...modifier })
        const previous = pressKey(PREVIOUS.key, { code: PREVIOUS.code, ...modifier })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(21)
        expect(markedSplit(wrapper)).toContain('Split 1')
        expect(next.defaultPrevented).toBe(false)
        expect(previous.defaultPrevented).toBe(false)
      },
    )

    describe('carrying the audition over', () => {
      it.each(['playing', 'loading'] as const)(
        'start it again across the new split when it was %s',
        async (status) => {
          const wrapper = await mountPageOnSplit()
          const toggle = spyOnToggle()
          usePlayerStore().status = status

          pressKey(NEXT.key, { code: NEXT.code })
          await wrapper.vm.$nextTick()

          expect(useSplitStore().selectedSplit?.seconds).toBe(71.5)
          expect(toggle).toHaveBeenCalledTimes(1)
          // The old clip is let go of by the step, so the new press starts rather than stops.
          expect(usePlayerStore().status).toBe('idle')
        },
      )

      it('start the previous split on [', async () => {
        const wrapper = await mountPageOnSplit()
        const split = useSplitStore()
        await selectSecondSplit(wrapper)
        const toggle = spyOnToggle()
        usePlayerStore().status = 'playing'

        pressKey(PREVIOUS.key, { code: PREVIOUS.code })
        await wrapper.vm.$nextTick()

        expect(split.selectedSplit?.seconds).toBe(21)
        expect(toggle).toHaveBeenCalledTimes(1)
      })

      it('play nothing when none was on', async () => {
        const wrapper = await mountPageOnSplit()
        const toggle = spyOnToggle()

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(71.5)
        expect(toggle).not.toHaveBeenCalled()
        expect(usePlayerStore().status).toBe('idle')
      })

      it('let go of a paused one, which rests at the start of the new split’s 8 s', async () => {
        const wrapper = await mountPageOnSplit()
        const toggle = spyOnToggle()
        const player = usePlayerStore()
        player.status = 'paused'

        pressKey(NEXT.key, { code: NEXT.code })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(71.5)
        expect(toggle).not.toHaveBeenCalled()
        expect(player.status).toBe('idle')
        expect(player.playheadSeconds()).toBe(67.5)
      })

      it.each([
        ['[ on the first split', PREVIOUS, 0],
        ['] on the last split', NEXT, 1],
      ])('carry on untouched at %s', async (_name, key, index) => {
        const wrapper = await mountPageOnSplit()
        const split = useSplitStore()
        split.selectSplit(split.splits[index]!.id)
        await wrapper.vm.$nextTick()
        const toggle = spyOnToggle()
        const player = usePlayerStore()
        player.status = 'playing'

        pressKey(key.key, { code: key.code })
        await wrapper.vm.$nextTick()

        expect(toggle).not.toHaveBeenCalled()
        expect(player.status).toBe('playing')
      })

      it('neither step nor play on a held ], a repeat', async () => {
        const wrapper = await mountPageOnSplit()
        const toggle = spyOnToggle()
        const player = usePlayerStore()
        player.status = 'playing'

        pressKey(NEXT.key, { code: NEXT.code, repeat: true })
        await wrapper.vm.$nextTick()

        expect(useSplitStore().selectedSplit?.seconds).toBe(21)
        expect(toggle).not.toHaveBeenCalled()
        expect(player.status).toBe('playing')
      })
    })

    it('are listed in the shortcuts dialog’s Split view section', async () => {
      await mountPageOnSplit()

      pressQuestionMark()
      await flushPromises()

      const section = [...(shortcutsDialog()?.querySelectorAll('section') ?? [])].find(
        (candidate) => candidate.querySelector('h3')?.textContent === 'Split view',
      )
      const rows = [...(section?.querySelectorAll('dt') ?? [])].map((term) => [
        term.textContent,
        term.nextElementSibling?.textContent,
      ])
      expect(rows).toContainEqual([
        '[ / ]',
        'Select the previous or next split; a playing audition plays on from the new split',
      ])
    })
  })
})
