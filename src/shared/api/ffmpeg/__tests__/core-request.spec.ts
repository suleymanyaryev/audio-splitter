// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { answerCoreRequest } from '../core-request.ts'
import { APP_ORIGIN, fakeCacheStorage } from './fake-cache-storage.ts'

const CORE = `${APP_ORIGIN}assets/ffmpeg-core-CgUfceKH.wasm`

describe('answerCoreRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('answers a core file from Cache Storage, without a request', async () => {
    const storage = fakeCacheStorage()
    storage.seed(CORE, 'the wasm')
    const fetchStub = vi.fn()
    vi.stubGlobal('fetch', fetchStub)

    const response = await answerCoreRequest(new Request(CORE))

    expect(await response?.text()).toBe('the wasm')
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('answers a core file the page stored although the worker asks with an Origin header', async () => {
    const storage = fakeCacheStorage()
    // The server says the response varies on Origin; the page's own fetch sent none.
    storage.seed(CORE, 'the wasm', { vary: 'Origin' })
    const fetchStub = vi.fn()
    vi.stubGlobal('fetch', fetchStub)

    const response = await answerCoreRequest(
      new Request(CORE, { headers: { origin: 'https://app.test' } }),
    )

    expect(await response?.text()).toBe('the wasm')
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('answers from the network on a miss, and writes nothing', async () => {
    const storage = fakeCacheStorage()
    const fetchStub = vi.fn(() => Promise.resolve(new Response('from the network')))
    vi.stubGlobal('fetch', fetchStub)
    const request = new Request(CORE)

    const response = await answerCoreRequest(request)

    expect(await response?.text()).toBe('from the network')
    expect(fetchStub).toHaveBeenCalledWith(request)
    expect(storage.urls()).toEqual([])
  })

  it('leaves every other request to the browser', () => {
    fakeCacheStorage()
    const fetchStub = vi.fn()
    vi.stubGlobal('fetch', fetchStub)

    for (const url of [
      APP_ORIGIN,
      `${APP_ORIGIN}assets/index-sTNSkl27.js`,
      `${APP_ORIGIN}assets/manrope-variable-DHIcAJRg.woff2`,
    ]) {
      expect(answerCoreRequest(new Request(url))).toBeNull()
    }
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('answers from the network when Cache Storage cannot be opened', async () => {
    fakeCacheStorage({ isBlocked: true })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('from the network'))),
    )

    const response = await answerCoreRequest(new Request(CORE))

    expect(await response?.text()).toBe('from the network')
  })
})
