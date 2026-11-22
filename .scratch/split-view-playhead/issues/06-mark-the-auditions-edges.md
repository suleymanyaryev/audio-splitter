# 06: Mark the audition's edges

**What to build:** The Split view's canvas shows where the audition's 8 s starts and ends inside the 20 s zoom window, so a click outside it is no surprise. The mark must not read as the ground drawn before 0 s and past the file's end, which means "outside the file" (spec: user stories 15–16).

- The look (a light tint outside the 8 s, or short ticks at the frame, or another option) is chosen against DESIGN.md, using its tokens, and works in the light and dark themes. Read DESIGN.md before choosing.
- Where the audition is held at a file's edge, the mark follows the held edge.
- The mark sits under the split lines and the playhead, and the frame stays the outermost line.
- Moving the split moves the mark with it.

**Blocked by:** 02 (Pause and resume the audition), for the audition's extent.

**Status:** ready-for-human

- [x] The audition's edges are visible in the Split view, distinct from the outside-file ground
- [x] The mark follows the split when it moves, and the file's edges when the audition is held at them
- [ ] Checked in the browser in both themes (playwright-cli), with a screenshot shown to the user for confirmation
- [x] DESIGN.md records the new mark if it adds a token or a rule
- [x] Split view spec covers where the edges are drawn, if the existing canvas cases allow it; `CHANGELOG.md` line updated

## Comments

- Waiting on the user: the "Checked in the browser ... screenshot shown to the user for confirmation" box stays unticked until they confirm the look. Screenshots (light, dark, and the audition held at the file's start): /private/tmp/claude-501/-Users-suleyman-Projects-misc-audio-splitter-feat-split-view-changes/622f1af4-8105-44e6-8f51-9621622c8016/scratchpad/split-view-playhead-screenshots/split-light.png, split-dark.png, split-file-start.png, split-file-start-dark.png. The ticket is `ready-for-human` until then; on a yes, tick the box and set `Status: resolved`.
- Look chosen against DESIGN.md: `ink` brackets at the frame (a 2 px stem, 16 px long, at the top and the bottom, each ending in an 8 px foot pointing at the audition). A tint would break the Flat Sleeve Rule and look like the flat `ground` outside the file. No new token. A held edge follows because the extent is already held to the file.
- Not checked in a browser: an audition held at the file's end (same code path as the start).
- DESIGN.md's Zoom view bullet also had its stale "while a clip plays" playhead sentence corrected.
- Code-review fixes: three unused exports dropped (knip), a duplicate header comment removed, `draw()` split so `drawAuditionEdges` stands alone. Two lint errors from tickets 04 and 06 (`use-split-drag.ts` multiline block, `draw()` cognitive complexity) that `lint:changed` had hidden were fixed.
- Final tier, run after the last code change: `pnpm verify -> pass` (100 files, 1789 tests, build), `pnpm lint -> pass`, `pnpm knip -> pass`, `pnpm depcruise -> pass`, `pnpm typecheck -> pass`. `pnpm test:e2e` not run: the spec names no real browser flow that unit tests can't cover.
- This ticket has no `Final tier passes` box, and the implement skill has no step 5; the Final tier above stands in for it.
