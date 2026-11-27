---
name: finish-feature
description: The doc rules, and the doc sync before a commit. Use before committing a feature, fix or refactor, when writing or editing a doc or concept note, or when a ticket or spec lists docs to update.
---

The code, its specs and comments say what the app does. Each doc below holds one other view of it, and changes in the same commit as the code, only when that view changes.

## The sync

Go through the docs in order. The work is done when every item has an outcome, _done_ or _n/a: reason_, and the outcomes are in your report. A doc a spec or ticket lists still gets its outcome here.

1. **CHANGELOG.** A change the user notices adds its line under `## [Unreleased]` in `CHANGELOG.md`, following the rules at the top of that file: what gets a line, the group, the phrasing, the version and the release steps.
2. **README.md** is for people: what the app does, how to run it, and links to the rest. "What it does" keeps one line per step, and changes only when what the user can do changes. A new concept note adds a phrase to its concept-note list.
3. **docs/architecture.md** is the structure: layers, stores and how they connect, the ffmpeg session, the main flows and their statuses. It changes with a store, a connection, a flow or a status; edge cases, keys and buttons stay in the code.
4. **GLOSSARY.md.** A new domain word, or a changed meaning, goes in through the `domain-modeling` skill. Names in the code, the CHANGELOG and the docs use its words.
5. **Concept notes** (`docs/concepts/`) follow "Concept notes" below.
6. **DESIGN.md.** A changed look (a kit component, a canvas's sizes, colours or layering) updates it.
7. **AGENTS.md and skills.** The Code layout list changes only when a slice is added, removed or renamed: one line saying what the slice is for. A skill in `.agents/skills/` (`canvas-view`, `ffmpeg-session`, `store-wiring`) changes only when the way to build something changes: a new rule, a new reference file, or a rule that no longer holds. A skill line is the rule, why it holds and one example file.
8. **Checks.** Run the Checkpoint tier from AGENTS.md "Checks" before the commit, and the Final tier once before handover. A `pnpm docs:budget` failure means cut or replace text; raise a budget only when the user agrees.

## Writing a doc

- Each doc has one job. README.md, architecture.md, GLOSSARY.md and DESIGN.md describe the app as it is now; a concept note is a lesson, fixed once written.
- What a feature does lives in the code, its specs and comments, and `CHANGELOG.md`; a doc, AGENTS.md or a skill holds only its own view.
- An update replaces text and removes what it makes stale. It never appends a section for a feature.
- Write simply: short sentences with one idea each, a bullet of one or two sentences, a table cell of a phrase.
- Name the file rather than a private variable, and link to the ADR, concept note or code comment rather than repeat it.

## Concept notes

A note is a lesson on one audio idea. It holds:

- the words it introduces;
- the idea;
- a worked example, with its number measured on a sample in `samples/`;
- a code section of a few links to the core maths that implements the idea.

After it is written, a note changes only to fix a broken link or a quoted number the code changed. A new idea gets a new note, which links to the notes it builds on rather than teaching their ideas again. A tuning decision appears as one sentence: what was chosen, and how; the measurements stay in git history.

## Citations

A code comment cites a concept note by file (`docs/concepts/03-loudness.md`), or DESIGN.md by a Named Rule or by the doc itself, never by a section or a bullet. Then a doc can be reshaped without touching the code.
