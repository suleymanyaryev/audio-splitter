# Handover: ui-polish (uncommitted, overwritten after each worker)

Done: 01 f5a3a26, 02 f3c4ad2, 03 5fcd8ec, 04 6c766c5, 05 d2cc348. Prep commit f81058f holds spec + tickets.
Left: 06 finish review (final ticket: finish review, grouped fixes, code-review, Final tier).

## Notes
- Theme module `src/shared/lib/theme/theme.ts`; inline head script in `index.html` (key copied, pinned by spec). One `eslint-disable sonarjs/code-eval` in `theme-inline-script.spec.ts` (reason on line above); flag in the final summary.
- Tabular figures DROPPED by user decision (Albert Sans has no `tnum`); done in 04. `.impeccable/surfaces/src-pages-review.md` (direction contract) and `.impeccable/design.json` still say "tabular figures": 06 fixes the contract wording and regenerates design.json.
- Dark: track block on strip ground is 1.83:1 (user's confirmed colour mapping); noted in DESIGN.md.
- `theme-color` meta follows the OS, not the in-app switch (05). Open: should the switch drive it? Fix in 06 if the finish review finds it material, else list it as not fixed with a reason.
- ReviewPage spec's title helper accepts `h2.text-lg, h2.text-display`.
- Brand rasters regenerate from `.impeccable/brand/make-brand-assets.sh`.
- Hazards: never `git checkout src/app/styles/main.css` with uncommitted token edits; prettier on `src` reorders classes in `main.css`. Repo e2e config reuses port 5173 (another worktree may hold it): use a scratchpad config on another port.
- Last ticket 06 box "Shown to the user in the browser" is the user's stop: do NOT tick it; leave it for the user.

## Worker rules the `implement` skill does not state
- Tick boxes, `**Status:** resolved`, ONE commit per ticket, tree clean after (handover.md stays untracked).
- Docs sync via `finish-feature`; CHANGELOG line for user-visible changes.
- Browser checks via `playwright-cli`; kill own processes by PID, delete temp files, verify gone.
- Status lines are bold: grep `'^\*\*Status:'`.
