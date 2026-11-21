/*
The same pinned files `ffmpeg.ts` hands to `load()`, so the bytes kept here are the ones the
worker asks for next (the service worker answers it from Cache Storage, else the browser's HTTP
cache has them).
*/
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

import { CORE_CACHE_NAME } from './core-cache.ts'

// A download fails when no bytes arrive for this long. It has no total time limit.
const STALL_MS = 30_000

// The most the wasm's bytes alone can report; it still rounds to 100%.
const NEARLY_DONE = 0.999

// The reason a download failed, so a caller can tell it from a failure of its own work.
export class CoreDownloadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CoreDownloadError'
  }
}

type Listener = (fraction: number) => void

/*
The page's one download. `download` is set by the first call, kept after it succeeds and cleared
by a failure. `isRunning` holds from the call until the core is in the browser; `isDownloading`
from the moment nothing was found in Cache Storage, and `fraction` is how much of the wasm has
arrived by then (0 to 1).
*/
const shared = {
  download: undefined as Promise<void> | undefined,
  isRunning: false,
  isDownloading: false,
  fraction: 0,
  listeners: new Set<Listener>(),
}

function report(next: number) {
  shared.fraction = next
  for (const listener of shared.listeners) listener(next)
}

/*
Cache Storage, or nothing where the browser has none, blocks it (a private window) or throws. The
core is then downloaded every time, and no call below ever fails on it.
*/
async function openCoreCache(): Promise<Cache | undefined> {
  try {
    return typeof caches === 'undefined' ? undefined : await caches.open(CORE_CACHE_NAME)
  } catch {
    return undefined
  }
}

// Both files, complete: one without the other is a miss, and the download replaces both.
async function hasBoth(cache: Cache) {
  try {
    const found = await Promise.all([cache.match(coreURL), cache.match(wasmURL)])
    return found.every((response) => response !== undefined)
  } catch {
    return false
  }
}

/*
Stores a copy of a response. `put` reads the whole body before it keeps anything, so a download
that breaks off leaves nothing behind. A refusal (the quota is full) is not worth failing a load.
*/
async function keepCopy(cache: Cache, url: string, copy: Response) {
  try {
    await cache.put(url, copy)
    return true
  } catch {
    return false
  }
}

/*
Removes every entry but the two current files: an older ffmpeg core's hashed names. Whatever the
cache calls them is asked of the cache itself, which resolves the URLs against the page.
*/
async function dropOldCopies(cache: Cache) {
  try {
    const current = await Promise.all([cache.keys(coreURL), cache.keys(wasmURL)])
    const keep = new Set(current.flat().map((request) => request.url))
    const existing = await cache.keys()
    for (const request of existing) {
      if (!keep.has(request.url)) await cache.delete(request)
    }
  } catch {
    // An old copy that stays is only wasted space.
  }
}

/*
Reads one file to its end. With a cache, a second reader of the same response stores the copy as
the bytes arrive; the bytes are otherwise dropped, and the browser's HTTP cache keeps the response.
`onChunk` hears every chunk's size. Resolves to whether the copy was stored.
*/
async function fetchThrough(
  url: string,
  signal: AbortSignal,
  cache: Cache | undefined,
  onChunk: (byteCount: number) => void,
) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  if (!response.body) throw new Error(`${url} came with no body`)
  const stored = cache ? keepCopy(cache, url, response.clone()) : Promise.resolve(false)
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return stored
    onChunk(value.byteLength)
  }
}

