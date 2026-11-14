import { beforeEach, describe, it, expect } from 'vitest'
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

function rows(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('tbody tr').map((row) => row.findAll('td').map((cell) => cell.text()))
}

describe('TrackList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lists number, start with hundredths and length for each track', () => {
    useSplitStore().detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })

    const wrapper = mount(TrackList)

    expect(wrapper.findAll('thead th').map((cell) => cell.text())).toEqual(['#', 'Start', 'Length'])
    expect(rows(wrapper)).toEqual([
      ['1', '0:00:00.00', '0:00:21'],
      ['2', '0:00:21.00', '0:00:50'],
      ['3', '0:01:11.50', '0:00:28'],
    ])
  })

  it('shows one track over the whole file when there are no splits', () => {
    useSplitStore().detect(new Float32Array(400).fill(-10), {
      windowSeconds: 0.05,
      durationSeconds: 20,
    })

    expect(rows(mount(TrackList))).toEqual([['1', '0:00:00.00', '0:00:20']])
  })

  it('follows the minimum gap length: fewer gaps, fewer rows', async () => {
    const split = useSplitStore()
    split.detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    const wrapper = mount(TrackList)
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)

    split.setMinimumGapLength(3)

    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('scrolls inside a box as tall as the zoom view', () => {
    useSplitStore().detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })

    const wrapper = mount(TrackList)

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['h-40', 'overflow-y-auto']))
  })
})
