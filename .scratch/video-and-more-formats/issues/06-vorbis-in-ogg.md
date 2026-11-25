# 06: Vorbis in Ogg loads and exports .ogg

**What to build:** the user loads a Vorbis `.ogg` file and gets the review screen. The export and the single export write `.ogg` tracks, copied, with the title, number and album written on the stream as for Opus.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Vorbis in Ogg is a supported format, with track format `ogg` and seek twice.
- [ ] A cut spec covers its seek-twice command, its `.ogg` output, and its tags on the stream.
- [ ] The file picker offers `.ogg` and `.oga`.
- [ ] The unsupported message names Vorbis in `.ogg`.
- [ ] A `bursts.ogg` fixture is made by the fixture script and runs in the e2e export spec. Its tracks are `.ogg` and play.
- [ ] The unsupported fixture becomes a FLAC file, made by the fixture script, because Vorbis in Ogg is now supported. The unsupported-file test checks the message names FLAC in FLAC and lists the supported formats.
- [ ] A CHANGELOG line under `## [Unreleased]`.
