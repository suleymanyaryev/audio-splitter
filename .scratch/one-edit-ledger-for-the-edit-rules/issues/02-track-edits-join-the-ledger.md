# 02: The track edits join the ledger, and removing the first track stops renaming

**What to build:** the Edit rules for tracks (GLOSSARY.md: Edit) move into the edit ledger from ticket 01. A track is named by its key: the id of the split where it starts, or none for the file's start. Rename and leave out report their edit with one call, and the ledger applies the rules:

- track named (key, whether named): an edit while the track has a name;
- left out toggled (key): one edit, and a second toggle takes it back;
- start inherited (whether named, whether left out by hand): the file's start is an edit while it is named, and an edit while it is left out by hand, because a file opens with its first track unnamed and included.

"Split deleted" now also drops the rename and left-out edits of the track that starts at that split, so the removal of a split makes one ledger call.

Removing the first track stops calling the rename action for its side effect on the edits. It still sets the file's start name and left-out state from the next track, and reports "start inherited" with what they are now. Nothing changes for the user or for any widget.

**Blocked by:** 01 (The edit ledger takes the split edits).

**Status:** resolved

Spec: `.scratch/one-edit-ledger-for-the-edit-rules/spec.md` (Implementation Decisions, Testing Decisions).

- [x] The ledger's operations gain track named, left out toggled and start inherited.
- [x] Rename reports "track named"; a rename that leaves the stored name as it was reports nothing.
- [x] Leave out reports "left out toggled". Bringing a duplicate back still dismisses its match through the matches module, and reports a toggle only when the track was also left out by hand.
- [x] A track cut from a left-out track is left out with no edit, as before.
- [x] "Split deleted" drops the rename and left-out edits keyed by that split; the removal of a split writes no edit by hand.
- [x] Removing the first track does not call the rename action, and reports "start inherited".
- [x] No action writes the rename or left-out edits by hand.
- [x] The ledger spec gains the track rules: a rename several times, a rename taken back, a second toggle, a split deleted with its track's rename and left-out edits, and "start inherited" in each of its four combinations.
- [x] Those cases leave the store spec, including the "edit count" block inside removing a track. The store spec keeps one wiring case for rename, one for leave out, the cut from a left-out track, and removing the first track. No case is in both specs.
- [x] The store-wiring skill's section on the user's edits gains one line: a new kind of edit is an operation of the edit ledger, and actions report it rather than write the edits.
- [x] Every widget and page spec, and the find-duplicates store spec, passes unchanged.
- [x] No changelog line: nothing the user sees changes.
- [x] Final tier passes (code-review and its grouped fixes done, then `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`).

## Comments

- The ticket had no `Final tier passes` box, though it is the last ticket; the box above was added so the final tier has a place to be recorded.
- The `/implement` skill refused the Skill tool (`disable-model-invocation`), so its file was followed by hand, as the goal allows.
- Code review (standards and spec axes) found leftover rule cases in the store spec, stale "moved or deleted" comments and a `clearEdits` pass-through. All three were fixed in this commit, not as separate fix commits, because the review ran before the ticket's commit.
- Kept in the store spec on purpose: the added-split cases that go through pending-split apply and `addSplitAt` (different callers of insert), and the cut-from-a-left-out-track case that removes the first track (the one wiring case for "start inherited" with a left-out state).
- Left alone as judgement calls: a named `TrackKey` type, and the length of the ledger's header comment.
