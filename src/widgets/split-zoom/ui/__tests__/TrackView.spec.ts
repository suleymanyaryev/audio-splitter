import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { nextTick } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { usePlayerStore } from '../../model/player.ts'
import TrackView from '../TrackView.vue'

enableAutoUnmount(afterEach)

// The worker is replaced by an answer: the third track repeats the first.
vi.mock('@/entities/split/api/find-matches-client.ts', () => ({
  findMatchesInWorker: () =>
    Promise.resolve([
      {
        later: 2,
        earlier: 0,
        kind: 'full',
        laterShared: { from: 0, to: 30 },
        earlierShared: { from: 0, to: 30 },
      },
    ]),
}))

/*
100 s at 50 ms per window: loud, a 2 s silence from 20 s, loud, a 2 s silence from 70.5 s, loud. The
splits are at 21 s and 71.5 s, so the second track runs from 21 s to 71.5 s, 50.5 s.
*/
function curveWithTwoGaps() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 400, 440)
  curve.fill(-70, 1410, 1450)
  return curve
}

/*
The player's toggle, replaced, and its carryOver with it: a sound that was on is played on through
the spy, as the real carryOver does through the real toggle (the player spec covers that).
*/
function spyOnToggle(player: ReturnType<typeof usePlayerStore>) {
  const toggle = vi.spyOn(player, 'toggle').mockImplementation(() => {})
  vi.spyOn(player, 'carryOver').mockImplementation((isChanged) => {
    const wasOn = player.isActive
    const hasChanged = isChanged()
    if (wasOn && hasChanged) player.toggle()
    return hasChanged
  })
  return toggle
}

// The second track is selected before the view mounts.
function setup() {
  useSourceFileStore().durationSeconds = 100
  const split = useSplitStore()
  split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
  split.findSplits()
  split.selectTrack(split.tracks[1]!)
  const player = usePlayerStore()
  const toggleSpy = spyOnToggle(player)
  const backToStartSpy = vi.spyOn(player, 'backToStart').mockImplementation(() => {})
  const wrapper = mount(TrackView)
  return { player, split, toggleSpy, backToStartSpy, wrapper }
}

// 107 s in three tracks of 35 s or more: the third repeats the first, which the worker's answer says. The third is selected.
async function setupDuplicate() {
  useSourceFileStore().durationSeconds = 107
  const split = useSplitStore()
  const curve = new Float32Array(2140).fill(-10)
  curve.fill(-70, 700, 740)
  curve.fill(-70, 1440, 1480)
  split.open(curve, { windowSeconds: 0.05, durationSeconds: 107 })
  split.findSplits()
  await split.findDuplicates()
  split.selectTrack(split.tracks[2]!)
  const player = usePlayerStore()
  const toggleSpy = spyOnToggle(player)
  const wrapper = mount(TrackView)
  return { player, split, toggleSpy, wrapper }
}

// Keys belong to the page: the view hears them wherever the focus is.
async function press(init: KeyboardEventInit) {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  await nextTick()
}

