import { readFileSync } from 'node:fs'
import path from 'node:path'
import { runInThisContext } from 'node:vm'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY } from '../theme.ts'

// The script in the page head that themes the page before it first paints, as the page ships it.
const HEAD_SCRIPT = (() => {
  const page = readFileSync(path.resolve(import.meta.dirname, '../../../../../index.html'), 'utf8')
  const head = page.slice(0, page.indexOf('</head>'))
  const found = /<script>([\s\S]*?)<\/script>/.exec(head)
  if (!found?.[1]) throw new Error('index.html has no inline script in its head')
  return found[1]
})()

const root = document.documentElement

function runHeadScript(isOsDark: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: isOsDark }))
  // Running the script the page ships is what this spec checks, so the code is run on purpose.
  // eslint-disable-next-line sonarjs/code-eval
  runInThisContext(HEAD_SCRIPT)
}

beforeEach(() => {
  localStorage.clear()
  delete root.dataset.theme
  root.style.removeProperty('color-scheme')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('the inline script in the page head', () => {
  it('uses the key the theme module saves under', () => {
    expect(HEAD_SCRIPT).toContain(`'${THEME_STORAGE_KEY}'`)
  })

  it.each([
    { saved: 'dark', isOsDark: false, theme: 'dark' },
    { saved: 'light', isOsDark: true, theme: 'light' },
    { saved: 'system', isOsDark: true, theme: 'dark' },
    { saved: 'system', isOsDark: false, theme: 'light' },
  ])('themes the page $theme for a saved $saved under an OS that is dark: $isOsDark', (given) => {
    localStorage.setItem(THEME_STORAGE_KEY, given.saved)

    runHeadScript(given.isOsDark)

    expect(root.dataset.theme).toBe(given.theme)
    expect(root.style.colorScheme).toBe(given.theme)
  })

  it.each([
    { isOsDark: true, theme: 'dark' },
    { isOsDark: false, theme: 'light' },
  ])('follows the OS with nothing saved, under an OS that is dark: $isOsDark', (given) => {
    runHeadScript(given.isOsDark)

    expect(root.dataset.theme).toBe(given.theme)
  })

  it('follows the OS on text the app did not write', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')

    runHeadScript(true)

    expect(root.dataset.theme).toBe('dark')
  })

  it('follows the OS when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    runHeadScript(true)

    expect(root.dataset.theme).toBe('dark')
  })
})
