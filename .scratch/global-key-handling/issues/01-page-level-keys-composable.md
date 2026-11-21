# 01: Page-level keys composable, with `?` moved onto it

**What to build:** A shared way for a mounted component to receive the review screen's keys from the whole page, with every rule from the spec built in. `?` opens the shortcuts dialog through it, behaving exactly as it does today. This is the prefactor the three views build on (spec: `.scratch/global-key-handling/spec.md`, ADR 0002).

The composable lives in a new `shared/lib/keyboard` slice. A component calls it while mounted, passing a key handler and optionally its own root element. The composable listens on the document and calls the handler only when:

- no Ctrl, Cmd or Alt is held (Shift passes through),
- the key's target isn't a text field, select or contenteditable,
- no element with the dialog or alertdialog role is on the page,
- the focused element isn't a control that uses that key itself: Space and Enter on a button, arrows and Home/End on a slider, arrows on a radio group. An element inside the caller's own root never counts as such a control.

The handler reports whether it acted. When it did, the composable prevents the default (no page scroll) and lets the caller react (ticket 02 uses this to clear the "Saved" line). The listener goes away on unmount.

The shortcuts dialog's `?` composable becomes a thin caller of this one, and its "typing" and "dialog open" checks move here.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `?` opens the shortcuts dialog from anywhere on the review screen, and doesn't open it while typing in a track name, while another dialog is open, or with Ctrl, Cmd or Alt held (the existing `ReviewPage.spec` and `?` cases stay green)
- [ ] The composable's spec (taking over the `?` composable's spec) covers each rule: modifiers, typing targets, dialog open, a Tab-focused button keeping Space and Enter but not the arrows, a focused slider keeping arrows and Home/End, a focused radio group keeping arrows, an element inside the caller's root not being treated as such a control, default prevented only when the handler acted, and no calls after unmount
- [ ] AGENTS.md's slice list has one line for `shared/lib/keyboard`, saying where, not what
- [ ] Task and Checkpoint checks pass (`pnpm vitest run` on the touched specs, `pnpm lint:changed`, `pnpm typecheck`)
