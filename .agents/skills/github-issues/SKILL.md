---
name: github-issues
description: Writing GitHub issues with `gh issue create`. Use when about to create a new issue on GitHub; tickets under `.scratch/` follow docs/agents/issue-tracker.md instead.
---

An issue is read later by someone with none of this chat: it carries the why, the current behaviour and a checkable end. Create it with `gh`, never a `.scratch/` file, because the user asked for GitHub.

1. **Ground it.** Read the code the request touches (the slice's store, the widget, `shortcut-sections.ts` for a key) and `gh issue list --state all` for related issues. Every claim in the issue is something you read, with its file path.
2. **Ask.** Put each decision the request leaves open to the user with `AskUserQuestion`, one recommended option first, in at most four questions per round. The step is done when every behaviour is either decided or written down as an open question. A decision the user answers goes into the body as the behaviour; an unanswered one goes under _Open questions_.
3. **Write the body** in these sections, in this order, dropping a section only when it has nothing to say:
   - **Summary**: one or two sentences, the change in user terms.
   - **Context**: how it works today (with file paths), why it matters, and links to related issues (`#N`).
   - **Expected behaviour** (or **Scope** for a larger change): what the user sees and does, one bullet per view or case.
   - **Learning note**: only when the milestone teaches an audio idea. Say that the concept note `docs/concepts/NN-<slug>.md` comes first, as AGENTS.md "Learning first" requires.
   - **Acceptance criteria**: `- [ ]` lines, each checkable, ending with the specs, the shortcuts dialog when a key changes, and the `CHANGELOG.md` line.
   - **Open questions**: bold lead-in, then the question and the options.
4. **Title.** Short, no prefix, no trailing period, in the app's words from `GLOSSARY.md`. Name the thing and the change ("Split view: pause/resume and a movable playhead"); put a key in the title when the key is the point.
5. **Label.** Pick from `gh label list`: `enhancement` for new behaviour, `bug` for broken behaviour, `documentation` for docs.
6. **Create.** Write the body to a file in the scratchpad, run `gh issue create --title ... --label ... --body-file <file>`, then delete the file. One issue per request line unless the user asks to merge or split.
7. **Report** each issue as its link with a line on what it asks, then every open question left in it, and any issue it clashes with.
