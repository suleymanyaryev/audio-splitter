# 01: The doc contract in AGENTS.md and the doc-sync skill

**What to build:** AGENTS.md holds only what every conversation needs, and the doc-sync skill (`finish-feature`) becomes the one home of the doc rules, with the two new contracts that stop the drift. See the spec's "The contract".

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] AGENTS.md keeps these sections: learning first, the checks tiers and report form, code layout, lint, knip, testing, agent skills.
- [x] AGENTS.md "Docs" and "Changelog" are one pointer line each to the doc-sync skill.
- [x] "Changed checks" is at most two lines, and the e2e spec-to-server list is gone.
- [x] The worker-entry rule appears in AGENTS.md and nowhere else among AGENTS.md and the six skills. Its copies in `ffmpeg-session` and `store-wiring` are removed here or in ticket 03.
- [x] The doc-sync skill holds: each doc's one job, the changelog rule, "an update replaces text and never appends a section for a feature", the concept-note contract and the citation rule.
- [x] The concept-note contract says:
  - A note holds the words, the idea, a worked example with its measured number, and a code section of a few links to the core maths.
  - After it is written, only a broken link or a changed quoted number is fixed.
  - A new idea gets a new note.
  - A tuning decision appears as one sentence with its outcome and reason.
- [x] The citation rule says a code comment cites a concept note by file, or DESIGN.md by a Named Rule or by the doc, never by a section or bullet.
- [x] The rule that DESIGN.md's token block tracks the stylesheet is gone.
- [x] Every rule AGENTS.md had before is still in AGENTS.md or the doc-sync skill, said once.
- [x] AGENTS.md is near 700 words. (964: see Comments)
- [x] Both files read clean against the `writing-for-agents` skill: no no-ops, and no rule stated twice.

## Comments

- **Process.** The `implement` skill (`.agents/skills/implement/SKILL.md`) has no numbered steps and no Risk tiers, and no ticket has a Risk line. Each ticket therefore follows the skill plus the spec's "Testing Decisions": a read-only audit of the touched docs, the Task tier on changed code comments, and the Checkpoint tier before each commit that touches `src/`. Code-review, its grouped fixes and the Final tier run once, on ticket 08. A "Final tier passes" box is added there.
- **Word target.** AGENTS.md is 964 words (wc), not ~700. The Code layout list alone is 250 and must stay, and the ticket requires every rule kept, so the rest was cut to caches the config files hold. Keeping every rule came first, as the spec says losing content is the bigger risk.
- **Dropped caches.** The ESLint plugin list, the test stack, what `test:changed` runs, what depcruise fails on, and which e2e spec runs on which server are gone. In each case AGENTS.md names the file that holds it.
- **Worker-entry rule.** It now sits under AGENTS.md "Testing". Its copies in `ffmpeg-session` and `store-wiring` are left for ticket 03.
- **CHANGELOG rule.** The doc-sync skill points at the rules at the top of `CHANGELOG.md` rather than repeating "refactors, tests, tooling and docs get no line".
