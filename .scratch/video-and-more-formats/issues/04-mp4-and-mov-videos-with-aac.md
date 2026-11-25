# 04: MP4 and MOV videos with AAC load and export .m4a

**What to build:** the user loads an MP4 or MOV video with AAC audio and gets the review screen as for audio. The export and the single export write audio-only `.m4a` tracks, copied, with no video stream.

**Blocked by:** 03

**Status:** resolved

- [x] A video file with AAC audio is a supported format, with track format `m4a` and seek once, as `.m4a` already is.
- [x] The source file's length is its first audio stream's length, read from the probe log as ticket 01 recorded it, with the container's `Duration` as the fallback. A probe spec covers a video that runs past its audio.
- [x] A probe spec covers a log with a video stream before the audio stream, from ticket 01's captured lines.
- [x] The file picker offers `.mp4`, `.m4v` and `.mov`.
- [x] The unsupported message names AAC in `.m4a`, `.mp4` or `.mov`.
- [x] A `bursts-video.mp4` fixture (160×90 test picture, AAC bursts) is made by the fixture script and runs in the e2e export spec. Its tracks are `.m4a`, play, and hold no video stream.
- [x] A CHANGELOG line under `## [Unreleased]`.

## Comments

- **Known gap, story 25 for MP4 and MOV.** The probe takes the container's `Duration`, because an MP4 or MOV log has no length of the audio stream alone (ticket 01). A picture that runs past its audio therefore makes the source file that much longer: the 603 s stand-in with 600 s of audio loads as 603 s. Measured natively: the last slice is tiny, not empty (1,280 bytes, exit 0), so the load works; the timeline and the last track show the extra seconds as silence, while the exported file ends at the audio's end. WebM and MKV give the audio's own `DURATION` line, which ticket 05 reads. Fixing MP4 and MOV would need the audio's length from the decode (its frame count) or a `-c copy -f null` pass; neither is in this spec. The probe spec for this case documents the 603 s, and `probe.ts` says why.
- The probe's reading of a video with the picture first needed no code change: the existing regex already takes the first `Audio:` line (the analysis predicted it), so the new probe specs passed at once. The only red step was the new message.
- The README's "What it does", `docs/architecture.md` and the milestone's other docs are left to ticket 08, as its checklist says; the CHANGELOG has two lines now (Added: video loads and exports; Changed: the message).
- `bursts-video.mp4`: 160x90 `testsrc` at 10 fps, AAC from the same bursts. Re-running `make-fixtures.sh` rewrote two committed fixtures (bursts.opus, unsupported-vorbis.ogg: encoders are not byte-stable), which I restored from git; only the new file is added.
- The e2e video case failed once, in the single-export test, right after a lint run, and passed in 36 repeat runs and three full-file runs after it. Not reproduced; cause unknown.
- Verified: `pnpm typecheck`, `pnpm test:changed` (834 tests), `pnpm lint:changed`, `e2e/export.spec.ts` (9 tests).
- Code review (Standards and Spec axes). Fixed: a comment beside the Duration read, a misplaced probe test, the e2e comments, a sanity test that the video fixture holds a video stream (so the "no video in a track" check can fail), and the CHANGELOG split. Left alone: `.m4v` is in the file dialog but not in the copy (the spec's accept list names it); the long message repeated in specs (literals are the repo's style).
