# 08: Milestone close: shown in the browser and confirmed

**What to build:** the milestone, finished and shown. Each new pair is loaded, reviewed and exported in the browser, then work stops for the user's confirmation, as AGENTS.md's learning-first step 4 asks.

**Blocked by:** 04, 05, 06, 07

**Status:** ready-for-agent

- [ ] The README's "What it does" and the architecture doc's probe and export lines describe the five supported formats and track formats (the finish-feature skill).
- [ ] The milestones file marks milestone 3 done, and the spec's status is resolved.
- [ ] The Final tier passes: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`, and `pnpm test:e2e`, because the new fixtures run in a real browser.
- [ ] An MP4, a WebM and an Ogg Vorbis stand-in are each loaded, split and exported in the browser, and the user is shown them.
- [ ] Work stops until the user confirms the milestone.