// Downloads both files, and tells whether both copies were stored.
async function downloadFiles(cache: Cache | undefined) {
  const controller = new AbortController()
  let stallTimer: ReturnType<typeof setTimeout> | undefined
  // Any chunk of either file counts as life.
  const armStallTimer = () => {
    clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      controller.abort(
        new CoreDownloadError(`The download stalled: no data for ${STALL_MS / 1000} s`),
      )
    }, STALL_MS)
  }

  let wasmBytes = 0
  armStallTimer()
  let stored: boolean[]
  try {
    stored = await Promise.all([
      // Only the wasm's bytes count toward the progress; the script is small.
      fetchThrough(coreURL, controller.signal, cache, armStallTimer),
      fetchThrough(wasmURL, controller.signal, cache, (byteCount) => {
        armStallTimer()
        wasmBytes += byteCount
        // Just short of 1 until the script is in too: the page leaves the download step at 1.
        report(Math.min(wasmBytes / __FFMPEG_WASM_BYTES__, NEARLY_DONE))
      }),
    ])
  } catch (error) {
    // The other file's request has nothing left to do.
    controller.abort()
    if (error instanceof CoreDownloadError) throw error
    throw new CoreDownloadError(error instanceof Error ? error.message : String(error), {
      cause: error,
    })
  } finally {
    clearTimeout(stallTimer)
  }
  report(1)
  return stored.every(Boolean)
}

/*
What a call does once: look in Cache Storage, and only when both files are not there, download
them (a complete copy also clears any older core still beside it). The stall timer starts with the download, never with the look.
*/
async function downloadCore() {
  const cache = await openCoreCache()
  if (cache && (await hasBoth(cache))) {
    // An old core a failed clean-up left behind goes now, without a request.
    await dropOldCopies(cache)
    return
  }
  shared.isDownloading = true
  report(0)
  const areBothStored = await downloadFiles(cache)
  // Only now is the old core safe to drop: a download that broke off keeps the one that works.
  if (cache && areBothStored) await dropOldCopies(cache)
}

// A failure clears the shared download before any caller hears of it, so the next call is afresh.
async function runDownload() {
  try {
    await downloadCore()
  } catch (error) {
    shared.download = undefined
    throw error
  } finally {
    shared.isRunning = false
    shared.isDownloading = false
    shared.listeners.clear()
  }
}

/*
Gets the ffmpeg core into the browser, once for the whole page: every call joins the download
already running, and one that has finished is not repeated. `done` resolves when both files are in
and rejects with a `CoreDownloadError` when the download fails or stalls; a failure clears the
shared download, so the next call starts afresh.

Both files are looked for in Cache Storage first, and a complete copy resolves with no request. A
miss downloads them and stores each file once all its bytes have arrived; after both are stored,
every other entry in that cache (an older ffmpeg core) is deleted. Without Cache Storage, or with a
write it refuses, the download goes the same way and resolves, and nothing is reported.

`onProgress` hears the fraction of the wasm that has arrived, from 0 (once the download starts, or
from where the running download is) to 1. A call that finds the core stored reports nothing.
`unsubscribe` stops the reports and never the download.
*/
export function preloadCore(onProgress?: Listener) {
  if (!shared.download) {
    shared.isRunning = true
    shared.fraction = 0
    shared.download = runDownload()
  }
  if (onProgress && shared.isRunning) {
    shared.listeners.add(onProgress)
    if (shared.isDownloading) onProgress(shared.fraction)
  }
  return {
    done: shared.download,
    unsubscribe() {
      if (onProgress) shared.listeners.delete(onProgress)
    },
  }
}

// Where a browser without `requestIdleCallback` (Safari) waits, so the page has drawn by then.
const IDLE_FALLBACK_MS = 1000

// `navigator.connection` is in Chrome and Android browsers only, and the DOM types lack it.
function isSavingData() {
  const connection = (navigator as { connection?: { saveData?: boolean } }).connection
  return connection !== undefined && connection.saveData === true
}

// Nobody is waiting for the idle download; a load that wants the core asks again.
async function preloadQuietly() {
  try {
    await preloadCore().done
  } catch {
    // Dropped: the failure cleared the shared download already.
  }
}

/*
Starts the download while the page waits for a file: once the browser is idle, which is after the
page has drawn, and not at all when the browser asks to save data (the download then starts when a
file is chosen). It makes no noise: a failure is dropped, and the next `preloadCore` starts afresh.
*/
export function preloadCoreWhenIdle() {
  if (isSavingData()) return
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => void preloadQuietly())
  else setTimeout(() => void preloadQuietly(), IDLE_FALLBACK_MS)
}
