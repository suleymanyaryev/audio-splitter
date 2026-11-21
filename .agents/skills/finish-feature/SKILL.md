---
name: finish-feature
description: The doc sync before a commit. Use before committing a feature, fix or refactor, or when a ticket or spec lists docs to update.
---

The code, its specs and comments say what the app does. The docs below each hold one other view of it, and each one changes in the same commit as the code. Go through them in order. The work is done when every item has an outcome, _done_ or _n/a: reason_, and the outcomes are in your report.

1. **CHANGELOG.** A change the user notices adds a line under `## [Unreleased]` in `CHANGELOG.md`, following the rules at the top of that file (the group to use, and how to phrase it for the user). Refactors, tests, tooling and docs get no line.
2. **README and architecture.** Follow AGENTS.md "Docs": `README.md` changes only when what the user can do changes, and `docs/architecture.md` (prose, stores table, diagrams) only when a store, a connection, a flow or a status changes. Replace the old text rather than adding to it.

3. **Glossary.** A new domain word, or a changed meaning, goes in `GLOSSARY.md` through the `domain-modeling` skill. Names in the code, the CHANGELOG and the docs use the glossary's words.
4. **Concept notes.** When the change touches a concept note's subject (`docs/concepts/`), fix its "where it lives in the code" links and any number it quotes. A new note also gets its line in the concept-note list in `README.md`.
5. **DESIGN.md.** A changed look (a kit component, a canvas's sizes, colours or layering) updates `DESIGN.md`, and its token block stays in step with `src/app/styles/main.css`.
6. **AGENTS.md and skills.** The Code layout list changes only when a slice is added, removed or renamed: one line saying what the slice is for. A skill in `.agents/skills/` (`canvas-view`, `ffmpeg-session`, `store-wiring`) changes only when the way to build something changes: a new rule, a new reference file, or a rule that no longer holds. What a feature does goes in the code, its specs and the CHANGELOG, never in AGENTS.md or a skill. A skill line is the rule, why it holds and one example file; remove any line it makes stale.
7. **Checks.** Run the Checkpoint tier from AGENTS.md "Checks" before the commit, and the Final tier once before handover. Report one line per command run.

The spec or ticket may list docs to update. Treat that list as a reminder of items 1 to 6: each listed doc still gets its outcome.
