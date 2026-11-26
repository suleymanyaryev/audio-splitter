# One edit ledger for the Edit rules

Status: ready-for-agent

Candidate 2 of the [architecture review](../code-cleanup-and-readability/architecture-review.md#2-one-edit-ledger-for-the-edit-rules). The grilling settled every decision below. It sharpened **Edit** in the glossary to name the two rules the code already follows. No ADR: every decision is cheap to reverse.

## Problem Statement

The glossary's Edit rules live in seven actions of the split store, and they hold only because each action remembers them. Moving, inserting, removing, renaming, leaving out, marking checked and removing a track each write the edit sets by hand: up to five sets at once in a split's removal. Removing the first track calls the rename action for its side effect on the edits, then patches the left-out edit of the file's start by hand.

A maintainer who wants to know what counts as an edit reads all seven actions, plus the function that clears the edits and the computed that counts them. A new kind of edit has to touch several actions, the clear and the count. Every rule is tested through the store's split actions, so a case about "an added then moved split counts once" has to open a file, find splits, select one and move it.

The code also follows two rules that the glossary blurred into one. A split's edit is made once and stays, even after a move back. A track's name or its being left out is an edit only while it differs from how the track came to be, so renaming it back or toggling it twice takes the edit away. The glossary said "counted once per thing changed, however often it was changed", which reads as the first rule alone.

## Solution

The Edit rules move into one small module inside the split slice: the edit ledger. Each action reports the edit it made, in the glossary's words (a split added, moved, checked or deleted, a track named, a track left out or brought back), and the ledger applies the rules and keeps the count. Nothing changes for the user, and nothing changes for any widget: the split store returns the same members with the same behaviour, and the edit count is the same number in every case.

Dismissals stay where they are. A dismissed match is an edit while both tracks keep their ends, and only the matches module knows the ends, so the edit count stays the ledger's count plus the matches module's live dismissal count.

## User Stories

1. As a maintainer, I want every Edit rule in one module, so that I learn what counts as an edit by reading one file.
2. As a maintainer, I want each action to report its edit with one call, so that no action writes the edit sets by hand.
3. As a maintainer, I want the ledger to know only split ids and track keys, so that it cannot reach into splits, selection, names or pending splits.
4. As a maintainer, I want the ledger to own "a split is one edit from the first change to it", so that moving, checking and deleting one split never counts it twice.
5. As a maintainer, I want the ledger to own "an added split moved is still one edit", so that the move action does not check whether the split was added.
6. As a maintainer, I want the ledger to own "a moved split is no longer counted as checked", so that a checked split that moves stays one edit.
7. As a maintainer, I want the ledger to own "an added split deleted again leaves no edit, and a detected one deleted counts one", so that the removal action does not decide it.
8. As a maintainer, I want a deleted split's moved, checked, rename and left-out edits to go with it inside the ledger, so that the removal action makes one call instead of five.
9. As a maintainer, I want the ledger to own "a track's edits belong to the split where the track starts", so that the rule the glossary gives for track names also holds for their edits.
10. As a maintainer, I want the ledger to own "a track name is an edit while the track has one", so that naming a track back to its default takes the edit away without the rename action knowing why.
11. As a maintainer, I want the ledger to own "a second toggle of left out takes the edit back", so that the leave-out action only reports the toggle.
12. As a maintainer, I want one ledger operation for "the file's start took over the next track's name and left-out state" when the first track is removed, so that the rule "the file's start is an edit exactly while it differs from how the file opened" lives in one tested place.
13. As a maintainer, I want removing a track to stop calling the rename action for its side effect, so that the hardest function in the store gets easier to read.
14. As a maintainer, I want the store to keep deciding whether an inserted split is manual or detected, so that the ledger never needs to know about confidence.
15. As a maintainer, I want confidence to stay on the split and be cleared by the move and check actions next to their ledger call, so that the confidence queue does not depend on the ledger.
16. As a maintainer, I want one call to forget every edit, so that opening a file, Clear splits and reset start the edits over the same way.
17. As a maintainer, I want a new kind of edit to be one new ledger operation, so that adding one touches one module and the action that reports it.
18. As a maintainer, I want the ledger's internal state private, so that no caller can write a set and break a rule.
19. As a widget author, I want `editCount` and `hasEdits` unchanged on the split store, so that no widget or widget spec changes.
20. As a user, I want a split I move ten times to count as one edit, as before.
21. As a user, I want a split I move back to where it was to still count as one edit, as before.
22. As a user, I want a move that leaves the split where it was to count nothing, as before.
23. As a user, I want a split I add and then move to count as one edit, as before.
24. As a user, I want a split I add and then delete to leave no edit, as before.
25. As a user, I want a detected split I move and then delete to count as one edit, as before.
26. As a user, I want marking a split checked to count as one edit, and moving it afterwards to keep that at one, as before.
27. As a user, I want a track I rename several times to count as one edit, and renaming it back to its number to take the edit away, as before.
28. As a user, I want leaving a track out and bringing it back to leave no edit, as before.
29. As a user, I want a track cut from a left-out track to be left out with no edit, as before.
30. As a user, I want deleting a split to take that track's rename and left-out edits with it, and count the deletion, as before.
31. As a user, I want removing the first track to count the file's start as renamed or left out exactly while it differs from how the file opened, as before.
32. As a user, I want the splits Find splits adds to be no edit until I change one, as before.
33. As a user, I want a dismissed match to count as one edit while both tracks keep their ends, as before.
34. As a user, I want bringing a duplicate back with one press to count as the dismissal alone, as before.
35. As a user, I want changing the silence threshold or the minimum gap length to keep my edits, as before.
36. As a user, I want a new file, Clear splits and reset to start the count at 0, as before.
37. As a user, I want "New file" and "Clear splits" to ask first exactly when they asked before, and the dialog to name the same number of edits.
38. As a test author, I want to test the Edit rules with no store, so that a case about an added then moved split is two ledger calls and a count.
39. As a test author, I want each Edit rule tested once, at the ledger, so that the store spec only proves that each action reports its edit.
40. As an agent, I want the store-wiring skill to say where a new kind of edit goes, so that I add it to the ledger and not to an action.

## Implementation Decisions

- **A composable, not a store.** The edit ledger is a plain composable in the split slice's model segment, built like the matches module. The split store calls it once in its setup and keeps what it returns private. A second Pinia store was rejected in the architecture review: it would need wiring through the page.
- **Inputs.** None. The ledger is told about edits by the store's actions and reads nothing else.
- **Identity.** A split is named by its id. A track is named by its key: the id of the split where it starts, or none for the file's start. The ledger never sees a split, a track or a name.
- **The ledger's interface.**

  | Operation                                                 | Rule inside the ledger                                                                                                                                       | Reported by                     |
  | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
  | split added (id)                                          | One edit                                                                                                                                                     | insert, only for a manual split |
  | split moved (id)                                          | One edit unless it was added; the split no longer counts as checked                                                                                          | move                            |
  | split checked (id)                                        | One edit                                                                                                                                                     | mark checked                    |
  | split deleted (id)                                        | Takes "added" back, or else counts one deletion; drops the split's moved and checked edits, and the rename and left-out edits of the track that starts at it | removal of a split              |
  | track named (key, whether named)                          | An edit while named                                                                                                                                          | rename                          |
  | left out toggled (key)                                    | One edit; a second toggle takes it back                                                                                                                      | leave out or bring back         |
  | start inherited (whether named, whether left out by hand) | The file's start is an edit while it is named, and an edit while it is left out by hand                                                                      | removing the first track        |
  | count                                                     | The sum of the above                                                                                                                                         | the store's edit count          |
  | clear                                                     | Forgets every edit                                                                                                                                           | open, Clear splits, reset       |

- **What stays in the split store.**
  - Deciding whether an inserted split is manual: only a split with no confidence is reported as added.
  - Clearing a split's confidence on a move or a check, next to the ledger call.
  - Whether anything changed at all: a move that leaves the split where it was, or a rename that leaves the stored name as it was, reports nothing.
  - The edit count, which adds the ledger's count and the matches module's live dismissal count, and whether there are edits.
  - Bringing a duplicate back: it dismisses the match through the matches module, as before.
- **Removing the first track.** It no longer calls the rename action. It sets the file's start name and left-out state from the next track, as before, and reports "start inherited" with what they are now. The next track's own edits went with its start split when that split was deleted.
- **The split store's interface does not change.** Same members, same signatures, same behaviour.
- **Confidence stays a field of the split.** Making it derived from the ledger (a detected split keeps the confidence it was found with, and shows none while moved or checked) was rejected: it would make the confidence queue depend on the ledger to save two lines.
- **Glossary, already changed in the grilling.** Edit: a split is one edit from the first change to it, even a move back, and only an added split deleted again leaves none; a track's name or its being left out is one edit only while it differs from how the track came to be.

## Testing Decisions

- **Good tests** go through an interface and check what a caller sees: the count, and for the store, `editCount` and `hasEdits`. They do not read the ledger's sets.
- **Two seams.**
  - The edit ledger's interface, a new seam inside the split slice. A new ledger spec calls its operations and reads the count, with no store, no file and no splits.
  - The split store, the existing seam, for the wiring only.
- **Replace, don't layer.** Each case lives once.
  - The ledger spec takes the cases that only exercise a rule: a split moved several times, an added split moved, a detected split moved then deleted, an added split deleted, a checked split moved, a split deleted with its track's rename and left-out edits, a rename taken back, a second toggle, the file's start inheriting each combination, and clear.
  - The store spec's two "edit count" blocks (the top-level one and the one inside removing a track) keep only the wiring: one case per action showing it reports its edit, a move that leaves the split where it was counts nothing, a cut from a left-out track counts nothing, Find splits adds no edit, the settings keep the edits, a new file and reset start at 0, and removing the first track.
  - The find-duplicates store spec keeps its edit-count cases: the dismissal and the duplicate brought back with one press.
  - No case is copied into both.
- **Prior art.**
  - The matches module spec: a composable in the same slice, tested through what it returns.
  - The composable specs beside the drags and the playhead frames, for a composable tested through what it returns.
- **Widget specs are untouched.** About 40 widget and page cases assert the edit count; that they still pass is the check that nothing visible changed.

## Out of Scope

- Dismissals. They stay in the matches module, and the store adds their live count.
- Making confidence derived from the ledger.
- Counting edits by diffing against a baseline (rejected in the review: a split moved back would stop counting).
- One home for per-track data with no first-track special case (review candidate 6). "Start inherited" exists because of that special case, and candidate 6 may remove it.
- Pending splits and the discard question (review candidate 7).
- The room check that the insert action leaves to its callers (the review's "Also noticed").
- Narrowing the split store's returned members.
- Any user-visible change. No changelog line.

## Further Notes

- **Docs that this changes.**
  - The store-wiring skill's section on the user's edits gains one line: a new kind of edit is a ledger operation, and actions report it rather than write the edits.
  - The architecture doc stays: its store table already lists edits under the split store, and the ledger is internal to it.
- **Suggested tickets**, each green on its own and done test-first:
  1. The ledger, with its spec, and the split actions (insert, move, mark checked, removal of a split) reporting to it.
  2. The track edits (rename, leave out) and "start inherited"; removing the first track stops calling the rename action.
  3. The store spec slimmed to the wiring, with the rule cases living in the ledger spec.
- **Checks.** This is a refactor that the existing specs guard. Every spec outside the ledger spec and the store spec's edit-count blocks passes unchanged.
