# The ffmpeg core lives in Cache Storage, served by a core-only service worker

The ffmpeg core is 32 MB (10.3 MB gzipped), and returning visitors kept downloading it again: GitHub Pages serves every file with `max-age=600` and an ETag made of the file's modification time and size, so each deploy invalidates the cached copy even when the hashed file is byte for byte the same, and the browser's shared HTTP cache evicts a large entry within days. Pages allows no custom headers. So the app keeps the core itself: the page downloads it while idle and writes it into Cache Storage, and a service worker answers the two `ffmpeg-core-*` URLs from there, falling back to the network. The hash in the file name makes cache-first safe; a new core version replaces the old one once it is complete.

## Considered options

- **Moving hosting to set `immutable` headers** (Cloudflare Pages, Netlify): fixes the deploy invalidation, not the eviction. Still open as a later step; it doesn't conflict with this.
- **Cache Storage without a service worker, handing ffmpeg blob URLs**: loses Chrome's cache of the compiled wasm, so the fresh worker every 20 calls would compile 32 MB again.
- **A public CDN**: browsers partition the HTTP cache per site, so there's no shared copy to gain, and it adds a third-party request to a tool that promises nothing leaves the browser.

## Consequences

- The service worker covers the two core files only, never the app shell, so no visitor gets stuck on an old app version. A bad worker is fixed by shipping a new `sw.js`; it is registered in production builds only.
- The page, not the service worker, writes the cache: on a first visit the page isn't controlled yet, and the page is where download progress and the stall limit are shown.
- Safari deletes a site's storage after 7 days without a visit; Safari users download the core again after a week away.
