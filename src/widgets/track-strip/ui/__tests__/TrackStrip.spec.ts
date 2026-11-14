import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { flushPromises, mount } from '@vue/test-utils'
import { useSplitStore } from '@/entities/split/model/split.ts'
import TrackStrip from '../TrackStrip.vue'

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

function blocks(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('li')
}

describe('TrackStrip', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // jsdom measures nothing: the strip is 1012 px wide, which after two 6 px lands leaves 1000 px.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1012)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('draws one block per track, wide in proportion to its length, with name and length', async () => {
    useSplitStore().detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })

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

  it('is one block over the whole file when there are no splits', async () => {
    useSplitStore().detect(new Float32Array(400).fill(-10), {
      windowSeconds: 0.05,
      durationSeconds: 20,
    })

    const wrapper = await mountStrip()

    expect(blocks(wrapper)).toHaveLength(1)
    expect(blocks(wrapper)[0]?.text()).toBe('10:00:20')
    expect(blocks(wrapper)[0]?.attributes('style')).toContain('width: 1012px')
  })

  it('drops the length, then the name, of blocks too narrow for them, keeping both in the title', async () => {
    useSplitStore().detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    // 112 px leaves 100 px for the three tracks: 21, 50.5 and 28.5 px.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(112)

    const wrapper = await mountStrip()

    // The first and third block are under 32 px: no text. The second, 50 px, has only its name.
    expect(blocks(wrapper).map((block) => block.text())).toEqual(['', '2', ''])
    // A sliver has no padding: border-box padding would keep it from getting narrower than itself.
    expect(blocks(wrapper)[0]?.classes()).not.toContain('px-1.5')
    expect(blocks(wrapper)[1]?.classes()).toContain('px-1.5')
    expect(blocks(wrapper)[0]?.attributes('title')).toBe('1, 0:00:21')
    expect(blocks(wrapper)[2]?.attributes('aria-label')).toBe('3, 0:00:28')
  })

  it('follows the minimum gap length: fewer gaps, fewer blocks', async () => {
    const split = useSplitStore()
    split.detect(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
    const wrapper = await mountStrip()
    expect(blocks(wrapper)).toHaveLength(3)

    split.setMinimumGapLength(3)
    await wrapper.vm.$nextTick()

    expect(blocks(wrapper)).toHaveLength(1)
  })
})
