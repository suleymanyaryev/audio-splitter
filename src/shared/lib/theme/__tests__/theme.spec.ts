import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startTheme, THEME_STORAGE_KEY, useTheme } from '../theme.ts'

// Stands in for the OS: `matches` is its scheme, and `changeTo` fires what the browser fires.
function stubOs(isDark: boolean) {
  const listeners = new Set<() => void>()
  const darkScheme = {
    matches: isDark,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => darkScheme)
  return {
    listeners,
    changeTo(isNowDark: boolean) {
      darkScheme.matches = isNowDark
      for (const listener of listeners) listener()
    },
  }
}

const throwBlocked = () => {
  throw new DOMException('blocked', 'SecurityError')
}

const root = document.documentElement
const stops: (() => void)[] = []

// Starts the theme, to be stopped after the spec; returns what stops it sooner.
function start() {
  const stop = startTheme()
  stops.push(stop)
  return stop
}

beforeEach(() => {
  localStorage.clear()
  delete root.dataset.theme
  root.style.removeProperty('color-scheme')
})

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('the theme', () => {
  it('follows a light OS by default, and applies it to the page', () => {
    stubOs(false)
    start()

    const { themeChoice, themeInEffect } = useTheme()
    expect(themeChoice.value).toBe('system')
    expect(themeInEffect.value).toBe('light')
    expect(root.dataset.theme).toBe('light')
    expect(root.style.colorScheme).toBe('light')
  })

  it('follows a dark OS by default', () => {
    stubOs(true)
    start()

    expect(useTheme().themeInEffect.value).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it.each([
    { picked: 'light', os: true },
    { picked: 'dark', os: false },
  ] as const)('applies $picked on an OS that is dark: $os, and saves it', ({ picked, os }) => {
    stubOs(os)
    start()

    useTheme().setThemeChoice(picked)

    expect(useTheme().themeChoice.value).toBe(picked)
    expect(useTheme().themeInEffect.value).toBe(picked)
    expect(root.dataset.theme).toBe(picked)
    expect(root.style.colorScheme).toBe(picked)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(picked)
  })

  it('goes back to the OS on system, and saves that too', () => {
    stubOs(true)
    start()
    useTheme().setThemeChoice('light')

    useTheme().setThemeChoice('system')

    expect(root.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('reads a saved choice back on the next start', () => {
    stubOs(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    start()

    expect(useTheme().themeChoice.value).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
  })

  it('follows an OS change on system', () => {
    const os = stubOs(false)
    start()

    os.changeTo(true)

    expect(useTheme().themeInEffect.value).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it.each(['light', 'dark'] as const)('ignores an OS change on %s', (picked) => {
    const os = stubOs(false)
    start()
    useTheme().setThemeChoice(picked)

    os.changeTo(picked === 'light')

    expect(root.dataset.theme).toBe(picked)
    expect(useTheme().themeInEffect.value).toBe(picked)
    expect(os.listeners.size).toBe(0)
  })

  it('catches up with the OS on returning to system', () => {
    const os = stubOs(false)
    start()
    useTheme().setThemeChoice('light')
    os.changeTo(true)

    useTheme().setThemeChoice('system')

    expect(root.dataset.theme).toBe('dark')
  })

  it('stops listening to the OS when it is stopped', () => {
    const os = stubOs(false)
    const stop = start()

    stop()

    expect(os.listeners.size).toBe(0)
  })

  it.each(['', 'sepia', 'null', '{"theme":"dark"}'])(
    'falls back to system on saved text %j',
    (garbage) => {
      stubOs(true)
      localStorage.setItem(THEME_STORAGE_KEY, garbage)

      start()

      expect(useTheme().themeChoice.value).toBe('system')
      expect(root.dataset.theme).toBe('dark')
    },
  )

  it('works for the session when storage is blocked, and falls back to system', () => {
    stubOs(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwBlocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwBlocked)

    expect(start).not.toThrow()
    expect(useTheme().themeChoice.value).toBe('system')

    expect(() => {
      useTheme().setThemeChoice('dark')
    }).not.toThrow()
    expect(root.dataset.theme).toBe('dark')
  })
})
