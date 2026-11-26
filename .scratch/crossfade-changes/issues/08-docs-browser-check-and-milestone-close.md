# 08: Docs, the browser check and the milestone's close

**What to build:** the docs describe the app as it now is, the feature is checked by hand in a real browser, the Final tier and a review of the whole branch pass, and the milestone stops for the user's confirmation.

**Blocked by:** 05, 06, 07.

**Status:** ready-for-agent

Spec: `.scratch/crossfade-changes/spec.md`, Implementation Decisions "Docs" and Testing Decisions (the browser check).

- [ ] Docs, with the `finish-feature` skill: concept note 15 (the quiet windows are those under the built-in silence threshold; "Where it lives in the code"), the glossary (Split, Confidence, Default settings), the architecture doc, the README's "What it does" and concept-note list, and decision 24's three lines.
- [ ] In the browser with `playwright-cli`: `sample1.m4a` with contrast on adds no split; a test mix from the analysis, written to a file, gets its contrast splits; the load time of `sample3h.m4a` with and without the contrast curve. Results in this ticket's comments.
- [ ] The Final tier: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [ ] A review of the branch with the `code-review` skill; real findings fixed and the tier run again.
- [ ] The milestone stops for the user's confirmation in the browser.
