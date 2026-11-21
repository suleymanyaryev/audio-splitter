# 02: Download while idle

**What to build:** the ffmpeg core starts downloading as soon as the load page has drawn and the browser is idle, before I choose a file, so by the time I've found my file the wait is shorter or gone. If my browser asks to save data, nothing downloads until I choose a file. The background download is silent: no progress and no error while no file is chosen. Choosing a file mid-download shows the percentage from where it already is; choosing one after a failed background download starts the download again.

**Blocked by:** 01 (The visible, stall-tolerant download)

**Status:** ready-for-agent

Spec: `.scratch/ffmpeg-load-time/spec.md` (stories 1–7)

- [ ] The preloader exposes an idle start: after first paint, when the browser is idle, unless the browser signals Save-Data. A failed idle start reports nothing and leaves the next caller to start afresh.
- [ ] The app's entry calls the idle start after mounting, in dev and in production.
- [ ] A load that begins during the idle download joins it: its first progress is the current fraction, and no second request goes out.
- [ ] Specs: the idle start begins on idle and not before; not at all under Save-Data; silent on failure, with the next call starting a new download; a caller joining mid-download sees the current fraction and no second request.
- [ ] Checked by hand in Chrome with the `playwright-cli` skill: on opening the page the core's download appears in the Network panel before a file is chosen; choosing a file mid-download continues the percentage.
- [ ] `docs/architecture.md` says when the preload starts and why Save-Data skips it. CHANGELOG under Unreleased, Changed: the ffmpeg download starts while the page waits for a file.
