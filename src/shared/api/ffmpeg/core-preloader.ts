/*
The same pinned files `ffmpeg.ts` hands to `load()`, so the bytes fetched here are the ones the
worker asks for next (from the browser's HTTP cache).
*/
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

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
by a failure. `fraction` is how much of the wasm has arrived (0 to 1) while `isRunning`.
*/
const shared = {
  download: undefined as Promise<void> | undefined,
  isRunning: false,
  fraction: 0,
  listeners: new Set<Listener>(),
}

function report(next: number) {
  shared.fraction = next
  for (const listener of shared.listeners) listener(next)
}

/*
Reads one file to its end and drops the bytes: the browser's HTTP cache keeps the response, which
is where the worker's own request finds it. `onChunk` hears every chunk's size.
*/
async function fetchThrough(
  url: string,
  signal: AbortSignal,
  onChunk: (byteCount: number) => void,
) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  if (!response.body) throw new Error(`${url} came with no body`)
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    onChunk(value.byteLength)
  }
}

async function downloadCore() {
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
  try {
    await Promise.all([
      // Only the wasm's bytes count toward the progress; the script is small.
      fetchThrough(coreURL, controller.signal, armStallTimer),
      fetchThrough(wasmURL, controller.signal, (byteCount) => {
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
  if (shared.fraction < 1) report(1)
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
    shared.listeners.clear()
  }
}

/*
Gets the ffmpeg core into the browser, once for the whole page: every call joins the download
already running, and one that has finished is not repeated. `done` resolves when both files are in
and rejects with a `CoreDownloadError` when the download fails or stalls; a failure clears the
shared download, so the next call starts afresh.

`onProgress` hears the fraction of the wasm that has arrived, from 0 (right away, or from where
the running download is) to 1. A call that finds nothing to download reports nothing.
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
    onProgress(shared.fraction)
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
