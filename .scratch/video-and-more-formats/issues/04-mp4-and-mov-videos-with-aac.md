# 04: MP4 and MOV videos with AAC load and export .m4a

**What to build:** the user loads an MP4 or MOV video with AAC audio and gets the review screen as for audio. The export and the single export write audio-only `.m4a` tracks, copied, with no video stream.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A video file with AAC audio is a supported format, with track format `m4a` and seek once, as `.m4a` already is.
- [ ] The source file's length is its first audio stream's length, read from the probe log as ticket 01 recorded it, with the container's `Duration` as the fallback. A probe spec covers a video that runs past its audio.
- [ ] A probe spec covers a log with a video stream before the audio stream, from ticket 01's captured lines.
- [ ] The file picker offers `.mp4`, `.m4v` and `.mov`.
- [ ] The unsupported message names AAC in `.m4a`, `.mp4` or `.mov`.
- [ ] A `bursts-video.mp4` fixture (160×90 test picture, AAC bursts) is made by the fixture script and runs in the e2e export spec. Its tracks are `.m4a`, play, and hold no video stream.
- [ ] A CHANGELOG line under `## [Unreleased]`.
