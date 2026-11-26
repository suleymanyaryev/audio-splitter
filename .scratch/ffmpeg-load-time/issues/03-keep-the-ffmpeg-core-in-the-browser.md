# 03: Keep the ffmpeg core in the browser

**What to build:** once downloaded, the ffmpeg core stays in the browser: a visit the next day, a week later, or after a release that didn't change ffmpeg loads it with no download, and the app works offline from the second load on. A release with a new ffmpeg core downloads it once, and the old copy goes once the new one is complete. A broken-off download never leaves a half copy. In a private window or with storage blocked or full, the app loads from the network as in ticket 01, without an error. The app's own pages and code keep updating as before. See ADR 0003 for why the copy lives in Cache Storage behind a service worker.

**Blocked by:** 01 (The visible, stall-tolerant download)

**Status:** resolved

Spec: `.scratch/ffmpeg-load-time/spec.md` (stories 8–14, 18–19, 38–41, 43–46)

- [ ] One shared module defines the Cache Storage name and the rule for which URLs are the ffmpeg core (the built `ffmpeg-core-*` script and wasm, nothing else); the preloader and the service worker both import it.
- [ ] The preloader looks in Cache Storage first and resolves on a complete hit with no request. On a miss it writes each file only once all its bytes have arrived, and after both are stored deletes every other entry in that cache.
- [ ] Without Cache Storage (missing, throwing, or a write refused for quota) the preloader downloads with the same progress and stall rule and resolves; a failed write never fails the call and reports nothing.
- [ ] The service worker's request handling is a plain module: an ffmpeg core URL is answered from Cache Storage, else from the network with nothing written; every other request is left to the browser.
- [ ] The service worker entry wires the `fetch` event to that module, takes control on activation, and is built by Vite to a fixed, unhashed `sw.js` at the build's root. The app's entry registers it in production builds only.
- [ ] The URLs given to ffmpeg's `load()` stay the built hashed URLs, so the service worker answers ffmpeg's worker.
- [ ] Specs: the preloader with a fake Cache Storage (a hit with no request; a miss storing both; older entries deleted only after both are stored, never after a failure; a broken-off download storing nothing; missing, throwing and refusing Cache Storage each resolving from the network silently); the request handler (a core URL from the cache, from the network on a miss with nothing written, other URLs untouched, the URL rule matching the built names only).
- [ ] e2e: a spec in its own Playwright project served by a production build (`pnpm build-only` then `pnpm preview`) loads a fixture to review, sets the context offline, reloads, and loads the fixture to review again. The existing export spec stays on the dev server. `pnpm test:e2e` runs in Final.
- [ ] Checked by hand in Chrome with the `playwright-cli` skill on a production preview: a reload serves both core files from the service worker, and the worker restart every 20 calls stays under 100 ms (if it doesn't, stop and revisit ADR 0003).
- [ ] `docs/architecture.md` describes the stored copy, the service worker's scope and Safari's 7-day storage rule; the `ffmpeg-session` skill mentions both. CHANGELOG under Unreleased, Changed: ffmpeg is downloaded once and kept in the browser across visits and releases.
