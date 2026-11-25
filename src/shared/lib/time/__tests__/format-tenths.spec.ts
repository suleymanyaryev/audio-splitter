import { describe, expect, it } from 'vitest'

import { formatTenths } from '../format-tenths.ts'

describe('formatTenths', () => {
  it('writes whole seconds as minutes and seconds', () => {
    expect(formatTenths(0)).toBe('0:00')
    expect(formatTenths(30)).toBe('0:30')
    expect(formatTenths(100)).toBe('1:40')
  })

  it('adds the tenth only when there is one', () => {
    expect(formatTenths(100.2)).toBe('1:40.2')
    expect(formatTenths(30.6)).toBe('0:30.6')
  })

  it('rounds to the nearest tenth, carrying into the next second', () => {
    expect(formatTenths(59.96)).toBe('1:00')
    expect(formatTenths(0.04)).toBe('0:00')
  })

  it('adds the hour from one hour on', () => {
    expect(formatTenths(3600)).toBe('1:00:00')
    expect(formatTenths(3725.4)).toBe('1:02:05.4')
  })
})
