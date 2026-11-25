import { describe, it, expect } from 'vitest'

import { confidenceStepOfKey, stepOfKey } from '../step-of-key.ts'

const press = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)

describe('stepOfKey', () => {
  it('steps back on the key right of P and forward on the one after it', () => {
    expect(stepOfKey(press({ code: 'BracketLeft', key: '[' }))).toBe(-1)
    expect(stepOfKey(press({ code: 'BracketRight', key: ']' }))).toBe(1)
  })

  it('matches the physical key, whatever character the layout types', () => {
    expect(stepOfKey(press({ code: 'BracketRight', key: '+' }))).toBe(1)
  })

  it('leaves another key alone, even one that types a bracket', () => {
    expect(stepOfKey(press({ code: 'Digit8', key: '[' }))).toBeNull()
  })

  it('leaves the key with Shift free', () => {
    expect(stepOfKey(press({ code: 'BracketLeft', key: '{', shiftKey: true }))).toBeNull()
  })

  it('takes a held key once', () => {
    expect(stepOfKey(press({ code: 'BracketRight', key: ']', repeat: true }))).toBeNull()
  })
})

describe('confidenceStepOfKey', () => {
  it('steps back on { and forward on }, the two bracket keys with Shift', () => {
    expect(confidenceStepOfKey(press({ code: 'BracketLeft', key: '{', shiftKey: true }))).toBe(-1)
    expect(confidenceStepOfKey(press({ code: 'BracketRight', key: '}', shiftKey: true }))).toBe(1)
  })

  it('matches the physical key, whatever character the layout types', () => {
    expect(confidenceStepOfKey(press({ code: 'BracketRight', key: '*', shiftKey: true }))).toBe(1)
  })

  it('leaves the brackets without Shift to stepOfKey', () => {
    expect(confidenceStepOfKey(press({ code: 'BracketLeft', key: '[' }))).toBeNull()
    expect(confidenceStepOfKey(press({ code: 'BracketRight', key: ']' }))).toBeNull()
  })

  it('leaves another key, a held key and a key that types ? alone', () => {
    expect(confidenceStepOfKey(press({ code: 'Digit8', key: '{', shiftKey: true }))).toBeNull()
    expect(
      confidenceStepOfKey(press({ code: 'BracketRight', key: '}', shiftKey: true, repeat: true })),
    ).toBeNull()
    expect(confidenceStepOfKey(press({ code: 'BracketLeft', key: '?', shiftKey: true }))).toBeNull()
  })
})
