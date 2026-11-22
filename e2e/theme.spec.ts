import { expect, test, type Page } from '@playwright/test'

/*
The theme switch, in a real browser because first paint and the OS scheme can only be checked
there. Each test gets a fresh browser context, so nothing is saved from an earlier one. The OS
scheme is emulated with `colorScheme`; the saved choice is the page's own `localStorage`.
*/
const STORAGE_KEY = 'audio-splitter:theme'

// What the page says about its theme: the attribute the CSS keys on, and the root's `color-scheme`.
async function themeOf(page: Page) {
  return page.evaluate(() => ({
    attribute: globalThis.document.documentElement.dataset.theme,
    colorScheme: globalThis.document.documentElement.style.colorScheme,
  }))
}

async function attributeOf(page: Page) {
  const { attribute } = await themeOf(page)
  return attribute
}

async function chooseTheme(page: Page, name: 'System' | 'Light' | 'Dark') {
  await page.getByRole('radio', { name, exact: true }).click()
}

test.describe('theme switch', () => {
  test('applies a saved Dark choice before the app mounts, under a light OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await page.evaluate((key) => localStorage.setItem(key, 'dark'), STORAGE_KEY)

    /*
    With the app's entry blocked nothing can mount, so only the inline script in the page head can
    have set the theme. The ground colour is not read: the dev server loads the CSS from that entry.
    */
    await page.route('**/src/app/main.ts*', (route) => route.abort())
    await page.reload({ waitUntil: 'domcontentloaded' })

    expect(await themeOf(page)).toEqual({ attribute: 'dark', colorScheme: 'dark' })
    await expect(page.getByRole('radiogroup', { name: 'Theme' })).toHaveCount(0)
  })

  test('follows the OS live on System', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked()
    await expect.poll(() => attributeOf(page)).toBe('light')

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => attributeOf(page)).toBe('dark')

    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => attributeOf(page)).toBe('light')
  })

  test('holds a chosen Light when the OS changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await chooseTheme(page, 'Light')

    await page.emulateMedia({ colorScheme: 'dark' })

    // The page has seen the OS go dark, and has stayed light.
    await expect
      .poll(() =>
        page.evaluate(() => globalThis.matchMedia('(prefers-color-scheme: dark)').matches),
      )
      .toBe(true)
    expect(await themeOf(page)).toEqual({ attribute: 'light', colorScheme: 'light' })
  })

  test('applies a choice at once and keeps it across a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')

    await chooseTheme(page, 'Dark')
    expect(await themeOf(page)).toEqual({ attribute: 'dark', colorScheme: 'dark' })

    await page.reload()
    await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked()
    expect(await themeOf(page)).toEqual({ attribute: 'dark', colorScheme: 'dark' })
  })
})
