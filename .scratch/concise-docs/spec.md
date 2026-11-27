# Concise docs and skills

Status: ready-for-agent

Many feature PRs, each passing through the doc sync, left the docs and the project skills reading like a changelog. Six read-only audits in one session measured the drift; the user settled every decision below in that session. Nothing in the app changes.

## Problem Statement

The docs and skills hold about 50k words, and roughly half of that is sediment. The user reviews PRs for code, not for docs, and the docs drifted while nobody looked:

- **AGENTS.md** loads on every turn of every conversation, and carries rules only the doc sync needs, plus rules repeated in three skills.
- **Concept notes** were meant as lessons, one audio idea each. They grew measurement and timing tables, tuning and calibration diaries, by-ear playlist logs, "not measured yet" placeholders, ticket numbers, "milestone N" and "now" wording, and code sections listing keys, buttons and dialogs. Notes 10, 11, 13, 14 and 15 are the worst; in note 10 the browser-check log is half the note.
- **README.md** says v2 is still to be planned and lists as "not in v1" things that shipped in 2.x.
- **docs/architecture.md** repeats the player's own header comment at length, draws most flows twice, and lists edge cases.
- **GLOSSARY.md** definitions quote tuned numbers the config files own and describe behaviour rather than meaning.
- **DESIGN.md** is about 9.6k words, mostly screen behaviour (button inventories, the track-list table, the shortcut list) around a solid core of kit and canvas rules, and its token block is a byte copy of the main stylesheet.
- **The skills** point at code that is gone: the replace guard's file, a `split.detect` that is now `split.open`, a drag `set` that no longer returns false.

The drift has a cause in the process itself. AGENTS.md says every doc "describes the app as it is now", which makes a lesson chase every feature, and the doc-sync skill tells each PR that touches a note's subject to update that note. Agents update by adding.

## Solution

First change the rules that caused the drift, then cut each doc down to its one job. The audits put the result at about 24k words, with every concept, store, flow, rule and definition still there.

- A **concept note** becomes a fixed lesson: the idea, a worked example with its measured number, and a few links to the core maths. After it is written, only a broken link or a changed number is fixed. A new idea gets a new note.
- The **doc rules** move out of AGENTS.md into the doc-sync skill, the one moment they are needed.
- A **code comment** cites a note or a Named Rule, never a section or a bullet, so a doc can be reshaped without touching code.
- **Tuning and measurement logs** are cut to a one-sentence outcome where a decision rests on them; git history keeps the rest.

## User Stories

