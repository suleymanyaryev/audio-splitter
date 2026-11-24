---
name: github-issues
description: Writing GitHub issues with `gh issue create`. Use when about to create a new issue on GitHub; tickets under `.scratch/` follow docs/agents/issue-tracker.md instead.
---

An issue is read later by someone with none of this chat. It carries the **what** and the **why**; the how belongs to whoever builds it. The test for every line: it stays true whichever way the change is built. Create it with `gh`, never a `.scratch/` file, because the user asked for GitHub.

1. **Ground it.** Read the code the request touches (the slice's store, the widget, `shortcut-sections.ts` for a key) to learn how the app behaves today, and `gh issue list --state all` for related issues. Every claim about today's behaviour is something you read, with its file path.
2. **Ask about the what and the why.** When the request leaves unclear what the user should see or why they want it, put that to the user with `AskUserQuestion`, one recommended option first, in at most four questions per round. A question about how to build it (which store, which approach, which library) goes straight under _Open questions_, unasked. The step is done when you can write _Summary_, _Why_ and _Expected behaviour_ without guessing; what the user leaves unanswered goes under _Open questions_ too.
3. **Write the body** in these sections, in this order, dropping a section only when it has nothing to say:
   - **Summary**: one or two sentences, the change in user terms.
   - **Why**: the need behind it: what the user cannot do today, or what goes wrong, in their words where they gave them.
   - **Today**: how the app behaves now (with file paths), and links to related issues (`#N`).
   - **Expected behaviour** (or **Scope** for a larger change): what the user sees and does, one bullet per view or case. A constraint the user stated themselves ("on a button press, never automatic") belongs here, marked as theirs.
   - **Acceptance criteria**: `- [ ]` lines, each something a person can observe in the running app.
   - **Open questions**: bold lead-in, then the question and the options seen so far, with none chosen.
4. **Title.** Short, no prefix, no trailing period, in the app's words from `GLOSSARY.md`. Name the thing and the change ("Split view: pause/resume and a movable playhead"); put a key in the title when the key is the point.
5. **Label.** Pick from `gh label list`: `enhancement` for new behaviour, `bug` for broken behaviour, `documentation` for docs.
6. **Create.** Write the body to a file in the scratchpad, run `gh issue create --title ... --label ... --body-file <file>`, then delete the file. One issue per request line unless the user asks to merge or split.
7. **Report** each issue as its link with a line on what it asks, then every open question left in it, and any issue it clashes with.
