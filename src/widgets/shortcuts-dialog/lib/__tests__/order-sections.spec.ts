import { describe, it, expect } from 'vitest'

import { orderSections } from '../order-sections.ts'

const SECTIONS = [
  { id: 'split', title: 'Split view', rows: [] },
  { id: 'track', title: 'Track view', rows: [] },
  { id: 'range', title: 'Range view', rows: [] },
  { id: 'whole-file', title: 'Whole-file view', rows: [] },
  { id: 'track-list', title: 'Track list', rows: [] },
] as const

const ids = (view: 'split' | 'track' | 'range') =>
  orderSections(SECTIONS, view).map((section) => section.id)

describe('orderSections', () => {
  it('keeps the order as written when the Split view is on show', () => {
    expect(ids('split')).toEqual(['split', 'track', 'range', 'whole-file', 'track-list'])
  })

  it('puts the Track view first when it is on show, the rest in their order', () => {
    expect(ids('track')).toEqual(['track', 'split', 'range', 'whole-file', 'track-list'])
  })

  it('puts the Range view first when it is on show, the rest in their order', () => {
    expect(ids('range')).toEqual(['range', 'split', 'track', 'whole-file', 'track-list'])
  })

  it('leaves the list it was given as it was', () => {
    orderSections(SECTIONS, 'range')

    expect(SECTIONS.map((section) => section.id)[0]).toBe('split')
  })
})