1. As the user, I want AGENTS.md to hold only what every conversation needs, so that each turn spends less context on rules that rarely fire.
2. As the user, I want the doc rules to live in the doc-sync skill alone, so that changing a rule is a one-place edit.
3. As the user, I want each rule said once across AGENTS.md and the skills, so that the copies cannot disagree.
4. As the user, I want the doc-sync skill to say what a concept note is and when it may change, so that future PRs stop growing the notes.
5. As the user, I want the doc-sync skill to say that an update replaces text and never appends a section for a feature, so that sediment does not settle again.
6. As the user learning digital audio, I want each concept note to open on its idea and its worked example, so that I can re-learn the idea in a few minutes.
7. As the user learning digital audio, I want every concept the notes teach today to survive the cut, so that nothing I learned is lost.
8. As the user learning digital audio, I want the measured number that anchors each note kept, so that the idea stays tied to a real sample.
9. As the user, I want a tuning decision kept as one sentence with its reason (what was chosen, and how), so that I still know why a default is what it is.
10. As the user, I want timing tables, decode diaries, by-ear logs and "not measured yet" placeholders gone from the notes, so that the lesson is not buried.
11. As the user, I want ticket numbers, issue numbers and "milestone N", "now" and "later" wording gone from the notes, so that a note reads as a lesson rather than a history.
12. As the user, I want each note's code section to point at the maths it teaches, so that it does not list keys, buttons, dialogs and pixel widths.
13. As the user, I want every file and function a note names to exist, so that the notes never send me to deleted code.
14. As the user, I want a note that says a later note will teach something to stop saying so once that note exists, so that the notes agree with each other.
15. As the user, I want one idea explained in one note, with other notes linking to it, so that the median-minus-offset, the leftover arithmetic and the energy mean are not taught three times.
16. As a maintainer, I want code comments to cite a note by file rather than by section, so that reshaping a note never breaks a comment.
17. As a maintainer, I want every code comment that cited a section or bullet that is cut to be re-pointed in the same commit, so that no comment cites text that is gone.
18. As a reader of the README, I want "What it does" to be one line per step, so that I see what the app does without its feature detail.
19. As a reader of the README, I want no section that says v2 is still to be planned, so that the README matches the released app.
20. As a reader of the README, I want the concept-note list to name each note in a phrase, so that the list does not repeat each note's own opening.
21. As a maintainer, I want architecture.md to show the layers, the stores and how they connect, the ffmpeg session and the main flows with their statuses, so that it stays the structure and nothing else.
22. As a maintainer, I want each flow in architecture.md drawn once, so that a change to a flow updates one diagram.
23. As a maintainer, I want the player section of architecture.md to say who owns playing and what its statuses are, so that the tuned durations and edge cases stay in the player's code.
24. As a maintainer, I want architecture.md's wording to match the app's names (Find duplicates, not "search"; the theme as a plain module, not a store), so that it does not mislead.
25. As a maintainer, I want the theme and the core download in architecture.md cut to a few lines each with a link to their ADR or code, so that the mechanism is not restated.
26. As an agent drawing on a canvas, I want the canvas-view skill to hold only reusable rules with one reference file each, so that I am not told about one feature's failure line or keys.
27. As an agent wiring stores, I want the store-wiring skill to point only at code that exists, so that I do not look for the replace guard's old file or `split.detect`.
28. As an agent adding an ffmpeg call, I want the ffmpeg-session skill without the worker-entry rule AGENTS.md already gives and without concept material, so that it holds only the session's rules.
29. As an agent opening an issue or a PR, I want the github-issues and github-prs skills without rules AGENTS.md already gives, so that they are shorter and still complete.
30. As an agent, I want each skill line to be the rule, why it holds, and one example file, so that every skill reads the same way.
31. As the user, I want GLOSSARY.md entries to say what a word means in one or two sentences, so that the glossary stays a glossary.
32. As the user, I want tuned numbers out of the glossary, so that a changed constant never makes a definition wrong.
33. As the user, I want the glossary grouped under subheadings, so that related words sit together.
34. As the user, I want the glossary's word conflicts left for a separate naming session, so that this cleanup does not decide names for me.
35. As an agent touching a kit component, I want DESIGN.md to give the kit rules (states, focus, sizes, variants, the label, hint and reason contract), so that I build components the same way.
36. As an agent drawing on a canvas, I want DESIGN.md's canvas drawing rules to hold the sizes, layering, dash pattern, handles and Named Rules, so that every canvas looks one way.
37. As a reader of DESIGN.md, I want screen behaviour (button inventories, the track-list table, the shortcut list, title-row states, drag and press order) gone, so that DESIGN.md is the design system and not a description of the screens.
38. As a maintainer, I want DESIGN.md to point at the main stylesheet for the tokens rather than copy them, so that the two never need syncing.
39. As a maintainer, I want DESIGN.md's icon list and its claims about the Split view's buttons to match the code, so that it does not mislead.
40. As a maintainer, I want the impeccable sidecar regenerated after DESIGN.md is trimmed, so that the impeccable tools read the same design the doc states.
41. As a reviewer, I want one commit per group of docs, so that I can review the contract, the skills, the README and architecture, each half of the concept notes, the glossary and DESIGN.md separately.
42. As the user, I want the Checkpoint and Final tiers green wherever a code comment changed, so that the cleanup does not break the build.

## Implementation Decisions

### The contract (first commit)

