# 02: The track edits join the ledger, and removing the first track stops renaming

**What to build:** the Edit rules for tracks (GLOSSARY.md: Edit) move into the edit ledger from ticket 01. A track is named by its key: the id of the split where it starts, or none for the file's start. Rename and leave out report their edit with one call, and the ledger applies the rules:

- track named (key, whether named): an edit while the track has a name;
- left out toggled (key): one edit, and a second toggle takes it back;
- start inherited (whether named, whether left out by hand): the file's start is an edit while it is named, and an edit while it is left out by hand, because a file opens with its first track unnamed and included.

"Split deleted" now also drops the rename and left-out edits of the track that starts at that split, so the removal of a split makes one ledger call.

Removing the first track stops calling the rename action for its side effect on the edits. It still sets the file's start name and left-out state from the next track, and reports "start inherited" with what they are now. Nothing changes for the user or for any widget.

**Blocked by:** 01 (The edit ledger takes the split edits).

**Status:** ready-for-agent

Spec: `.scratch/one-edit-ledger-for-the-edit-rules/spec.md` (Implementation Decisions, Testing Decisions).

- [ ] The ledger's operations gain track named, left out toggled and start inherited.
- [ ] Rename reports "track named"; a rename that leaves the stored name as it was reports nothing.
- [ ] Leave out reports "left out toggled". Bringing a duplicate back still dismisses its match through the matches module, and reports a toggle only when the track was also left out by hand.
- [ ] A track cut from a left-out track is left out with no edit, as before.
- [ ] "Split deleted" drops the rename and left-out edits keyed by that split; the removal of a split writes no edit by hand.
- [ ] Removing the first track does not call the rename action, and reports "start inherited".
- [ ] No action writes the rename or left-out edits by hand.
- [ ] The ledger spec gains the track rules: a rename several times, a rename taken back, a second toggle, a split deleted with its track's rename and left-out edits, and "start inherited" in each of its four combinations.
- [ ] Those cases leave the store spec, including the "edit count" block inside removing a track. The store spec keeps one wiring case for rename, one for leave out, the cut from a left-out track, and removing the first track. No case is in both specs.
- [ ] The store-wiring skill's section on the user's edits gains one line: a new kind of edit is an operation of the edit ledger, and actions report it rather than write the edits.
- [ ] Every widget and page spec, and the find-duplicates store spec, passes unchanged.
- [ ] No changelog line: nothing the user sees changes.
