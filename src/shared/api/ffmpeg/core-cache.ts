/*
What the page (core-preloader.ts) and the service worker (src/app/sw.worker.ts) agree on, defined
once so the two cannot drift apart: the one cache the ffmpeg core lives in, and which URLs are it.
*/
export const CORE_CACHE_NAME = 'ffmpeg-core'

/*
The files Vite builds for the core: `assets/ffmpeg-core-<hash>.js` and `.wasm`. The hash is what
makes keeping a copy safe: a new core has new names. The dev server's names carry no hash and
never match, and the service worker never runs there.
*/
const CORE_FILE = /\/ffmpeg-core-[\w-]+\.(?:js|wasm)$/

export function isCoreUrl(url: string) {
  return CORE_FILE.test(new URL(url).pathname)
}