- **AGENTS.md keeps what every conversation needs:** learning first, the checks tiers and the report form, the code layout, lint, knip, testing, and the agent-skill pointers.
- **"Docs" and "Changelog" become one pointer line each** to the doc-sync skill.
- **"Changed checks" shrinks to two lines;** the scripts print their own reasons.
- **The worker-entry rule stays in AGENTS.md only.** The two skills that repeat it drop it.
- **The list of which e2e spec runs where goes.** The Playwright config and each spec's header already say it.
- **The doc-sync skill becomes the one home of the doc rules:**
  - The one job of each doc.
  - The changelog rule.
  - Replace rather than append.
  - The concept-note contract.
  - The citation rule.
- **The concept-note contract.** A note is a fixed lesson: the words, the idea, a worked example with its measured number on a sample, and a code section of a few links to the core maths. After it is written, a PR fixes only a broken link or a changed quoted number. A new idea gets a new note. A tuning decision appears as one sentence with its outcome and reason.
- **The citation rule.** A code comment cites a concept note by file, or DESIGN.md by a Named Rule or by the doc itself, never by a section or a bullet.
- **The doc-sync rule that DESIGN.md's token block must track the stylesheet goes,** because the block goes.

### The skills

- **canvas-view:**
  - Drop the stale replace-guard line.
  - Drop lines that describe one feature: the failure line, the title-row key rule, the stretch-view keys.
  - Drop quoted constants the code owns.
- **store-wiring:**
  - Fix the replace-guard reference to the split store's discard guard.
  - Fix `split.detect` to `split.open`.
  - Cut the Web Worker bullet to the rule and one reference.
  - Drop the theme and the late-result guard, which architecture.md holds.
- **ffmpeg-session:**
  - Drop the worker-entry rule.
  - Drop the analysis-builder sentence, which is concept material.
- **github-issues, github-prs:** drop what repeats AGENTS.md; no other change.
- **Every skill line** reads as the rule, why it holds, and one example file.

### README.md and architecture.md

- **README:**
  - "What it does" goes back to one line per step.
  - Rewrite or cut "Not in v1" and "What's next".
  - The concept-note list names each note in a phrase.
- **architecture.md:**
  - The player section keeps the owner, the one status and its states.
  - Each flow keeps one diagram.
  - Edge-case bullets go.
  - The theme and the core download become a few lines with links.
  - The store table's cells become phrases.
  - Fix the "search" and "except the theme" wording.
- **Matches and the edit ledger:** say in one line each that they are modules inside the split store, not stores.

### Concept notes

- **Each note keeps its spine:** the words, the idea's explanation and the worked example with its anchoring number.
- **Cut everywhere:**
  - Timing and decode tables.
  - Calibration and tuning diaries, kept as one sentence each.
  - By-ear playlist logs.
  - Browser-check logs.
  - "Not measured" sections.
  - Ticket and issue numbers.
  - History wording.
  - Keys, buttons, dialogs and pixel widths in the code section.
- **Fix:**
  - Files that no longer exist (notes 01 and 02).
  - "Find gaps", now "Find splits" (note 04).
  - "The FFT comes later" (note 11).
  - `setDepth`, now `setDepthSetting` (note 13).
  - The waveform comment that cites note 08 for a claim note 08 does not make.
- **Ideas taught in more than one note** stay in the note that teaches them first; the others link to it.
- **Code comments that cite a note's section** are re-pointed at the note in the same commit (the ffmpeg wrapper, decode slice, decode clip, cut track, probe, defaults, player, decode window and range-limits comments among them).
- **Two commits:** notes 01 to 08, then 09 to 15.

### GLOSSARY.md

- **Each entry** is one or two sentences on what the word means, plus its words to avoid.
- **Out:** tuned numbers, UI labels and behaviour or lifecycle rules.
- **Entries named as verbs** ("Removing a track") become what they name.
- **Subheadings group the clusters:** the file and its formats, splits and tracks, views and playing, matches, detection.
- **The word conflicts are not touched:**
  - "Mark" is a term, a word to avoid and a verb.
  - "Copy" is a word to avoid while "Kept copy" is a term.
  - "Cursor" is to be avoided under two terms.
  - "Checked" and "dismiss" have no entry.
- **The code comment that still says "Find gaps"** is fixed, because the glossary forbids the word.

