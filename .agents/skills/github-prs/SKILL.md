---
name: github-prs
description: Opening a GitHub pull request with `gh pr create`. Use when about to open a PR or write a PR body.
---

A PR is read by a reviewer with none of this chat. It says what changed and why in the user's words, shows that each of the issue's criteria is met, and lists what is still open. The diff carries the how. Go through the steps in order.

1. **Ground it.** Read these four things:
   - The issue: `gh issue view N --json title,body,labels`.
   - The branch: `git log main..HEAD`, `git status` and its upstream.
   - The spec and tickets under `.scratch/<feature>/`: each ticket's `**Status:**` line, its unticked boxes, and its comments on what was not fixed.
   - Any PR the branch already has: `gh pr list --head <branch>`. If there is one, update it with `gh pr edit` rather than opening a second.

   The step is done when every acceptance criterion in the issue is either backed by a commit and its spec, or written down as an open item, and every open question in the issue is marked as settled by the branch or still open.

2. **Final tier.** On a clean tree, run the Final tier from AGENTS.md "Checks". Fix a failure on the branch before opening the PR; never open a PR on a red check.
3. **Write the body** in these sections, in this order. Drop a section only when it has nothing to say.
   - **`Closes #N`**: the first line, for each issue the branch finishes.
   - **Why**: one or two sentences on the need the change answers, taken from the issue's _Why_.
   - **What changes**: one bold group per part of the issue or spec. Each bullet is one change in user terms, naming the slice a reviewer should open. End with the docs that changed (`DESIGN.md`, `CHANGELOG.md`, …), and a line pointing to `.scratch/<feature>/` when the branch has a spec.
   - **Acceptance criteria**: the issue's own list, with each line's wording kept. Tick a line `- [x]` and name the spec that proves it. Leave a line `- [ ]` with its reason.
   - **Open for review**: what the user still has to do (an unticked "shown to the user" box), each open question from the issue with the way the branch went and the reason, decisions the work left to them, known deviations from the spec with their reason, and every `eslint-disable` the branch adds.
   - **Checks**: one line per command from step 2, in AGENTS.md's report form (`pnpm verify -> pass (…)`).
4. **Visual evidence.** When the look or a flow changes, capture screenshots with `playwright-cli` and attach them, one per theme when the theme matters. How to attach: [playwright-cli's PR attachments reference](../playwright-cli/references/pr-attachments.md).
5. **Title.** Name the change in the app's words from `GLOSSARY.md`, like an issue title ("Theme switch and the Next to Silence look"). No commit prefix and no trailing period.
6. **Create.** Write the body to a file in the scratchpad. Run `git push -u origin <branch>`, then `gh pr create --base main --head <branch> --title ... --body-file <file>`, adding `--attach` for each screenshot. Delete the body file and the screenshots afterwards. Open the PR as ready for review unless the user asks for a draft.
7. **Report.** Give the PR link, one line per check command, and every item under "Open for review". When one of those items needs the user to act, offer to mark the PR as a draft.