/*
jsdom has no PointerEvent: a mouse event of that name, with the pointer's id. The main button is
held from the press to the release, as a move during a drag reports it.
*/
async function pointer(
  view: { element: Element },
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
) {
  const buttons = type === 'pointerup' ? 0 : 1
  const event = new MouseEvent(type, { clientX, buttons, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  view.element.dispatchEvent(event)
  await nextTick()
}

async function doubleClick(view: { element: Element }, clientX: number) {
  view.element.dispatchEvent(new MouseEvent('dblclick', { clientX, bubbles: true }))
  await nextTick()
}

// The view is 1,000 px wide, from the page's left edge: the track's 50.5 s is 19.8 px a second.
function measured(wrapper: ReturnType<typeof setup>['wrapper']) {
  const view = wrapper.get('[role="slider"]')
  vi.spyOn(view.element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 1000,
  } as DOMRect)
  view.element.setPointerCapture = vi.fn()
  return view
}

describe('TrackView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is a slider on the playhead, not a tab stop, with the track’s waveform in it', () => {
    const { wrapper } = setup()

    const view = wrapper.get('[role="slider"]')

    expect(view.attributes('aria-label')).toBe('Playhead in the track')
    expect(view.attributes('tabindex')).toBe('-1')
    expect(view.find('canvas[aria-label="Waveform of the track"]').exists()).toBe(true)
  })

  describe('ARIA', () => {
    it('spans the track, with the playhead at its start for a new track', () => {
      const { wrapper } = setup()
      const view = wrapper.get('[role="slider"]')

      expect(view.attributes('aria-valuemin')).toBe('21')
      expect(view.attributes('aria-valuemax')).toBe('71.5')
      expect(view.attributes('aria-valuenow')).toBe('21')
      expect(view.attributes('aria-valuetext')).toBe('0:00:21.00')
    })

    it('follows the playhead, with hundredths', async () => {
      const { player, wrapper } = setup()

      player.seek(30.256)
      await nextTick()

      const view = wrapper.get('[role="slider"]')
      expect(view.attributes('aria-valuenow')).toBe('30.256')
      expect(view.attributes('aria-valuetext')).toBe('0:00:30.26')
    })

    it('ends at the end of a track longer than 10 min, which the player plays in full', () => {
      useSourceFileStore().durationSeconds = 1000
      const split = useSplitStore()
      split.open(new Float32Array(20_000).fill(-10), {
        windowSeconds: 0.05,
        durationSeconds: 1000,
      })
      split.selectTrack(split.tracks[0]!)

      const wrapper = mount(TrackView)

      expect(wrapper.get('[role="slider"]').attributes('aria-valuemax')).toBe('1000')
    })
  })

  describe('a key the view acts on', () => {
    it('is reported, and a key it leaves alone is not', async () => {
      const { wrapper } = setup()

      await press({ key: 'ArrowRight' })
      await press({ key: 'q' })
      await press({ key: 'Escape' })

      expect(wrapper.emitted('acted')).toHaveLength(1)
    })

    it('is not Enter with no mark, which has nothing to add a pending split at', async () => {
      const { wrapper } = setup()
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(wrapper.emitted('acted')).toBeUndefined()
      expect(event.defaultPrevented).toBe(false)
    })
  })

  describe('Left and Right', () => {
    it('move the playhead 1 s, and 10 s with Shift', async () => {
      const { player } = setup()

      await press({ key: 'ArrowRight' })
      expect(player.playheadSeconds()).toBe(22)

      await press({ key: 'ArrowRight', shiftKey: true })
      expect(player.playheadSeconds()).toBe(32)

      await press({ key: 'ArrowLeft' })
      expect(player.playheadSeconds()).toBe(31)

      await press({ key: 'ArrowLeft', shiftKey: true })
      expect(player.playheadSeconds()).toBe(21)
    })

    it('hold the playhead inside the track, and are not a page scroll', async () => {
      const { player } = setup()
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
      })

      document.dispatchEvent(event)
      expect(player.playheadSeconds()).toBe(21)
      expect(event.defaultPrevented).toBe(true)

      await press({ key: 'ArrowRight', shiftKey: true })
      await press({ key: 'ArrowRight', shiftKey: true })
      await press({ key: 'ArrowRight', shiftKey: true })
      await press({ key: 'ArrowRight', shiftKey: true })
      await press({ key: 'ArrowRight', shiftKey: true })
      await press({ key: 'ArrowRight', shiftKey: true })
      expect(player.playheadSeconds()).toBe(71.5)
    })

    it('leave playback and the splits alone', async () => {
      const { split, toggleSpy } = setup()

      await press({ key: 'ArrowRight' })

      expect(toggleSpy).not.toHaveBeenCalled()
      expect(split.splits).toHaveLength(2)
      expect(split.selectedTrack?.number).toBe(2)
    })
  })

  describe('a key with Ctrl, Cmd or Alt held', () => {
    it('is left to the browser', () => {
      const { player, toggleSpy, backToStartSpy } = setup()

      for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
        for (const key of ['ArrowLeft', 'ArrowRight', 'Home', ' ']) {
          const event = new KeyboardEvent('keydown', {
            key,
            [modifier]: true,
            bubbles: true,
            cancelable: true,
          })
          document.dispatchEvent(event)
          expect(event.defaultPrevented).toBe(false)
        }
      }

      expect(player.playheadSeconds()).toBe(21)
      expect(toggleSpy).not.toHaveBeenCalled()
      expect(backToStartSpy).not.toHaveBeenCalled()
    })
  })

  describe('Space', () => {
    it('plays or pauses the track, and is not a page scroll', () => {
      const { toggleSpy } = setup()
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(toggleSpy).toHaveBeenCalledExactlyOnceWith()
      expect(event.defaultPrevented).toBe(true)
    })

    it('ignores the auto-repeat of a held key', async () => {
      const { toggleSpy } = setup()

      await press({ key: ' ' })
      await press({ key: ' ', repeat: true })
      await press({ key: ' ', repeat: true })

      expect(toggleSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Home', () => {
    it('moves the playhead to the track’s start, and is not a page scroll', () => {
      const { backToStartSpy } = setup()
      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(backToStartSpy).toHaveBeenCalledExactlyOnceWith()
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('C', () => {
    it('swaps to the same moment in the matched track, and is not a page action', async () => {
      const { player, split, toggleSpy } = await setupDuplicate()
      player.seek(83)
      const event = new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true })

      document.dispatchEvent(event)
      await nextTick()

      expect(split.selectedTrack?.number).toBe(1)
      expect(player.playheadSeconds()).toBe(10)
      expect(event.defaultPrevented).toBe(true)
      // It was not playing, so it stays paused at the new playhead.
      expect(toggleSpy).not.toHaveBeenCalled()
    })

    it('plays on from there when the track was playing', async () => {
      const { player, split, toggleSpy } = await setupDuplicate()
      // A playing track's playhead is the sound's, which a spec has none of: it is at 83 s.
      const heard = player.playheadSeconds.bind(player)
      vi.spyOn(player, 'playheadSeconds').mockImplementation(() =>
        split.selectedTrack?.number === 3 ? 83 : heard(),
      )
      player.status = 'playing'

      await press({ key: 'C' })

      expect(split.selectedTrack?.number).toBe(1)
      expect(player.playheadSeconds()).toBe(10)
      expect(toggleSpy).toHaveBeenCalledExactlyOnceWith()
    })

    it('goes back to the track it came from when pressed on the kept copy', async () => {
      const { player, split } = await setupDuplicate()
      player.seek(83)
      await press({ key: 'c' })

      await press({ key: 'c' })

      expect(split.selectedTrack?.number).toBe(3)
      expect(player.playheadSeconds()).toBe(83)
    })

    it('is left alone on a track with no match, which sounds and selects nothing', async () => {
      const { split, toggleSpy, wrapper } = await setupDuplicate()
      split.selectTrack(split.tracks[1]!)
      const event = new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true })

      document.dispatchEvent(event)
      await nextTick()

      expect(split.selectedTrack?.number).toBe(2)
      expect(event.defaultPrevented).toBe(false)
      expect(toggleSpy).not.toHaveBeenCalled()
      expect(wrapper.emitted('acted')).toBeUndefined()
    })

    it('is left alone when held on a track with no match', async () => {
      const { split, wrapper } = await setupDuplicate()
      split.selectTrack(split.tracks[1]!)

      await press({ key: 'c', repeat: true })

      expect(split.selectedTrack?.number).toBe(2)
      expect(wrapper.emitted('acted')).toBeUndefined()
    })

    it('is reported to the page once, and a held key swaps once', async () => {
      const { split, wrapper } = await setupDuplicate()

      await press({ key: 'c' })
      await press({ key: 'c', repeat: true })

      expect(split.selectedTrack?.number).toBe(1)
      expect(wrapper.emitted('acted')).toHaveLength(2)
    })

    it('is left alone with Shift, Ctrl, Cmd or Alt held', async () => {
      const { split } = await setupDuplicate()

      for (const modifier of ['shiftKey', 'ctrlKey', 'metaKey', 'altKey']) {
        await press({ key: 'c', [modifier]: true })
        expect(split.selectedTrack?.number).toBe(3)
      }
    })
  })

  describe('X', () => {
    it('leaves the selected track out, and brings it back, and is not a page action', async () => {
      const { split } = setup()
      const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true })

      document.dispatchEvent(event)
      await nextTick()

      expect(split.tracks.map((track) => track.isLeftOut)).toEqual([false, true, false])
      expect(event.defaultPrevented).toBe(true)

      await press({ key: 'X' })
      expect(split.tracks.map((track) => track.isLeftOut)).toEqual([false, false, false])
    })

    it('dismisses the match of a duplicate instead of leaving it out by hand', async () => {
      useSourceFileStore().durationSeconds = 107
      const split = useSplitStore()
      // 107 s: three loud stretches of 35 s with a 2 s silence between each two.
      const curve = new Float32Array(2140).fill(-10)
      curve.fill(-70, 700, 740)
      curve.fill(-70, 1440, 1480)
      split.open(curve, { windowSeconds: 0.05, durationSeconds: 107 })
      split.findSplits()
      await split.findDuplicates()
      split.selectTrack(split.tracks[2]!)
      mount(TrackView)
      expect(split.tracks[2]?.inclusion).toBe('duplicate')

      await press({ key: 'x' })

      expect(split.tracks[2]).toMatchObject({ inclusion: 'included', isLeftOut: false })
      expect(split.tracks[2]?.matches).toEqual([])
      expect(split.editCount).toBe(1)

      await press({ key: 'x' })
      expect(split.tracks[2]).toMatchObject({ inclusion: 'by-hand', isLeftOut: true })
    })

    it('is reported to the page, and leaves the splits, the selection and the sound alone', async () => {
      const { split, wrapper, toggleSpy } = setup()
      const before = split.splits.map((point) => point.seconds)

      await press({ key: 'x' })

      expect(wrapper.emitted('acted')).toHaveLength(1)
      expect(split.splits.map((point) => point.seconds)).toEqual(before)
      expect(split.selectedTrack?.number).toBe(2)
      expect(toggleSpy).not.toHaveBeenCalled()
    })

    it('ignores the auto-repeat of a held key, so one press toggles once', async () => {
      const { split } = setup()

      await press({ key: 'x' })
      await press({ key: 'x', repeat: true })
      await press({ key: 'x', repeat: true })

      expect(split.selectedTrack?.isLeftOut).toBe(true)
    })

    it('is left to the browser with Shift, Ctrl, Cmd or Alt held', () => {
      const { split } = setup()

      for (const modifier of ['shiftKey', 'ctrlKey', 'metaKey', 'altKey']) {
        const event = new KeyboardEvent('keydown', {
          key: 'x',
          [modifier]: true,
          bubbles: true,
          cancelable: true,
        })
        document.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(false)
      }

      expect(split.selectedTrack?.isLeftOut).toBe(false)
    })

    it('does nothing while the focus is in a text field', () => {
      const { split } = setup()
      const field = document.createElement('input')
      document.body.append(field)
      field.focus()

      field.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }),
      )

      expect(split.selectedTrack?.isLeftOut).toBe(false)
      field.remove()
    })

    it('does nothing while a dialog is open', () => {
      const { split } = setup()
      const dialog = document.createElement('div')
      dialog.setAttribute('role', 'dialog')
      document.body.append(dialog)

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }),
      )

      expect(split.selectedTrack?.isLeftOut).toBe(false)
      dialog.remove()
    })

    it('leaves the first track out too, which starts with the file', async () => {
      const { split } = setup()
      split.selectTrack(split.tracks[0]!)

      await press({ key: 'x' })

      expect(split.tracks[0]?.isLeftOut).toBe(true)
    })
  })

  describe('Enter', () => {
    it('adds a pending split at the mark and selects it, and is not a page action', () => {
      const { split } = setup()
      split.placeTrackMark(30)
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(split.pendingSplits).toEqual([30])
      expect(split.selectedPendingSplit).toBe(30)
      expect(event.defaultPrevented).toBe(true)
    })

    it('adds nothing with no mark, or while a pending split is selected', async () => {
      const { split } = setup()

      await press({ key: 'Enter' })
      expect(split.pendingSplits).toEqual([])

      split.placeTrackMark(30)
      await press({ key: 'Enter' })
      split.placeTrackMark(40)
      await press({ key: 'Enter' })
      expect(split.pendingSplits).toEqual([30])
    })

    it('ignores the auto-repeat of a held key, so one press adds one', async () => {
      const { split } = setup()
      split.placeTrackMark(30)

      await press({ key: 'Enter' })
      split.deselectPendingSplit()
      split.placeTrackMark(40)
      await press({ key: 'Enter', repeat: true })

      expect(split.pendingSplits).toEqual([30])
    })

    it('leaves the splits, the playhead and the playback alone', async () => {
      const { player, split, toggleSpy } = setup()
      split.placeTrackMark(30)

      await press({ key: 'Enter' })

      expect(split.splits).toHaveLength(2)
      expect(split.editCount).toBe(0)
      expect(player.playheadSeconds()).toBe(21)
      expect(toggleSpy).not.toHaveBeenCalled()
    })
  })

  describe('Shift+Enter', () => {
    it('adds a pending split where the playhead is, without selecting it', async () => {
      const { player, split } = setup()
      player.seek(40.004)
      await nextTick()
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })

      document.dispatchEvent(event)

      expect(split.pendingSplits).toEqual([40])
      expect(split.selectedPendingSplit).toBeNull()
      expect(event.defaultPrevented).toBe(true)
    })

    it('takes every tap along the track, and is never blocked by a selection', async () => {
      const { player, split } = setup()
      split.placeTrackMark(30)
      await press({ key: 'Enter' })
      expect(split.selectedPendingSplit).toBe(30)

      for (const seconds of [35, 45, 55]) {
        player.seek(seconds)
        await nextTick()
        await press({ key: 'Enter', shiftKey: true })
      }

      expect(split.pendingSplits).toEqual([30, 35, 45, 55])
      expect(split.selectedPendingSplit).toBe(30)
    })

    it('is refused within 1 s of another pending split or of the track’s ends', async () => {
      const { player, split } = setup()

      await press({ key: 'Enter', shiftKey: true })
      expect(split.pendingSplits).toEqual([])

      player.seek(40)
      await nextTick()
      await press({ key: 'Enter', shiftKey: true })
      player.seek(40.5)
      await nextTick()
      await press({ key: 'Enter', shiftKey: true })

      expect(split.pendingSplits).toEqual([40])
    })

    it('ignores the auto-repeat of a held key, so one press adds one', async () => {
      const { player, split } = setup()
      player.seek(40)
      await nextTick()
      await press({ key: 'Enter', shiftKey: true })
      player.seek(50)
      await nextTick()

      await press({ key: 'Enter', shiftKey: true, repeat: true })

      expect(split.pendingSplits).toEqual([40])
    })

    it('leaves the mark, the playback and the view as they are', async () => {
      const { player, split, toggleSpy } = setup()
      split.placeTrackMark(30)
      player.seek(40)
      await nextTick()

      await press({ key: 'Enter', shiftKey: true })

      expect(split.trackMarkSeconds).toBe(30)
      expect(split.view).toBe('track')
      expect(toggleSpy).not.toHaveBeenCalled()
    })
  })

  describe('Delete and Backspace with a pending split selected', () => {
    it.each(['Delete', 'Backspace'])('%s deletes it, and is not a page action', (key) => {
      const { split } = setup()
      split.addPendingSplit(30, false)
      split.addPendingSplit(40, true)
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(split.pendingSplits).toEqual([30])
      expect(split.selectedPendingSplit).toBeNull()
      expect(event.defaultPrevented).toBe(true)
    })

    it('never deletes a split or a track', async () => {
      const { split } = setup()
      split.addPendingSplit(40, true)

      await press({ key: 'Delete' })

      expect(split.splits).toHaveLength(2)
      expect(split.selectedTrack?.number).toBe(2)
    })
  })

  describe('Escape', () => {
    it('deselects the selected pending split, and keeps it', () => {
      const { split } = setup()
      split.addPendingSplit(40, true)
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(split.selectedPendingSplit).toBeNull()
      expect(split.pendingSplits).toEqual([40])
      expect(event.defaultPrevented).toBe(true)
    })

    it('is left alone with none selected', () => {
      setup()
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(false)
    })
  })

  describe('Delete and Backspace', () => {
    it('do nothing with no pending split selected: no split goes, no track goes, the key is left alone', () => {
      const { player, split, toggleSpy } = setup()
      const deleteSplit = vi.spyOn(split, 'deleteSplit')

      for (const key of ['Delete', 'Backspace']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
        document.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(false)
      }

      expect(deleteSplit).not.toHaveBeenCalled()
      expect(split.splits).toHaveLength(2)
      expect(split.selectedTrack?.number).toBe(2)
      expect(player.playheadSeconds()).toBe(21)
      expect(toggleSpy).not.toHaveBeenCalled()
    })

    it('leave other keys alone too', async () => {
      const { toggleSpy } = setup()

      await press({ key: 'a' })

      expect(toggleSpy).not.toHaveBeenCalled()
    })
  })

  describe('a press', () => {
    it('places the mark where it lands, leaving the playhead and playback alone', async () => {
      const { player, split, toggleSpy, wrapper } = setup()
      const view = measured(wrapper)

      // 400 px of 1000 is 40 % of 50.5 s from 21 s.
      await pointer(view, 'pointerdown', 400)
      await pointer(view, 'pointerup', 400)

      expect(split.trackMarkSeconds).toBeCloseTo(41.2, 9)
      expect(player.playheadSeconds()).toBe(21)
      expect(toggleSpy).not.toHaveBeenCalled()
    })

    it('rounds the mark to 10 ms, as the Range view’s is', async () => {
      const { split, wrapper } = setup()
      const view = measured(wrapper)

      // 41.204 s is at x = 400.08.
      await pointer(view, 'pointerdown', 400.08)

      expect(split.trackMarkSeconds).toBeCloseTo(41.2, 9)
    })

    it('near an end split places the mark there, and selects no split', async () => {
      const { player, split, wrapper } = setup()
      const grab = vi.spyOn(player, 'grabPlayhead')
      const view = measured(wrapper)
      player.seek(40)
      await nextTick()

      await pointer(view, 'pointerdown', 997)
      await pointer(view, 'pointerup', 997)

      expect(grab).not.toHaveBeenCalled()
      // 3 px short of the end split's line, which is 71.5 s: the mark goes there, no split does.
      expect(split.trackMarkSeconds).toBeCloseTo(71.35, 9)
      expect(player.playheadSeconds()).toBeCloseTo(40, 9)
      expect(split.selectedSplit).toBeNull()
      expect(split.selectedTrack?.number).toBe(2)
      expect(split.view).toBe('track')
    })

    it('leaves the Range view’s mark alone', async () => {
      const { split, wrapper } = setup()
      split.setRange(30, 50)
      split.placeMark(40)
      split.showView('track')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 400)

      expect(split.markSeconds).toBe(40)
    })
  })

  describe('a press and the pending splits', () => {
    it('within 6 px of one selects it, and places no mark', async () => {
      const { split, wrapper } = setup()
      split.addPendingSplit(41.2, false)
      split.placeTrackMark(30)
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 405)
      await pointer(view, 'pointerup', 405)

      expect(split.selectedPendingSplit).toBeCloseTo(41.2, 9)
      expect(split.trackMarkSeconds).toBe(30)
    })

    it('takes the playhead before a pending split under the same press', async () => {
      const { player, split, wrapper } = setup()
      const grab = vi.spyOn(player, 'grabPlayhead')
      split.addPendingSplit(22, false)
      const view = measured(wrapper)

      // The playhead is at the track's start, x = 0, and the pending split at 22 s, x = 19.8.
      await pointer(view, 'pointerdown', 4)

      expect(grab).toHaveBeenCalledOnce()
      expect(split.selectedPendingSplit).toBeNull()
    })

    it('elsewhere places the mark and deselects the selected one', async () => {
      const { split, wrapper } = setup()
      split.addPendingSplit(41.2, true)
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 700)

      expect(split.selectedPendingSplit).toBeNull()
      expect(split.pendingSplits).toEqual([41.2])
      expect(split.trackMarkSeconds).toBeCloseTo(56.35, 9)
    })

    it('can select another pending split at once', async () => {
      const { split, wrapper } = setup()
      split.addPendingSplit(41.2, true)
      split.addPendingSplit(61.3, false)
      const view = measured(wrapper)

      // 61.3 s is (61.3 - 21) / 50.5 of the way: x = 798.
      await pointer(view, 'pointerdown', 798)

      expect(split.selectedPendingSplit).toBeCloseTo(61.3, 9)
    })
  })

  describe('a double-click', () => {
    it('moves the playhead there, and not the mark', async () => {
      const { player, split, wrapper } = setup()
      split.placeTrackMark(30)
      const view = measured(wrapper)

      await doubleClick(view, 400)

      expect(player.playheadSeconds()).toBeCloseTo(41.2, 9)
      expect(split.trackMarkSeconds).toBe(30)
      expect(split.view).toBe('track')
    })

    it('moves the playhead through the player’s seek, which a playing track plays on from', async () => {
      const { player, wrapper } = setup()
      const seek = vi.spyOn(player, 'seek')
      const view = measured(wrapper)

      await doubleClick(view, 400)

      expect(seek).toHaveBeenCalledExactlyOnceWith(41.2)
    })

    it('within 6 px of the end split’s line selects that split and opens the Split view', async () => {
      const { split, wrapper } = setup()
      const view = measured(wrapper)

      await doubleClick(view, 995)

      expect(split.selectedSplit?.seconds).toBe(71.5)
      expect(split.view).toBe('split')
    })

    it('within 6 px of the start split’s line selects that split too', async () => {
      const { split, wrapper } = setup()
      const view = measured(wrapper)

      await doubleClick(view, 5)

      expect(split.selectedSplit?.seconds).toBe(21)
      expect(split.view).toBe('split')
    })

    it('on an end split’s line with pending splits asks before it leaves the track', async () => {
      const { split, wrapper } = setup()
      split.addPendingSplit(40, false)
      const view = measured(wrapper)

      await doubleClick(view, 995)

      expect(split.discardQuestion).toEqual({ pendingCount: 1 })
      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('track')

      split.discardPending()

      expect(split.selectedSplit?.seconds).toBe(71.5)
      expect(split.view).toBe('split')
    })

    it('7 px from an end split’s line moves the playhead instead', async () => {
      const { player, split, wrapper } = setup()
      const view = measured(wrapper)

      await doubleClick(view, 993)

      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('track')
      expect(player.playheadSeconds()).toBeCloseTo(71.15, 9)
    })

    it('takes no split that lies outside the track, though the view draws all', async () => {
      const { split, wrapper } = setup()
      // Track 1 (0 s to 21 s) has the split at 21 s on its right edge, and nothing on its left.
      split.selectTrack(split.tracks[0]!)
      const view = measured(wrapper)

      await doubleClick(view, 5)

      expect(split.selectedSplit).toBeNull()
      expect(split.view).toBe('track')
    })
  })

  describe('dragging the playhead', () => {
    it('takes hold of the playhead at the track’s start, moves it with the pointer and lets go', async () => {
      const { player, wrapper } = setup()
      const grab = vi.spyOn(player, 'grabPlayhead')
      const seek = vi.spyOn(player, 'seek')
      const drop = vi.spyOn(player, 'dropPlayhead')
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 4)
      await pointer(view, 'pointermove', 504)
      await pointer(view, 'pointerup', 504)

      expect(grab).toHaveBeenCalledOnce()
      // Grabbed 4 px right of the line, so the line stays 4 px left of the pointer.
      expect(seek).toHaveBeenLastCalledWith(46.25)
      expect(player.playheadSeconds()).toBe(46.25)
      expect(drop).toHaveBeenCalledExactlyOnceWith()
    })

    it('holds the playhead to the track when the pointer goes past its ends', async () => {
      const { player, wrapper } = setup()
      const view = measured(wrapper)

      await pointer(view, 'pointerdown', 0)
      await pointer(view, 'pointermove', 1400)
      expect(player.playheadSeconds()).toBe(71.5)

      await pointer(view, 'pointermove', -300)
      expect(player.playheadSeconds()).toBe(21)
    })

    it('shows the resize cursor over the playhead and while it is dragged', async () => {
      const { wrapper } = setup()
      const view = measured(wrapper)

      expect(view.classes()).not.toContain('cursor-ew-resize')

      await pointer(view, 'pointermove', 3)
      expect(view.classes()).toContain('cursor-ew-resize')

      await pointer(view, 'pointermove', 400)
      expect(view.classes()).not.toContain('cursor-ew-resize')
    })
  })

  describe('the confidence marks', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('are redrawn when a confidence goes, as K takes it, with nothing else changed', async () => {
      // A 2D context that records how many marks each draw makes; a draw starts by clearing.
      const marksPerDraw: number[] = []
      const recorder = new Proxy(
        {},
        {
          get: (_target, name) => () => {
            if (name === 'clearRect') marksPerDraw.push(0)
            else if (name === 'arc') marksPerDraw.push((marksPerDraw.pop() ?? 0) + 1)
          },
          set: () => true,
        },
      )
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        recorder as unknown as CanvasRenderingContext2D,
      )
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 160),
      )
      useSourceFileStore().peaks = new Float32Array(2000)
      const { split } = setup()
      // The gaps give sure splits, which have no mark: the second track's first is made doubtful.
      const start = split.splits[0]!
      start.confidence = { band: 'doubtful', depth: 5 }
      await nextTick()
      expect(marksPerDraw.at(-1)).toBe(1)
      const draws = marksPerDraw.length

      start.confidence = null
      await nextTick()

      expect(marksPerDraw).toHaveLength(draws + 1)
      expect(marksPerDraw.at(-1)).toBe(0)
    })
  })

  describe('the failure line', () => {
    it('shows a failure to play', async () => {
      const { player, wrapper } = setup()

      player.failure = "Couldn't play this track: Invalid data found"
      await wrapper.vm.$nextTick()

      expect(wrapper.get('[role="status"]').text()).toBe(
        "Couldn't play this track: Invalid data found",
      )
    })
  })
})
