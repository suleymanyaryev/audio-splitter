# 08: Milestone close: shown in the browser and confirmed

**What to build:** the milestone, finished and shown. Each new pair is loaded, reviewed and exported in the browser, then work stops for the user's confirmation, as AGENTS.md's learning-first step 4 asks.

**Blocked by:** 04, 05, 06, 07

**Status:** resolved

- [x] The README's "What it does" and the architecture doc's probe and export lines describe the five supported formats and track formats (the finish-feature skill).
- [x] The milestones file marks milestone 3 done, and the spec's status is resolved.
- [x] The Final tier passes: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`, and `pnpm test:e2e`, because the new fixtures run in a real browser.
- [x] An MP4, a WebM and an Ogg Vorbis stand-in are each loaded, split and exported in the browser, and the user is shown them.
- [x] Work stops until the user confirms the milestone.

## Comments

- The user confirmed the milestone on 2026-11-25, after seeing the three pairs in headless Chrome: a 1 h Vorbis `.ogg` (34 `.ogg` tracks), a 30 s WebM with Opus (3 `.opus` tracks) and a 1.24 GB 1 h MP4 with AAC (loaded in 13.5 s, 34 `.m4a` tracks of 90 MB in all). No exported track held a video stream.
- Docs synced: README ("What it does" step 1 and 5, the concept-note list gains note 12), `docs/architecture.md` (the probe's outcome and the export's audio-only tracks), concept notes 07 and 12 (where it lives, the seek method), GLOSSARY.md ("Seek method"; "and later" removed), the milestones file (milestone 3 done, with the known gap) and the spec (resolved).
- Final tier, run after the last code change: `pnpm verify` (2289 tests), `pnpm lint`, `pnpm knip` and `pnpm depcruise` pass, and `CI=1 pnpm test:e2e` passes 20 of 20 (headless; the config is headed off CI, which is why `CI=1`).
- Whole-feature code review (Standards and Spec axes) found no hard problem. Fixed in this commit: stale words in the glossary, milestones file and note 07; a long comment; a describe title; a WAV probe spec; the captured MOV log; a CHANGELOG sentence on the known gap. Left as judgement calls: `format` and `seek` as two values, the supported-format sentence spelled out in several places.
- Known gaps, for whoever picks this up: an MP4 or MOV whose picture runs past its audio shows the picture's length (ticket 04); video decodes up to 2.4x slower than audio alone, which the user accepted (ticket 01, limit raised to 3x); nothing is known above 4.84 GB (ticket 07).
