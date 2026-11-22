import { describe, it, expect } from 'vitest'

import { stepOfKey } from '../step-of-key.ts'

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
