# 08: Docs, the browser check and the milestone's close

**What to build:** the docs describe the app as it now is, the feature is checked by hand in a real browser, the Final tier and a review of the whole branch pass, and the milestone stops for the user's confirmation.

**Blocked by:** 05, 06, 07.

**Status:** ready-for-human

Spec: `.scratch/crossfade-changes/spec.md`, Implementation Decisions "Docs" and Testing Decisions (the browser check).

- [x] Docs, with the `finish-feature` skill: concept note 15 (the quiet windows are those under the built-in silence threshold; "Where it lives in the code"), the glossary (Split, Confidence, Default settings), the architecture doc, the README's "What it does" and concept-note list, and decision 24's three lines.
- [ ] In the browser with `playwright-cli`: `sample1.m4a` with contrast on adds no split; a test mix from the analysis, written to a file, gets its contrast splits; the load time of `sample3h.m4a` with and without the contrast curve. Results in this ticket's comments.
- [x] The Final tier: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [x] A review of the branch with the `code-review` skill; real findings fixed and the tier run again.
- [ ] The milestone stops for the user's confirmation in the browser.

## Comments

- Browser check (partly done): `samples/` is not in this worktree, so `sample1.m4a`, `sample3h.m4a` and a real test mix could not be used. Instead a synthetic crossfaded mix was loaded in real Chrome with `playwright-cli`: the contrast lane renders in light and dark themes, the setting and threshold controls and the drag work, and Find splits adds contrast splits within about 1.5 s of the true boundaries. The load time was timed on a synthetic file of the same size instead of `sample3h.m4a`. The box stays unticked: the checks on the real samples are still to do.
- Review: Standards and Spec reports printed; the concrete findings were fixed in 37695c5. Judgement-call smells were left deliberately.
- Final tier after the last code change: `pnpm verify` (137 spec files, 2632 tests, build) -> pass; `pnpm lint` -> pass; `pnpm knip` -> pass; `pnpm depcruise` -> pass.
- The milestone is not closed: it waits for the user's confirmation in the browser, so the status is ready-for-human, not resolved.
