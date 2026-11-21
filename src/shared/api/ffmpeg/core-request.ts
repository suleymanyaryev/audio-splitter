import { CORE_CACHE_NAME, isCoreUrl } from './core-cache.ts'

async function fromCache(request: Request): Promise<Response | null> {
  try {
    const cache = await caches.open(CORE_CACHE_NAME)
    /*
    `ignoreVary`: the server says its response varies on `Origin`, and the ffmpeg worker's
    request carries one that the page's own download did not. The file is the same.
    */
    return (await cache.match(request, { ignoreVary: true })) ?? null
  } catch {
    // Storage that cannot be read is a miss: the network has the file.
    return null
  }
}

/*
What the service worker does with a request. An ffmpeg core file is answered from Cache Storage,
else from the network; nothing is ever written here, because the page writes the cache and a
first visit (when the page is not controlled yet) must lose nothing. Any other request gets
`null`: the worker leaves it to the browser, so the app's own pages and code update as always.
*/
export function answerCoreRequest(request: Request) {
  return isCoreUrl(request.url) ? answer(request) : null
}

async function answer(request: Request) {
  return (await fromCache(request)) ?? fetch(request)
}