### DESIGN.md and the impeccable sidecar

- **Keep:**
  - The north star and the colour world.
  - The colour roles and the Named Rules.
  - Typography, layout, elevation and shapes as rules.
  - The kit's rules per component.
  - The canvas drawing rules: tokens, sizes, layering, dash pattern, handles, Land Rule, Graphite Rule.
- **Cut:**
  - Screen behaviour: the per-view button inventory, the volume, play-speed and loudness title rows, the track-list table, the shortcut list, the name dialog, interaction prose in the canvas rules, the Track view prose.
  - Class-string dumps that repeat the components.
  - Contrast ratios that repeat the contrast spec.
  - Do's and Don'ts that restate the Named Rules.
  - The token block, replaced by a pointer to the stylesheet.
- **Keep the frontmatter;** the impeccable tools read it. Trim its components block only if the regenerated sidecar does not need it.
- **Fix:** the icon list (ChevronsLeft and ChevronsRight are gone; Volume2, VolumeX, Eye, EyeOff and X are missing) and the claim that the Split view has no back button.
- **Code comments that cite a DESIGN.md bullet** are re-pointed at a Named Rule or the doc.
- **Regenerate the sidecar last** with the impeccable document flow, from the trimmed DESIGN.md.

### Delivery

- One branch, one commit per ticket in `issues/`:
  1. The contract
  2. README and architecture
  3. The skills (after architecture, so a rule is not cut from both)
  4. Concept notes 01 to 08
  5. Concept notes 09 to 15
  6. The glossary
  7. DESIGN.md
  8. The impeccable sidecar
- After 01, tickets 02 and 04 to 07 are independent of each other.
- No CHANGELOG line, since nothing the user notices changes.
- The heavy rewrites (both concept-note commits and DESIGN.md) run in subagents briefed with this spec. Each result is reviewed against its audit before it is committed.

## Testing Decisions

- **No new seam.** Markdown is outside prettier and eslint, and the user chose not to add a reference check.
- **Each commit is verified by a read-only audit of the docs it touches:**
  - Every file, function, store, status and constant a touched doc names exists in `src/` and matches.
  - No ticket or issue numbers.
  - No history wording.
  - No section the contract rules out.
  - The size is near the target in the table below.
- **Every concept the notes teach today is still taught.** For each note, the reviewer lists the core idea before the cut and finds it after.
- **Every changed code comment** goes through the Task tier. The Checkpoint tier runs before each commit that touches `src/`, and the Final tier once before handover.
- **Prior art:** the six audits run in the planning session. Each checked named paths and symbols with grep against `src/` and gave a verdict per section.

| Doc | Words before | Target |
| --- | --- | --- |
| AGENTS.md | 1,270 | ~700 |
| README.md | 1,020 | ~700 |
| architecture.md | 2,220 | ~1,100 |
| Concept notes 01 to 08 | 14,150 | ~6,400 |
| Concept notes 09 to 15 | 16,150 | ~8,400 |
| GLOSSARY.md | 2,070 | ~1,050 |
| DESIGN.md | 9,590 | ~3,800 |
| The six skills | 3,410 | ~2,400 |

## Out of Scope

- The glossary's word conflicts: a separate domain-modeling session.
- CHANGELOG.md, the ADRs and `docs/agents/`.
- Skills other than the six named: the vendored ones, impeccable, playwright-cli.
- Any change to the app's behaviour, and any new tooling or check.
- Rewriting code comments beyond re-pointing their citations and the one "Find gaps" comment.

## Further Notes

- **Prompted by the user:** "these documents have become changelog in some way and outdated/misleading"; the user asked for them to be "made concise without loosing the actual concepts".
- **The audits found few wrong facts.** They found much sediment: most constants quoted in the docs still match the code. The risk in this work is losing a concept, not keeping a wrong one, so the per-note concept check matters more than the word targets.
- **Skill bodies load only when a skill fires.** Only its one-line description sits in every conversation. AGENTS.md is the always-loaded cost; trimming the skills is for accuracy and for the turns they fire on.
