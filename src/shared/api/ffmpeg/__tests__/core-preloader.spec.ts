// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

const WASM_BYTES = __FFMPEG_WASM_BYTES__

/*
A `fetch` whose responses stream what the test pushes: `push(url, bytes)` delivers a chunk,
`finish(url)` ends the body, `fail(url)` breaks it. An aborted request errors its body with the
abort's reason, as a real one does. `requests` lists every URL asked for, in order.
*/
function fakeNetwork() {
  const bodies = new Map<string, ReadableStreamDefaultController<Uint8Array>>()
  const requests: string[] = []
  const fetchStub = vi.fn((url: string, init?: { signal?: AbortSignal }) => {
    requests.push(url)
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        bodies.set(url, controller)
        init?.signal?.addEventListener('abort', () => {
          controller.error(init.signal?.reason)
        })
      },
    })
    return Promise.resolve(new Response(body))
  })
  vi.stubGlobal('fetch', fetchStub)
  return {
    requests,
    fetchStub,
    push(url: string, byteCount: number) {
      bodies.get(url)?.enqueue(new Uint8Array(byteCount))
    },
    finish(url: string) {
      bodies.get(url)?.close()
    },
    fail(url: string) {
      bodies.get(url)?.error(new TypeError('network error'))
    },
  }
}

// A fresh module, so no download from an earlier test is still shared.
async function freshPreloader() {
  vi.resetModules()
  return import('../core-preloader.ts')
}

// What a promise settled as: "resolved", or the error as text.
async function outcomeOf(promise: Promise<unknown>) {
  try {
    await promise
    return 'resolved'
  } catch (error) {
    return String(error)
  }
}

/*
A browser with `requestIdleCallback`: `idle()` runs what was asked for, as the browser does
when it has nothing else to do. `isSavingData` is the Save-Data signal the browser sends.
*/
function idleBrowser(isSavingData = false) {
  const callbacks: (() => void)[] = []
  vi.stubGlobal('navigator', { connection: { saveData: isSavingData } })
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
    callbacks.push(callback)
  })
  return {
    idle() {
      for (const callback of callbacks.splice(0)) callback()
    },
  }
}

