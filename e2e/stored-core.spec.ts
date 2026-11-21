import { expect, test } from '@playwright/test'

import { CORE_CACHE_NAME, isCoreUrl } from '../src/shared/api/ffmpeg/core-cache.ts'

/*
A second visit loads a file without downloading the ffmpeg core: the first visit downloads it and
stores it in Cache Storage, and the service worker answers the worker's requests for it from
there. Run on a production build, because the service worker is registered in production builds
only. A full offline reload is not possible: only the core is kept, so the app's own files (the
worker's script among them) still come from the network. What the spec checks is that no request
for a core file reaches the network on the second visit: the service worker answers each one
without making a request of its own.
*/
const FIXTURE = 'e2e/fixtures/bursts.mp3'

test('loads a file on a second visit without downloading the core', async ({ page, context }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(FIXTURE)
  await expect(page.getByRole('button', { name: 'Export to folder…' })).toBeEnabled({
    timeout: 60_000,
  })
  // The service worker controls the page by now, and both core files are stored.
  await expect
    .poll(() =>
      page.evaluate(async (cacheName) => {
        const cache = await globalThis.caches.open(cacheName)
        const keys = await cache.keys()
        return {
          isControlled: Boolean(navigator.serviceWorker.controller),
          stored: keys.length,
        }
      }, CORE_CACHE_NAME),
    )
    .toEqual({ isControlled: true, stored: 2 })

  await page.reload()
  const answers: { isFromWorker: boolean; isWorkersOwn: boolean }[] = []
  context.on('response', (response) => {
    if (!isCoreUrl(response.url())) return
    answers.push({
      isFromWorker: response.fromServiceWorker(),
      // A request made by the service worker itself is a trip to the network.
      isWorkersOwn: response.request().serviceWorker() !== null,
    })
  })
  await page.locator('input[type="file"]').setInputFiles(FIXTURE)

  await expect(page.getByRole('button', { name: 'Export to folder…' })).toBeEnabled({
    timeout: 60_000,
  })
  // The script and the wasm, each asked for by the ffmpeg worker.
  expect(answers.length).toBeGreaterThanOrEqual(2)
  expect(answers.every((answer) => answer.isFromWorker && !answer.isWorkersOwn)).toBe(true)
})
