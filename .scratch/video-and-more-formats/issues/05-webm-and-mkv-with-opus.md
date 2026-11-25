# 05: WebM and MKV with Opus load and export .opus

**What to build:** the user loads a WebM or MKV file with Opus audio, video or audio only, and gets the review screen as for audio. The export and the single export write audio-only `.opus` tracks, copied, with no video stream.

**Blocked by:** 03

**Status:** resolved

- [x] Opus in WebM or Matroska is a supported format, with track format `opus` and seek twice. A single seek before the input is never used for it: it breaks the Ogg output (analysis.md).
- [x] A probe spec covers a WebM log and an MKV log, from ticket 01's captured lines. A cut spec covers its seek-twice command and its `.opus` output with tags on the stream.
- [x] The file picker offers `.webm` and `.mkv`.
- [x] The unsupported message names Opus in `.opus`, `.webm` or `.mkv`.
- [x] A `bursts-video.webm` fixture (160×90 test picture, Opus bursts) is made by the fixture script and runs in the e2e export spec. Its tracks are `.opus`, play, and hold no video stream.
- [x] A CHANGELOG line under `## [Unreleased]`.

## Comments

- **Length by the audio stream.** The probe now reads the `DURATION` line in the metadata under the first `Audio:` stream line, and falls back to the container's `Duration`. It stops at the next `Stream #` line, so a picture's own `DURATION` is never taken, and an MP4 or MOV log (which has no such line) still falls back, as in ticket 04. A WebM whose picture runs 3 s past the audio gives 600.021 s, not 603 s (story 25 holds for WebM and MKV; the MP4 gap is logged in ticket 04).
- **Not asserted anywhere:** the decoded frame count equalling the probe's length. The Matroska Opus quirk from ticket 01 (+72 frames, the decode 8 ms off native's) breaks nothing: the length feeds only the slice count, the clip clamp and the time axis. The quirk is not corrected here, as ticket 01 found it harmless.
- **Seek.** The pair is `seek: 'twice'`, so no cut for it can use a single input seek; the `cut-track.ts` comment now says why (a single seek breaks Matroska Opus).
- Added `webmProbeLog` to `fake-ffmpeg.ts` for the store spec, which cuts a WebM source as `.opus` with the tags on the stream. The cut spec's seek-twice and `.opus` cases from ticket 03 already cover the command itself.
- A spec for AAC in Matroska (story 28) is in the probe spec.
- e2e: `bursts-video.webm` is a 160x90 VP9 test picture with Opus bursts; the "no video" regex now also matches `V_VP9`, and a sanity test checks that both video fixtures match it, so the check can fail. Re-running `make-fixtures.sh` again rewrote `bursts.opus` and `unsupported-vorbis.ogg` byte-differently; restored from git.
- Verified: `pnpm typecheck`, `pnpm test:changed` (884 tests), `pnpm lint:changed`, `e2e/export.spec.ts` (12 tests, run twice with the probe change in between).
- Code review (Standards and Spec axes). Fixed: a stale seek comment, a tautological spec (the picture's DURATION now differs from the container's), the clock parsing (one `CLOCK` pattern, a match-taking helper), the probe's header example, and the fake WebM log. Left alone as judgement calls: the supported-pair list repeated in the message, the file dialog and the panel text; the e2e regex repeated three times (two sit inside `page.evaluate`, which cannot close over a constant); the MKV spec that only changes the log's path (kept as documentation).
