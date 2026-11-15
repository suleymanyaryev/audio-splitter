import { describe, it, expect } from 'vitest'

import { sanitiseFileName } from '../sanitise-file-name.ts'

describe('sanitiseFileName', () => {
  it('leaves an ordinary name, with spaces, accents and other scripts, alone', () => {
    expect(sanitiseFileName('Café – ¿Qué 日本')).toBe('Café – ¿Qué 日本')
  })

  it.each(['/', '\\', ':', '*', '?', '"', '<', '>', '|'])('replaces %s with a hyphen', (unsafe) => {
    expect(sanitiseFileName(`a${unsafe}b`)).toBe('a-b')
  })

  it('replaces control characters with a hyphen', () => {
    expect(sanitiseFileName('a\0b\tc\nd\u{7F}e')).toBe('a-b-c-d-e')
  })

  it('trims leading and trailing spaces and dots, but not inner ones', () => {
    expect(sanitiseFileName('  ..My. Song..  ')).toBe('My. Song')
  })

  it('trims after replacing, so an unsafe character at the edge is a hyphen, not a gap', () => {
    expect(sanitiseFileName('/a/')).toBe('-a-')
  })

  it('gives an empty string for a name made of nothing but spaces and dots', () => {
    expect(sanitiseFileName(' . .. ')).toBe('')
  })

  it('caps the name at 100 characters', () => {
    expect(sanitiseFileName('a'.repeat(150))).toBe('a'.repeat(100))
  })

  it('trims again when the cap leaves a space or a dot at the end', () => {
    expect(sanitiseFileName(`${'a'.repeat(99)} b`)).toBe('a'.repeat(99))
  })

  it('does not cut a character outside the basic plane in half', () => {
    expect(sanitiseFileName('😀'.repeat(150))).toBe('😀'.repeat(100))
  })
})
