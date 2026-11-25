import { beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { mount } from '@vue/test-utils'
import { useSplitStore } from '@/entities/split/model/split.ts'
import TrackNamePrefixField from '../TrackNamePrefixField.vue'

// 100 s at 50 ms per window: loud, a 2 s silence from 20 s, loud, a 2 s silence from 70.5 s, loud.
function curveWithTwoGaps() {
  const curve = new Float32Array(2000).fill(-10)
  curve.fill(-70, 400, 440)
  curve.fill(-70, 1410, 1450)
  return curve
}

function mountField() {
  const split = useSplitStore()
  split.open(curveWithTwoGaps(), { windowSeconds: 0.05, durationSeconds: 100 })
  split.findSplits()
  split.setTrackNamePrefix('dreamscape-')
  const wrapper = mount(TrackNamePrefixField, { attachTo: document.body })
  const field = wrapper.get<HTMLInputElement>('input')
  return { split, wrapper, field }
}

const trackNames = (split: ReturnType<typeof useSplitStore>) =>
  split.tracks.map((track) => track.name)

describe('TrackNamePrefixField', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the prefix under the label "Prefix", announced as "Track name prefix"', () => {
    const { wrapper, field } = mountField()

    expect(wrapper.get('label').text()).toBe('Prefix')
    expect(field.attributes('aria-label')).toBe('Track name prefix')
    expect(field.element.value).toBe('dreamscape-')
    wrapper.unmount()
  })

  it('takes up to 100 characters, as a track name does', () => {
    const { wrapper, field } = mountField()

    expect(field.attributes('maxlength')).toBe('100')
    wrapper.unmount()
  })

  it('renames every unnamed track as the user types, and no renamed one', async () => {
    const { split, wrapper, field } = mountField()
    split.renameTrack(split.splits[0]!.id, 'Intro')

    await field.setValue('set_')

    expect(split.trackNamePrefix).toBe('set_')
    expect(trackNames(split)).toEqual(['set_01', 'Intro', 'set_03'])
    wrapper.unmount()
  })

  it('gives plain numbers when it is cleared', async () => {
    const { split, wrapper, field } = mountField()

    await field.setValue('')

    expect(trackNames(split)).toEqual(['01', '02', '03'])
    wrapper.unmount()
  })

  it('counts no edit', async () => {
    const { split, wrapper, field } = mountField()

    await field.setValue('set-')

    expect(split.hasEdits).toBe(false)
    wrapper.unmount()
  })

  it('leaves the field on Enter and keeps what was typed', async () => {
    const { split, wrapper, field } = mountField()
    await field.trigger('focus')
    field.element.focus()

    await field.setValue('set-')
    await field.trigger('keydown', { key: 'Enter' })

    expect(document.activeElement).not.toBe(field.element)
    expect(split.trackNamePrefix).toBe('set-')
    expect(field.element.value).toBe('set-')
    wrapper.unmount()
  })

  it('puts back the prefix the field had when it gained focus on Escape, then leaves it', async () => {
    const { split, wrapper, field } = mountField()
    field.element.focus()
    await field.trigger('focus')

    await field.setValue('x')
    await field.setValue('xy')
    await field.trigger('keydown', { key: 'Escape' })

    expect(document.activeElement).not.toBe(field.element)
    expect(split.trackNamePrefix).toBe('dreamscape-')
    expect(field.element.value).toBe('dreamscape-')
    expect(trackNames(split)[0]).toBe('dreamscape-01')
    wrapper.unmount()
  })

  it('takes the prefix of its latest focus for Escape, not an earlier one', async () => {
    const { split, wrapper, field } = mountField()
    field.element.focus()
    await field.trigger('focus')
    await field.setValue('first-')
    await field.trigger('keydown', { key: 'Enter' })

    field.element.focus()
    await field.trigger('focus')
    await field.setValue('second-')
    await field.trigger('keydown', { key: 'Escape' })

    expect(split.trackNamePrefix).toBe('first-')
    wrapper.unmount()
  })
})
