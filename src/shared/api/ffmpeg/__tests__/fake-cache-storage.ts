import { vi } from 'vitest'

// Where the fake resolves relative URLs, as a real Cache resolves them against the page.
export const APP_ORIGIN = 'https://app.test/'

function absolute(key: RequestInfo | URL) {
  let url: string
  if (typeof key === 'string') url = key
  else if (key instanceof URL) url = key.href
  else url = key.url
  return new URL(url, APP_ORIGIN).href
}

interface FakeCacheOptions {
  // `caches.open` rejects, as in a window where storage is blocked.
  isBlocked?: boolean
  // `put` rejects after reading the body, as when the quota is full.
  isFull?: boolean
}

/*
A stand-in for `caches` (installed as a global) with one cache of any name. Like a real `put`, it
reads the whole body first and keeps the entry only if that succeeds, so a body that breaks off
stores nothing. `urls()` lists what it holds, as absolute URLs; `seed` puts an entry in directly.
*/
export function fakeCacheStorage(options: FakeCacheOptions = {}) {
  // Keyed by absolute URL.
  const entries: Record<string, Response | undefined> = {}
  const cache = {
    match(key: RequestInfo | URL, matchOptions?: CacheQueryOptions) {
      const stored = entries[absolute(key)]
      /*
      As a real cache does, a response that varies on a header only answers a request that sends
      the same value for it; the stored requests here never sent `Origin`. `ignoreVary` is what
      core-request.ts passes to get past it.
      */
      const isVaried =
        !matchOptions?.ignoreVary &&
        stored?.headers.get('vary') === 'Origin' &&
        key instanceof Request &&
        key.headers.has('origin')
      return Promise.resolve(isVaried ? undefined : stored?.clone())
    },
    async put(key: RequestInfo | URL, response: Response) {
      const bytes = await response.arrayBuffer()
      if (options.isFull) throw new DOMException('The quota is full', 'QuotaExceededError')
      entries[absolute(key)] = new Response(bytes, { headers: response.headers })
    },
    keys(key?: RequestInfo | URL) {
      const wanted = key === undefined ? undefined : absolute(key)
      const found = Object.keys(entries).filter((url) => wanted === undefined || url === wanted)
      return Promise.resolve(found.map((url) => ({ url })))
    },
    delete(key: RequestInfo | URL) {
      const url = absolute(key)
      const isHeld = entries[url] !== undefined
      Reflect.deleteProperty(entries, url)
      return Promise.resolve(isHeld)
    },
  }
  const open = vi.fn(() =>
    options.isBlocked
      ? Promise.reject(new DOMException('Storage is blocked', 'SecurityError'))
      : Promise.resolve(cache),
  )
  vi.stubGlobal('caches', { open })
  return {
    open,
    urls: () => Object.keys(entries),
    // Bypasses `put`, so a cache that refuses writes can still hold an older core.
    seed(url: string, text = 'stored', headers?: Record<string, string>) {
      entries[absolute(url)] = new Response(text, { headers })
    },
    async textOf(url: string) {
      return entries[absolute(url)]?.text()
    },
  }
}
