# 01: The visible, stall-tolerant download

**What to build:** when I choose a source file and the ffmpeg core isn't in the browser yet, the load page shows "Downloading ffmpeg… N%" growing as bytes arrive, then "Reading <file>…" as today. A slow but steady connection always finishes; the download fails only after 30 s with no bytes, and the failure line says it failed at downloading ffmpeg. Cancel stops loading the file but lets the download run on, and choosing another file continues it rather than starting again. Nothing is kept beyond the browser's HTTP cache yet (that is ticket 03).

**Blocked by:** None (can start immediately)

**Status:** resolved

Spec: `.scratch/ffmpeg-load-time/spec.md` (stories 7, 20–37, 42)

- [ ] A core preloader in the ffmpeg session's slice downloads the ffmpeg core's two files (the script and the wasm, at their built hashed URLs) as streams, behind one shared promise that every caller awaits; callers subscribe to its progress and can unsubscribe without stopping it.
- [ ] Progress is a fraction of the wasm's unpacked size, a constant fixed at build time, ending at 1. The script isn't counted.
- [ ] The stall rule: no bytes for 30 s rejects with an error that says the download stalled. There is no total time limit.
- [ ] A failed download rejects its callers and clears the shared promise, so the next caller starts afresh.
- [ ] `openFfmpeg` takes an optional progress callback, awaits the preloader before the first `load()` (and before a fresh worker's), and its 180 s load watchdog starts only after the preloader has resolved.
- [ ] The `source-file` store holds a download fraction while `loading` (set while progress comes in, cleared when the download is done), names the failure step "downloading ffmpeg" for a failed download, and keeps "probe" and the slice steps as they are. Cancel and a new load unsubscribe without stopping the download.
- [ ] The load page shows a progress bar labelled "Downloading ffmpeg… N%" while the fraction is set, announced like the reading step, then "Reading <file>…" and the slice count as today; its failure line names "downloading ffmpeg".
- [ ] Specs: the preloader with a fake streaming `fetch` and fake timers (one shared download, growing progress, unsubscribe, the 30 s stall, slow steady bytes over many minutes resolving, a failure clearing the promise); the ffmpeg session with the preloader mocked (`load()` after it, progress passed on, its rejection passed on, the watchdog not counting the download, a fresh worker awaiting it); the store (the fraction, the failure step, Cancel mid-download); the load page (the percentage, then reading, the failure line).
- [ ] Checked by hand in Chrome with the `playwright-cli` skill, throttled to "Slow 4G": the percentage grows, a load past 180 s still finishes, Cancel mid-download leaves the request running.
- [ ] `docs/architecture.md`: the load diagram gains the download step and "The ffmpeg session" describes the preloader and the stall rule; the `ffmpeg-session` skill mentions the preloader. CHANGELOG under Unreleased: Changed (the download is shown with its progress) and Fixed (a slow connection no longer times out loading ffmpeg; the failure names the download instead of "probe").
