# 01: The edit ledger takes the split edits

**What to build:** the Edit rules for splits (GLOSSARY.md: Edit) move into one edit ledger inside the split slice. The ledger is a plain composable that the split store calls once in its setup and keeps private. It knows only split ids, never a split. Insert, move, mark checked and the removal of a split each report their edit with one call, and the ledger applies the rules and keeps the count:

- split added: one edit;
- split moved: one edit unless it was added, and the split no longer counts as checked;
- split checked: one edit;
- split deleted: takes "added" back, or else counts one deletion, and drops the split's moved and checked edits.

The store's edit count is the ledger's count plus the matches module's live dismissal count. Nothing changes for the user or for any widget: `editCount` and `hasEdits` give the same number in every case.

Track names and left-out tracks stay in the store for now, so the removal of a split still drops their edits by hand. Ticket 02 moves them.

**Blocked by:** None (can start immediately).

Status: resolved

Spec: `.scratch/one-edit-ledger-for-the-edit-rules/spec.md` (Implementation Decisions, Testing Decisions).

- [x] An edit ledger exists in the split slice's model segment, as a composable, not a Pinia store, built like the matches module.
- [x] It takes no inputs and keeps its state private.
- [x] Its operations are split added, split moved, split checked and split deleted (each by split id), plus count and clear.
- [x] Insert reports "split added" only for a manual split, one with no confidence; the store decides that, and the ledger never sees confidence.
- [x] Move and mark checked still clear the split's confidence themselves, next to their ledger call.
- [x] A move that leaves the split where it was reports nothing.
- [x] Open, Clear splits and reset forget the edits through the ledger's clear.
- [x] The store's edit count adds the ledger's count and the live dismissal count; `hasEdits` follows it.
- [x] No action writes the moved, added or checked edits, or the deletion count, by hand.
- [x] A new ledger spec tests the split rules with no store: a split moved several times, an added split moved, a detected split moved then deleted, an added split deleted, a checked split moved, a checked split deleted, and clear.
- [x] Those cases leave the store spec's top-level "edit count" block. It keeps one wiring case per action, a move that leaves the split where it was, Find splits adding no edit, the settings keeping the edits, and a new file and reset starting at 0. No case is in both specs.
- [x] Every widget and page spec, and the find-duplicates store spec, passes unchanged.
- [x] No changelog line: nothing the user sees changes.
