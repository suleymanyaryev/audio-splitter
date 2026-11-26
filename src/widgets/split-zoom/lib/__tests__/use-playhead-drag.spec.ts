import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { usePlayerStore } from '../../model/player.ts'
import { stretchAxis } from '../stretch-axis.ts'
import { usePlayheadDrag } from '../use-playhead-drag.ts'

enableAutoUnmount(afterEach)

// The element is 1,000 px wide, its left edge 100 px across the page: the range's 10 s is 100 px a second.
const LEFT = 100

// What the handlers read from a pointer event, without a browser's PointerEvent.
// `buttons` is the buttons held: 1 while the main one is down, 0 once the pointer is only hovering.
function pointerAt(elementX: number, button = 0, buttons = 1) {
  const setPointerCapture = vi.fn()
  const event = {
    button,
    buttons,
    clientX: LEFT + elementX,
    pointerId: 5,
    currentTarget: {
      getBoundingClientRect: () => ({ left: LEFT }),
      setPointerCapture,
    },
  } as unknown as PointerEvent
  return { event, setPointerCapture }
}

// The component draws nothing: only its setup matters.
const renderNothing = () => null

// The axis of what the player has on show, as a view builds it.
const axisOfPlayer = () => stretchAxis(usePlayerStore().extent, 1000)

// The range 10 s to 20 s is on show (unless `isOnShow` is false: no file at all), with the playhead at
// 14.5 s: x = 450.
function setup(isOnShow = true) {
  const player = usePlayerStore()
  if (isOnShow) {
    useSourceFileStore().durationSeconds = 100
    const split = useSplitStore()
    split.open(new Float32Array(2000).fill(-10), { windowSeconds: 0.05, durationSeconds: 100 })
    split.setRange(10, 20)
    player.seek(14.5)
  }
  const grab = vi.spyOn(player, 'grabPlayhead')
  const seek = vi.spyOn(player, 'seek')
  const drop = vi.spyOn(player, 'dropPlayhead')
  let drag: ReturnType<typeof usePlayheadDrag> | undefined
  mount(
    defineComponent({
      setup() {
        drag = usePlayheadDrag(axisOfPlayer)
        return renderNothing
      },
    }),
  )
  return { drag: drag!, grab, seek, drop }
}

describe('usePlayheadDrag', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('tryGrab', () => {
    it('takes hold of the playhead within 6 px, with the pointer captured, and says so', () => {
      const { drag, grab } = setup()
      const down = pointerAt(456)

      expect(drag.tryGrab(down.event)).toBe(true)

      expect(down.setPointerCapture).toHaveBeenCalledWith(5)
      expect(drag.dragging.value).toBe(true)
      expect(grab).toHaveBeenCalledOnce()
    })

    it('does nothing 7 px away, and says so', () => {
      const { drag, grab, seek } = setup()
      const down = pointerAt(457)

      expect(drag.tryGrab(down.event)).toBe(false)
      drag.onPointerMove(pointerAt(600).event)

      expect(down.setPointerCapture).not.toHaveBeenCalled()
      expect(drag.dragging.value).toBe(false)
      expect(grab).not.toHaveBeenCalled()
      expect(seek).not.toHaveBeenCalled()
    })

    it('takes only the primary button', () => {
      const { drag, grab } = setup()
      const down = pointerAt(450, 2)

      expect(drag.tryGrab(down.event)).toBe(false)

      expect(down.setPointerCapture).not.toHaveBeenCalled()
      expect(grab).not.toHaveBeenCalled()
    })

    it('has nothing to take with nothing on show', () => {
      const { drag, grab } = setup(false)

      expect(drag.tryGrab(pointerAt(0).event)).toBe(false)

      expect(grab).not.toHaveBeenCalled()
    })

    it('lets go of a held playhead first, so two presses never stack two drags', () => {
      const { drag, grab, drop } = setup()
      drag.tryGrab(pointerAt(450).event)

      expect(drag.tryGrab(pointerAt(200).event)).toBe(false)

      expect(drop).toHaveBeenCalledOnce()
      expect(drag.dragging.value).toBe(false)
      expect(grab).toHaveBeenCalledOnce()
    })

    it('lets go of a held playhead and takes hold of it again when the second press is on it', () => {
      const { drag, grab, drop } = setup()
      drag.tryGrab(pointerAt(450).event)

      expect(drag.tryGrab(pointerAt(452).event)).toBe(true)

      expect(drop).toHaveBeenCalledOnce()
      expect(grab).toHaveBeenCalledTimes(2)
      expect(drag.dragging.value).toBe(true)
    })
  })

  describe('a move while dragging', () => {
    it('seeks to the time under the pointer, keeping the distance it was grabbed at', () => {
      const { drag, seek } = setup()

      // Grabbed 5 px right of the playhead.
      drag.tryGrab(pointerAt(455).event)
      drag.onPointerMove(pointerAt(605).event)

      // The line is at 600 px: 10 s + 6 s.
      expect(seek).toHaveBeenLastCalledWith(16)
    })

    it('lets go when no button is held, as the release never came', () => {
      const { drag, drop, seek } = setup()
      drag.tryGrab(pointerAt(450).event)

      drag.onPointerMove(pointerAt(600, 0, 0).event)
      drag.onPointerMove(pointerAt(650).event)

      expect(drag.dragging.value).toBe(false)
      expect(drop).toHaveBeenCalledOnce()
      expect(seek).not.toHaveBeenCalled()
    })
  })

  describe('onPointerEnd', () => {
    it('lets go once, whether it comes from a release, a cancel or a lost capture', () => {
      const { drag, drop, seek } = setup()
      drag.tryGrab(pointerAt(450).event)

      drag.onPointerEnd()
      drag.onPointerEnd()
      drag.onPointerMove(pointerAt(600).event)

      expect(drag.dragging.value).toBe(false)
      expect(drop).toHaveBeenCalledOnce()
      expect(seek).not.toHaveBeenCalled()
    })

    it('lets go of nothing when nothing was taken hold of', () => {
      const { drag, drop } = setup()
      drag.tryGrab(pointerAt(300).event)

      drag.onPointerEnd()

      expect(drop).not.toHaveBeenCalled()
    })
  })

  describe('overPlayhead', () => {
    it('is true while the pointer is within 6 px of the playhead, with no drag on', () => {
      const { drag } = setup()

      drag.onPointerMove(pointerAt(445).event)
      expect(drag.overPlayhead.value).toBe(true)

      drag.onPointerMove(pointerAt(300).event)
      expect(drag.overPlayhead.value).toBe(false)
    })
  })
})
