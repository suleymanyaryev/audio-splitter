# 05: WebM and MKV with Opus load and export .opus

**What to build:** the user loads a WebM or MKV file with Opus audio, video or audio only, and gets the review screen as for audio. The export and the single export write audio-only `.opus` tracks, copied, with no video stream.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Opus in WebM or Matroska is a supported format, with track format `opus` and seek twice. A single seek before the input is never used for it: it breaks the Ogg output (analysis.md).
- [ ] A probe spec covers a WebM log and an MKV log, from ticket 01's captured lines. A cut spec covers its seek-twice command and its `.opus` output with tags on the stream.
- [ ] The file picker offers `.webm` and `.mkv`.
- [ ] The unsupported message names Opus in `.opus`, `.webm` or `.mkv`.
- [ ] A `bursts-video.webm` fixture (160×90 test picture, Opus bursts) is made by the fixture script and runs in the e2e export spec. Its tracks are `.opus`, play, and hold no video stream.
- [ ] A CHANGELOG line under `## [Unreleased]`.
