# 03: Play speed remembered across a reload

**What to build:** the play speed set on the page is still there after a reload, as the volume is. On a first visit, with a broken or out-of-range saved value, or with blocked storage, it starts at 1.0 and the control still works for the session.

**Blocked by:** 02 (the store's play speed)

**Status:** resolved

Spec: `.scratch/play-speed-control/spec.md` (stories 24–27; Implementation Decisions, "Tickets 02 and 03", the saving bullets; Testing Decisions)

- [x] The play speed is saved on every change under its own storage key, separate from the volume's.
- [x] Reading it back accepts only a value in range and on the 0.1 grid. Anything else gives 1.0: none saved, not JSON, off the grid, under 0.5, over 2.0, a string, not an object. Every read and write is wrapped, as for the volume.
- [x] Audition store spec:
  - a change is saved and a fresh store reads it back;
  - a table of bad saved values gives 1.0, like the volume's table;
  - blocked storage gives 1.0 and doesn't throw on save.
- [x] Checked by hand in Chrome: the play speed is back after a reload. One line is added to note 10's Chrome section.
- [x] Docs: the README's list of what is remembered adds the play speed. The architecture doc's line on what is saved in `localStorage` adds it too. The audition store's header comment says the play speed is kept between visits.
- [x] Final tier passes: code-review of the whole feature, its fixes, then `pnpm verify`, `pnpm lint`, `pnpm knip` and `pnpm depcruise`, all after the last code change.

## Comments

- 2026-11-22: this repo's `implement` skill ends with code-review and a commit and has no "step 5", and no ticket carried a `Final tier passes` box. Ticket 03 is the last one, so the box was added here: code-review of base..HEAD, grouped fixes, then the Final tier of AGENTS.md.
- Saved as a JSON object `{"playSpeed": n}`, like the volume's entry, so a bare number counts as "not an object" and gives 1.0. The grid check works in whole steps, so 1.3 passes despite floating point. The initial value is not saved at store creation, only changes are, as for the volume.
- A bad saved value stays in storage until the next change, since nothing rewrites it (observed in Chrome).
- Chrome reload check (note 10's "In Chrome"): 1.5× set, reload, 1.5× back with both element rates 1.5 and pitch preservation on; 1.55 and 3 read as 1.0×; the reset button writes `{"playSpeed":1}`.
- Code-review (standards and spec axes, base 16b8d7b) found, and the fix commit applied: a prettier error left by an unused import (`pnpm lint` was red), the 0.1 grid defined twice (now `lib/snap-play-speed.ts` with its spec, which also removes a `1e-9` tolerance), a stale `store-wiring` skill line, the DESIGN.md Tooltip sentence, a repeat of the ADR's reset story in the architecture doc, the changelog's implementation detail, and an import order and comment wrap in `ReviewPage.vue`. Left as they are: `toBeCloseTo` for float speeds (lint forbids `toBe`), the two `saved-*` files and the two control components that mirror each other (tolerable at two), the aria-label (it contains the visible text), the redundant DOM-order assertions, and tests for stories 12, 13 and 16 to 19, which need no code change and are covered by the Chrome check.
- Final tier after the last code change: `pnpm verify`, `pnpm lint`, `pnpm knip` and `pnpm depcruise` all exit 0.
