# The ffmpeg core: downloaded while idle, kept in the browser

Status: ready-for-agent

A change outside the milestone sets. Vocabulary is in `GLOSSARY.md`; this spec adds **ffmpeg core** (see Further Notes). The storage decision is ADR 0002, "The ffmpeg core lives in Cache Storage, served by a core-only service worker".

## Problem Statement

The first thing that happens after I choose a source file is a download I can't see: the ffmpeg core, 32 MB (about 10 MB over the wire). The page says "Reading <file>…" the whole time.

- It happens again and again. If I open the app after a couple of days, or after a new release, it downloads the core again from scratch, even though nothing about it changed.
- On a slow connection it fails. The load gives up after 180 s whether or not bytes are still arriving, and the failure says "Failed at: probe", which tells me nothing about what went wrong. Trying again starts the download from zero, so it fails the same way.
- The download only starts once I've chosen a file, so I wait for it every time, even though the app had been sitting open with nothing to do.

## Solution

- **The download starts before I choose a file.** When the load page opens and the browser is idle, the app starts downloading the ffmpeg core in the background. If my browser asks to save data (Save-Data), it waits until I choose a file.
- **It's downloaded once and kept.** The ffmpeg core stays in the browser, so a later visit, the next day or after a release, loads it with no download. A new download happens only when the app ships a different ffmpeg core, and the old copy is removed once the new one is complete.
- **I can see the download.** If I choose a file before the download has finished, the load page shows "Downloading ffmpeg… 38%" first, then "Reading <file>…" as today.
- **A slow connection finishes.** The download has no time limit as long as bytes keep arriving; it fails only after 30 s with nothing. The failure says it was the ffmpeg download that failed.
- **Cancel doesn't waste the download.** Cancel stops loading that file, but the download continues, so the next file starts sooner.

## User Stories

### Downloading before a file is chosen

1. As a user opening the app for the first time, I want the ffmpeg core to start downloading while I find my file, so that the wait after I choose it is shorter or gone.
2. As a user, I want the background download to start only when the page has finished drawing and the browser is idle, so that it never slows down the page appearing.
3. As a user whose browser asks to save data, I want no background download, so that the app spends my data only once I've actually chosen a file.
4. As a user whose browser asks to save data, I want loading a file to work exactly as before, so that saving data costs me nothing but the head start.
5. As a user, I want the background download to make no noise while I haven't chosen a file: no progress and no error, so that the load page stays as calm as today.
6. As a user whose background download failed before I chose a file, I want choosing a file to start the download again, so that an earlier hiccup doesn't block me.
7. As a user, I want choosing a file while the background download is under way to continue that download, not start a second one, so that no bytes are fetched twice.
8. As a user who already has the ffmpeg core in the browser, I want opening the app to download nothing, so that a return visit costs no data.

### Keeping it

9. As a returning user, I want the ffmpeg core loaded from the browser with no download, so that a file starts reading right away.
10. As a user returning days later, I want the ffmpeg core still there, so that a few days of other browsing don't cost me the download.
11. As a user returning after the app was released again with the same ffmpeg core, I want no new download, so that a release that didn't touch ffmpeg costs me nothing.
12. As a user returning after a release with a new ffmpeg core, I want the new one downloaded once, so that I get it without doing anything.
13. As a user, I want the old ffmpeg core removed once the new one is complete, and not before, so that the browser keeps one copy and I'm never left without a working one.
14. As a user whose download broke off, I want no half copy kept, so that a later visit never loads a broken ffmpeg core.
15. As a user who has loaded a file successfully, I want the app to ask the browser once to keep its stored data, so that the browser is less likely to clear the ffmpeg core when space runs low.
16. As a Firefox user, I want that request to come after my first successful load, not when the page opens, so that its prompt appears when I know what the app is for.
17. As a user whose browser refuses that request, I want nothing to change, so that a refusal never gets in the way.
18. As a user in a private window or with storage blocked or full, I want the app to load the ffmpeg core from the network as before, with the visible progress and the stall rule, so that failing to keep it never breaks a load.
19. As a user whose browser couldn't store the ffmpeg core, I want no error about it, so that I'm not told about something I can't act on and that didn't stop the load.

