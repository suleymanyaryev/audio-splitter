# 05: Docs, the checks and closing the milestone

**What to build:** the docs that describe the app as it now is, the by-hand check in both themes, and the milestone's close.

**Blocked by:** 02, 03, 04.

**Status:** ready-for-agent

Spec: `.scratch/spectrogram/spec.md` (Further Notes, "When the milestone ships"). Run the `finish-feature` skill for the doc sync.

- [ ] `docs/architecture.md`: the source-file store's row gains the spectrogram as its third summary, and the load flow says so.
- [ ] `README.md`: one "What it does" line for the spectrogram.
- [ ] Concept note 14's "Where it lives in the code" section is filled in.
- [ ] The v2 milestones file: milestone 7's entry and its open questions match what was built.
- [ ] GitHub issue #17: the new text is shown to the user and posted only once they approve it. It carries the decisions and drops the "#12 falls back on it" line. The issue is not closed.
- [ ] By hand in the browser, through the `playwright-cli` skill, in the light and the dark theme:
  - the tone file's line;
  - a split read against the sound in the Split view;
  - a track and a range of `sample-crossfade.m4a`.
- [ ] The load time of `sample3h.m4a` is measured against the 19.2 s of concept note 02, and noted in note 14.
- [ ] The Final checks of `AGENTS.md` pass: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [ ] Issue #17's acceptance criteria are checked against what was built, and the user confirms the milestone.
