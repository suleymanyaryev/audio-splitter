import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useSourceFileStore } from '@/entities/source-file/model/source-file.ts'
import { useSplitStore } from '@/entities/split/model/split.ts'
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
  sourceFile.durationSeconds = 100
  sourceFile.loudnessWindowSeconds = 0.05
  sourceFile.loudness = curveWithTwoGaps()
  // Element.prototype.scrollIntoView is missing in jsdom, and the track list calls it.
  Element.prototype.scrollIntoView = () => {}
  return mount(ReviewPage, { attachTo: document.body })
}

function addSplitButton(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === 'Add split')
  if (!button) throw new Error('no Add split button')
  return button
}

describe('ReviewPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
})