### Seeing the download

20. As a user who chose a file while the ffmpeg core is still downloading, I want "Downloading ffmpeg… N%" in place of "Reading <file>…", so that I know what the app is waiting for.
21. As a user, I want the percentage to grow as bytes arrive, so that I can tell a slow download from a stuck one.
22. As a user who chose a file after the background download had already got partway, I want the percentage to start from where it is, so that the head start shows.
23. As a user, I want "Reading <file>…" once the download is done, so that the step after it is told the same way as today.
24. As a user whose ffmpeg core is already in the browser, I want no download step at all, so that the load page goes straight to reading the file.
25. As a screen reader user, I want the download step announced like the reading step, so that I hear what the app is doing.
26. As a user, I want the percentage to be honest whatever the connection compresses, so that 100% means done.

### Slow and broken connections

27. As a user on a slow but steady connection, I want the download to go on as long as bytes keep arriving, so that a 10-minute download finishes rather than being cut off at 3 minutes.
28. As a user whose connection drops, I want the download to fail after 30 s with no bytes, so that I'm not left watching a dead percentage.
29. As a user whose download failed, I want the failure line to say it failed at downloading ffmpeg, with the reason, so that I know it was the connection and not my file.
30. As a user whose download failed, I want "Choose another file" to try the download again, so that I can retry once the connection is back.
31. As a user, I want the time limit on getting ffmpeg ready to apply only once the bytes are in the browser, so that it limits the browser's work and never the network.
32. As a user whose file fails to probe, I want the failure still to say "probe", so that the step names stay accurate.

### Cancel

33. As a user who pressed Cancel during the download, I want the load page back as it was before I chose the file, so that Cancel behaves as it always has.
34. As a user who pressed Cancel during the download, I want the download to carry on in the background, so that choosing another file starts sooner.
35. As a user who pressed Cancel and then chose another file while the download was still running, I want the download step to continue from where it was, so that no bytes are fetched twice.
36. As a user, I want closing the tab to stop the download, so that a closed app spends nothing.

### Everything after the load

37. As a user reviewing a long file, I want auditions, playing a range, the export and single exports to work and feel as fast as today, so that keeping the ffmpeg core never costs me anything later.
38. As a user, I want the app's own pages and code to update as they always have after a release, so that keeping the ffmpeg core never leaves me on an old version of the app.
39. As a user, I want the app to keep reading my file only in my browser, so that keeping the ffmpeg core changes nothing about what leaves my computer.
40. As a Safari user who stays away for more than a week, I want the ffmpeg core downloaded again with the visible, stall-tolerant download, since Safari clears the stored copy, so that a long absence costs one download, not a failure.

### Developer

41. As a developer, I want the service worker in production builds only, so that `pnpm dev` behaves as today and a dependency bump can never be answered with a stale core.
42. As a developer, I want the background download, the progress and the stall rule to run in dev too, so that I see the same load steps I ship.
43. As a developer, I want the cache name and the rule for which URLs are the ffmpeg core defined once and shared by the page and the service worker, so that the two can't drift apart.
44. As a developer, I want a broken service worker fixed by shipping a new one, so that no separate kill switch is needed.
45. As a developer, I want one e2e spec that proves a second visit loads offline, so that the whole chain (download, store, serve) is tested in a real browser.
46. As a developer, I want the preloader and the service worker's request handling in plain modules with their own specs, so that no browser is needed to test their rules.

## Implementation Decisions

