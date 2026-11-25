# 06: Vorbis in Ogg loads and exports .ogg

**What to build:** the user loads a Vorbis `.ogg` file and gets the review screen. The export and the single export write `.ogg` tracks, copied, with the title, number and album written on the stream as for Opus.

**Blocked by:** 03

**Status:** resolved

- [x] Vorbis in Ogg is a supported format, with track format `ogg` and seek twice.
- [x] A cut spec covers its seek-twice command, its `.ogg` output, and its tags on the stream.
- [x] The file picker offers `.ogg` and `.oga`.
- [x] The unsupported message names Vorbis in `.ogg`.
- [x] A `bursts.ogg` fixture is made by the fixture script and runs in the e2e export spec. Its tracks are `.ogg` and play.
- [x] The unsupported fixture becomes a FLAC file, made by the fixture script, because Vorbis in Ogg is now supported. The unsupported-file test checks the message names FLAC in FLAC and lists the supported formats.
- [x] A CHANGELOG line under `## [Unreleased]`.

## Comments

- `TrackFormat` gains `ogg` (Vorbis). Ogg with Opus is still `opus`: the probe tells them apart by the codec, as the spec says. Vorbis keeps the 60 s slices (only MP3 has longer ones), covered by a slice-count spec.
- Tags go on the stream for `.opus` and `.ogg`, by one condition in `tagArguments`; the cut spec has the full command for `.ogg`.
- The old unsupported example was Vorbis in Ogg, in three specs, the App spec and `LoadPage.spec`; all now use FLAC (`flacProbeLog` replaces `vorbisProbeLog` in the fake). Concept note 01 said an `.ogg` with Vorbis is not supported; it now says a FLAC is not, and its fixture line says "plus a short FLAC".
- `e2e/fixtures/unsupported-vorbis.ogg` was not used by any e2e spec (it only came from the script), so the ticket's "unsupported-file test" did not exist; I added one in `export.spec.ts` that loads `unsupported.flac` and checks the full message. `unsupported-vorbis.ogg` is removed from git, replaced by `bursts.ogg` (same sound, supported now). `unsupported.flac` is 3 s of mono (180 KB), because only its type matters.
- The e2e specs run headed on a developer machine (`headless: isCi` in `playwright.config.ts`); from this ticket on I ran them with `CI=1` to keep them headless (it also sets one worker and two retries). The result is the same, 15 of 15.
- Verified: `pnpm typecheck`, `pnpm test:changed` (885 tests), `pnpm lint:changed`, `e2e/export.spec.ts` (15 tests, headless).
- Code review (Standards and Spec axes). Fixed: concept note 01's stale lines, a long comment, the header of the e2e helper, a shadowed spec variable, a duplicate message spec, and `LoadPage.spec`'s old example. Left alone as judgement calls: the Opus-or-Ogg tag condition (a flag on the pair would be speculative for two formats) and the message sentence spelled out in six places (a single source would make the specs tautological).
