# 10: Ask before discarding pending splits

**What to build:** nothing loses pending splits without asking. Selecting another track, a split, or empty ground on the whole-file view, a double-click on an end split line, or a Track list trash or merge button that would delete one of the track's end splits asks "Discard N pending splits?" with Apply first, Discard and Cancel. Apply first applies them, then does what the user asked for; Discard drops them, then does it; Cancel does nothing. The "Replace your edits?" question before a setting change and the "Discard your edits?" question before "New file" count pending splits too, and are asked when there are pending splits but no edits; they keep their two buttons.

**Blocked by:** 09 (Pending splits)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 94–100)

- [ ] The split store holds a discarding action back as its single open question, with the pending count, and answers it: apply first, discard, cancel. An action arriving while a question is open is ignored. Selecting the selected track again and switching the view ask nothing.
- [ ] The review page shows the question from the store, with the three buttons.
- [ ] The replace guard and the "New file" question ask with edits or pending splits, and their text counts both.
- [ ] Specs: each discarding action held with its count; the three answers, including apply first followed by the held action; no question without pending splits; the replace guard with pending splits and no edits; App's "New file" text.
- [ ] CHANGELOG line under Unreleased (Added).