describe('preloadCore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('downloads the script and the wasm, and reports progress from 0 to 1', async () => {
    const network = fakeNetwork()
    const { preloadCore } = await freshPreloader()
    const progress: number[] = []

    const { done } = preloadCore((fraction) => {
      progress.push(fraction)
    })
    await vi.advanceTimersByTimeAsync(0)
    network.push(coreURL, 1000)
    network.finish(coreURL)
    const half = Math.floor(WASM_BYTES / 2)
    network.push(wasmURL, half)
    await vi.advanceTimersByTimeAsync(0)
    network.push(wasmURL, WASM_BYTES - half)
    network.finish(wasmURL)
    await done

    expect(network.requests).toHaveLength(2)
    expect(network.requests).toContain(coreURL)
    expect(network.requests).toContain(wasmURL)
    expect(progress[0]).toBe(0)
    expect(progress.at(-1)).toBe(1)
    expect(progress).toContainEqual(expect.closeTo(0.5, 2))
    expect(progress.slice(1).every((value, index) => value >= (progress[index] ?? 0))).toBe(true)
  })

  it("does not count the script's bytes", async () => {
    const network = fakeNetwork()
    const { preloadCore } = await freshPreloader()
    const progress: number[] = []

    preloadCore((fraction) => {
      progress.push(fraction)
    })
    await vi.advanceTimersByTimeAsync(0)
    network.push(coreURL, 100_000)
    await vi.advanceTimersByTimeAsync(0)

    expect(progress).toEqual([0])
  })

  it('reports 1 only once both files are in, and never more than that', async () => {
    const network = fakeNetwork()
    const { preloadCore } = await freshPreloader()
    const progress: number[] = []

    const { done } = preloadCore((fraction) => {
      progress.push(fraction)
    })
    await vi.advanceTimersByTimeAsync(0)
    network.push(wasmURL, WASM_BYTES + 5000)
    network.finish(wasmURL)
    await vi.advanceTimersByTimeAsync(0)
    expect(Math.max(...progress)).toBeLessThan(1)

    network.finish(coreURL)
    await done

    expect(progress.at(-1)).toBe(1)
    expect(Math.max(...progress)).toBe(1)
  })

  it('shares one download between callers, and a late caller starts from where it is', async () => {
    const network = fakeNetwork()
    const { preloadCore } = await freshPreloader()
    const first: number[] = []
    const late: number[] = []

    const one = preloadCore((fraction) => {
      first.push(fraction)
    })
    await vi.advanceTimersByTimeAsync(0)
    network.push(wasmURL, Math.floor(WASM_BYTES / 4))
    await vi.advanceTimersByTimeAsync(0)
    const two = preloadCore((fraction) => {
      late.push(fraction)
    })
    network.finish(coreURL)
    network.push(wasmURL, WASM_BYTES - Math.floor(WASM_BYTES / 4))
    network.finish(wasmURL)
    await Promise.all([one.done, two.done])

    expect(network.requests).toHaveLength(2)
    expect(late[0]).toBeCloseTo(0.25, 2)
    expect(first.at(-1)).toBe(1)
    expect(late.at(-1)).toBe(1)
  })

  it('goes on after a caller unsubscribes, and tells that caller nothing more', async () => {
    const network = fakeNetwork()
    const { preloadCore } = await freshPreloader()
    const leaver: number[] = []
    const stayer: number[] = []

    const leaving = preloadCore((fraction) => {
      leaver.push(fraction)
    })
    const staying = preloadCore((fraction) => {
      stayer.push(fraction)
    })
    await vi.advanceTimersByTimeAsync(0)
    leaving.unsubscribe()
    network.finish(coreURL)
    network.push(wasmURL, WASM_BYTES)
    network.finish(wasmURL)
    await staying.done

    expect(leaver).toEqual([0])
    expect(stayer.at(-1)).toBe(1)
    expect(await outcomeOf(leaving.done)).toBe('resolved')
  })

  it('downloads nothing again once it has finished', async () => {
    const network = fakeNetwork()
    const { preloadCore } = await freshPreloader()
    const first = preloadCore()
    await vi.advanceTimersByTimeAsync(0)
    network.finish(coreURL)
    network.finish(wasmURL)
    await first.done

    const progress: number[] = []
    await preloadCore((fraction) => {
      progress.push(fraction)
    }).done

    expect(network.requests).toHaveLength(2)
    expect(progress).toEqual([])
  })

  describe('the stall rule', () => {
    it('rejects after 30 s with no bytes, saying the download stalled', async () => {
      fakeNetwork()
      const { preloadCore, CoreDownloadError } = await freshPreloader()

      const { done } = preloadCore()
      const outcome = outcomeOf(done)
      await vi.advanceTimersByTimeAsync(29_999)
      await vi.advanceTimersByTimeAsync(1)

      expect(await outcome).toContain('stalled')
      await expect(done).rejects.toBeInstanceOf(CoreDownloadError)
    })

    it('counts from the last byte, not from the start', async () => {
      const network = fakeNetwork()
      const { preloadCore } = await freshPreloader()

      const outcome = outcomeOf(preloadCore().done)
      await vi.advanceTimersByTimeAsync(20_000)
      network.push(wasmURL, 10)
      await vi.advanceTimersByTimeAsync(29_999)
      network.finish(coreURL)
      network.finish(wasmURL)

      expect(await outcome).toBe('resolved')
    })

    it('has no total time limit: slow but steady bytes over 20 minutes finish', async () => {
      const network = fakeNetwork()
      const { preloadCore } = await freshPreloader()
      const progress: number[] = []

      const outcome = outcomeOf(
        preloadCore((fraction) => {
          progress.push(fraction)
        }).done,
      )
      await vi.advanceTimersByTimeAsync(0)
      for (let step = 0; step < 60; step++) {
        await vi.advanceTimersByTimeAsync(20_000)
        network.push(wasmURL, 1000)
      }
      network.finish(coreURL)
      network.push(wasmURL, WASM_BYTES)
      network.finish(wasmURL)

      expect(await outcome).toBe('resolved')
      expect(progress.at(-1)).toBe(1)
    })
  })

  describe('a failure', () => {
    it('rejects every caller with a download error', async () => {
      const network = fakeNetwork()
      const { preloadCore, CoreDownloadError } = await freshPreloader()

      const one = preloadCore()
      const two = preloadCore()
      const outcomes = Promise.allSettled([one.done, two.done])
      await vi.advanceTimersByTimeAsync(0)
      network.fail(wasmURL)

      const [first, second] = await outcomes
      expect(first).toMatchObject({ status: 'rejected', reason: expect.any(CoreDownloadError) })
      expect(second).toMatchObject({ status: 'rejected', reason: expect.any(CoreDownloadError) })
      expect(String((first as PromiseRejectedResult).reason)).toContain('network error')
    })

    it('rejects when the server answers with an error status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(new Response('missing', { status: 404 }))),
      )
      const { preloadCore } = await freshPreloader()

      expect(await outcomeOf(preloadCore().done)).toContain('404')
    })

    it('clears the shared download, so the next call starts afresh', async () => {
      const network = fakeNetwork()
      const { preloadCore } = await freshPreloader()
      const failed = outcomeOf(preloadCore().done)
      await vi.advanceTimersByTimeAsync(0)
      network.fail(wasmURL)
      await failed
      expect(network.requests).toHaveLength(2)

      const progress: number[] = []
      const { done } = preloadCore((fraction) => {
        progress.push(fraction)
      })
      await vi.advanceTimersByTimeAsync(0)
      network.finish(coreURL)
      network.push(wasmURL, WASM_BYTES)
      network.finish(wasmURL)
      await done

      expect(network.requests).toHaveLength(4)
      expect(progress[0]).toBe(0)
      expect(progress.at(-1)).toBe(1)
    })

    it('stops the other file when one fails', async () => {
      const network = fakeNetwork()
      const { preloadCore } = await freshPreloader()
      const outcome = outcomeOf(preloadCore().done)
      await vi.advanceTimersByTimeAsync(0)

      network.fail(coreURL)
      await outcome

      // The broken-off wasm request was aborted: pushing to it now throws, as to a closed stream.
      expect(() => {
        network.push(wasmURL, 10)
      }).toThrow()
    })
  })

  describe('the idle start', () => {
    it('starts downloading when the browser is idle, and not before', async () => {
      const network = fakeNetwork()
      const browser = idleBrowser()
      const { preloadCoreWhenIdle } = await freshPreloader()

      preloadCoreWhenIdle()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(network.requests).toEqual([])

      browser.idle()
      await vi.advanceTimersByTimeAsync(0)
      expect(network.requests).toHaveLength(2)
    })

    it('starts after a short wait in a browser without requestIdleCallback', async () => {
      const network = fakeNetwork()
      vi.stubGlobal('navigator', { connection: { saveData: false } })
      vi.stubGlobal('requestIdleCallback', undefined)
      const { preloadCoreWhenIdle } = await freshPreloader()

      preloadCoreWhenIdle()
      await vi.advanceTimersByTimeAsync(0)
      expect(network.requests).toEqual([])

      await vi.advanceTimersByTimeAsync(1000)
      expect(network.requests).toHaveLength(2)
    })

    it('starts nothing when the browser asks to save data', async () => {
      const network = fakeNetwork()
      const browser = idleBrowser(true)
      const { preloadCoreWhenIdle } = await freshPreloader()

      preloadCoreWhenIdle()
      browser.idle()
      await vi.advanceTimersByTimeAsync(60_000)

      expect(network.requests).toEqual([])
    })

    it('still downloads for a caller that asks under Save-Data', async () => {
      const network = fakeNetwork()
      const browser = idleBrowser(true)
      const { preloadCoreWhenIdle, preloadCore } = await freshPreloader()

      preloadCoreWhenIdle()
      browser.idle()
      preloadCore()
      await vi.advanceTimersByTimeAsync(0)

      expect(network.requests).toHaveLength(2)
    })

    it('says nothing when the download fails, and the next call starts afresh', async () => {
      const network = fakeNetwork()
      const browser = idleBrowser()
      const unhandled = vi.fn()
      process.on('unhandledRejection', unhandled)
      const { preloadCoreWhenIdle, preloadCore } = await freshPreloader()

      preloadCoreWhenIdle()
      browser.idle()
      await vi.advanceTimersByTimeAsync(0)
      network.fail(wasmURL)
      await vi.advanceTimersByTimeAsync(0)
      // Unhandled rejections are reported on the next turn of the event loop.
      await vi.advanceTimersByTimeAsync(10)
      process.off('unhandledRejection', unhandled)
      expect(unhandled).not.toHaveBeenCalled()

      const progress: number[] = []
      preloadCore((fraction) => {
        progress.push(fraction)
      })
      await vi.advanceTimersByTimeAsync(0)
      expect(network.requests).toHaveLength(4)
      expect(progress).toEqual([0])
    })

    it('is joined by a load that begins mid-download: the current fraction, no second request', async () => {
      const network = fakeNetwork()
      const browser = idleBrowser()
      const { preloadCoreWhenIdle, preloadCore } = await freshPreloader()

      preloadCoreWhenIdle()
      browser.idle()
      await vi.advanceTimersByTimeAsync(0)
      network.push(wasmURL, Math.floor(WASM_BYTES / 2))
      await vi.advanceTimersByTimeAsync(0)
      const progress: number[] = []
      const { done } = preloadCore((fraction) => {
        progress.push(fraction)
      })
      network.finish(coreURL)
      network.push(wasmURL, WASM_BYTES)
      network.finish(wasmURL)
      await done

      expect(progress[0]).toBeCloseTo(0.5, 2)
      expect(progress.at(-1)).toBe(1)
      expect(network.requests).toHaveLength(2)
    })
  })
})