- **The core preloader is a new module in the ffmpeg session's slice (`shared/api/ffmpeg`).** It owns getting the ffmpeg core's two files (the core script and the wasm, at their hashed built URLs) into the browser.
  - It keeps one download at a time for the whole page: a module-level promise that every caller (the idle start, a load, a fresh worker) awaits. Callers subscribe to its progress; a caller that leaves (a cancelled load) unsubscribes and the download continues.
  - On a call it first looks for both files in Cache Storage under one cache name; a complete hit resolves with no request.
  - On a miss it fetches each file as a stream and reports progress as a fraction of the wasm's unpacked size, a constant fixed at build time. The script is small and is not counted.
  - **The stall rule**: a download fails when no bytes arrive for 30 s. It has no total time limit.
  - It writes a file to Cache Storage only once all of the file's bytes have arrived. After both files are stored, it deletes every other entry (an older ffmpeg core's hashed URLs) from that cache.
  - **Without Cache Storage** (missing, throwing, or a write refused for quota): it downloads with the same progress and stall rule and resolves, leaving the network copy to the browser's HTTP cache. A failed write never fails the call.
  - A failed download rejects that call and clears the shared promise, so the next caller starts afresh (the server's weak ETag rules out resuming).
  - It exposes an idle start: after first paint, when the browser is idle, unless the browser signals Save-Data. An idle start that fails reports nothing.
- **The ffmpeg session waits for the preloader.** `openFfmpeg` takes an optional download-progress callback, passed on to the preloader, and awaits the preloader before the first `load()`. The 180 s load watchdog now covers only loading from local bytes (compiling and instantiating). A fresh worker (every 20 calls, after a stop) awaits the preloader too, which then resolves at once from the cache. The URLs given to `load()` stay the built hashed URLs, so the service worker answers them.
- **The service worker covers the ffmpeg core only.**
  - A TypeScript entry in the `app` layer, built by Vite as an extra input to a fixed, unhashed `sw.js` at the build's root, so its scope is the app's folder.
  - It imports the cache name and the "is this the ffmpeg core" URL rule from the module the preloader uses.
  - Its fetch handling lives in a plain module: for an ffmpeg core URL, answer from Cache Storage, else from the network. It never writes to the cache (the page does), so a first visit, when the page isn't controlled yet, loses nothing. Every other request is left alone: the app shell, scripts, styles and font are never cached by it.
  - It takes control on activation (`clients.claim`), so the visit that installs it serves the ffmpeg core's later loads. Dedicated workers the page creates are controlled with it.
  - It is registered from the app's entry in production builds only. A fix is shipped as a new `sw.js`; there is no kill switch.
- **The `source-file` store shows the download.**
  - While `loading`, the store holds a download fraction (0 to 1) or nothing. It is set while `openFfmpeg` reports progress and cleared when the download is done, so the page knows which step is on show.
  - The failure step is "downloading ffmpeg" for a failed download; "probe" and the slice steps stay as they are. The steps are tracked the same way as today.
  - Cancel and a new load unsubscribe from the progress; they don't stop the download.
  - After the first file that becomes `ready` in this page's life, the store asks the browser once to keep its stored data (`navigator.storage.persist`, where it exists). Neither the answer nor an error is reported.
- **The load page** shows a progress bar labelled "Downloading ffmpeg… N%" while the download fraction is set, then today's "Reading <file>…" and slice count. Its failure line names "downloading ffmpeg" as the step.
- **The app's entry** starts the preloader's idle start and registers the service worker (production only) after mounting.
- **Dev**: the preloader runs in dev as in production. The dev server's core URLs carry no hash, so the service worker is never registered there and the cache's version clean-up works on whatever URLs the build gives.

## Testing Decisions

- A good test drives a module through its public interface and checks what a caller or the user sees: what a call resolves or rejects with, the progress reported, which requests went out, what Cache Storage holds afterwards, the store's state, the page's text and ARIA. It never reaches into private variables.
- **The core preloader** is the main seam. Specs use a fake `fetch` that streams bytes on demand, a fake Cache Storage and fake timers. Prior art: the ffmpeg session spec's fake timers and watchdog checks.
  - a cache hit resolves with no request;
  - a miss downloads both files, reports a growing fraction ending at 1, and stores both;
  - two callers share one download and both see the progress; a caller that unsubscribes doesn't stop it;
  - 30 s with no bytes rejects with a stall error; slow but steady bytes over many minutes resolve;
  - a broken-off download stores nothing, and the next call starts afresh;
  - older entries are deleted only after both new files are stored, never on a failed download;
  - no Cache Storage, a throwing one, and a refused write each resolve from the network with the same progress, and report nothing;
  - the idle start: begins on idle, not at all under Save-Data, silent on failure.
- **The ffmpeg session** (prior art: its spec, mocking `@ffmpeg/ffmpeg`), with the preloader mocked: `load()` is called only after the preloader resolves; progress reaches the callback; a preloader rejection rejects `openFfmpeg` with its error; the load watchdog starts after the preloader, so a long download doesn't time out; a fresh worker awaits the preloader too.
- **The service worker's request handler** (new plain module), with a fake Cache Storage and `fetch`: an ffmpeg core URL answered from the cache, and from the network on a miss with nothing written; any other URL left to the browser; the URL rule matching the built core names and nothing else.
- **The `source-file` store** (prior art: its spec, with `openFfmpeg` mocked and `fakeFfmpegSession`): the download fraction while progress comes in and cleared after; the "downloading ffmpeg" failure step; Cancel during the download resetting the store; `persist` asked once after the first ready file, not after a failed one and not again after a second, and nothing breaking where it doesn't exist or rejects.
- **The load page** (prior art: its spec): "Downloading ffmpeg… N%" as a progress bar while the fraction is set, "Reading <file>…" after, the failure line naming the download.
- **e2e** (prior art: `e2e/export.spec.ts`): one spec in its own Playwright project, served by a production build (`pnpm build-only` then `pnpm preview`). Load a fixture and wait for review; set the browser context offline; reload; load the fixture again and reach review. The existing export spec stays on the dev server. `pnpm test:e2e` runs in Final for this change.
- The service-worker entry triggers the full test suite when it changes (`scripts/check-scope.ts` lists worker entries); keep it to wiring.
- Checked by hand in Chrome with the `playwright-cli` skill on a production preview: the first visit downloads in the background (DevTools Network), a reload serves both core files from the service worker, a throttled "Slow 4G" load shows the percentage, and a load cancelled mid-download leaves the download running.

## Out of Scope

- A smaller custom ffmpeg build with only the supported formats.
- Moving hosting off GitHub Pages, or any header change.
- Caching the app shell, or working offline beyond the ffmpeg core.
- Starting an ffmpeg worker ahead of time; only the bytes are warmed.
- Resuming a broken-off download from where it stopped.
- Telling the user about storage: whether the ffmpeg core is kept, its size, or a way to clear it.
- A service worker in dev.

## Further Notes

- **Glossary change**, already in `GLOSSARY.md`: **ffmpeg core** (new): the audio toolkit the splitter downloads once and keeps in the browser; probing, decoding and cutting all run in it. _Avoid_: engine, codec library, wasm.
- **Why it downloaded again** (measured on the live site, 2026-11-21): both core files are served with `cache-control: max-age=600`, gzip (10.3 MB for the 32 MB wasm), and a weak ETag made of the file's modification time and size, `W/"6b012c42-1ebd3e3"`. Every deploy rewrites the modification time, so it invalidates the cached copy even though the hashed file is unchanged. Large entries in the browser's shared HTTP cache are also evicted within days. The full reasoning is ADR 0002.
- **Docs to sync** (the `finish-feature` skill): `docs/architecture.md` gains how the ffmpeg core is preloaded, stored and served, including Safari's 7-day storage rule, under "The ffmpeg session", and its load diagram gains the download step. The `ffmpeg-session` skill mentions the preloader. A CHANGELOG line under Unreleased: Changed (downloaded while idle, kept in the browser, visible progress) and Fixed (slow connections timing out, the failure naming "probe").
- To measure before and after: the time from choosing a file to "Reading <file>…" on a return visit, and the worker restart every 20 calls, which must stay under 100 ms when it loads through the service worker.
