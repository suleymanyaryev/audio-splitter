# Matches as their own module inside the split store

Status: ready-for-agent

Candidate 1 of the [architecture review](../code-cleanup-and-readability/architecture-review.md#1-give-matches-their-own-module). The grilling settled every decision below. It sharpened **Match** and **Kept copy** in the glossary and added **Swap**; the code already behaved that way. No ADR: every decision is cheap to reverse.

## Problem Statement

The split store is the hottest file in the app: about 1500 lines, 49 commits in three months, 80 members returned. Matches (GLOSSARY.md: Match) are its largest single concept, and they are spread over nine places in it: their types and identity helpers, the search state, liveness and the way back of a swap, the `tracks` map, the edit count, `open`, `clearSplits`, `reset`, and the find, dismiss and swap actions.

To learn how duplicates work, a maintainer reads all nine places inside one closure. Finding duplicates converts between track indices and the tracks a match records by hand, twice. Every match test builds its tracks through the store's split actions, so a test about how long a dismissal lasts has to open a file, find splits, and move one. A change to matches risks the rest of the store, and a change to the rest of the store has to step around matches.

## Solution

Matches move into one module inside the split slice. The split store calls it once, feeds it the track ends and what a search needs, and reads the live matches back. The module owns the search, the stored matches, the dismissals and the way back of a swap. Nothing changes for the user, and nothing changes for any widget: the split store returns the same members with the same behaviour.

The design stays as it is. A match records both tracks' ends, and whether it holds is derived, so no edit ever has to find and remove one.

## User Stories

1. As a maintainer, I want every rule about matches in one module, so that I learn duplicates by reading one file.
2. As a maintainer, I want the split store to lose its match code, so that it is shorter and its remaining concepts are easier to find.
3. As a maintainer, I want the module to be fed the track ends rather than the whole store, so that it cannot reach into selection, names or pending splits.
4. As a maintainer, I want the module to be fed the search input (the loudness curve, its window length and the silence threshold, or none while no file is open), so that its only other dependency is explicit.
5. As a maintainer, I want the mapping between track indices and the tracks a match records hidden inside the module, so that no caller converts between them by hand.
6. As a maintainer, I want the press number and the abort of a running search hidden inside the module, so that "an answer for an older press is dropped" lives in one place.
7. As a maintainer, I want one call to drop every match, dismissal and way back and stop a running search, so that opening a file, Clear splits and reset each start matches over the same way.
8. As a maintainer, I want the module to say which matches are live by track index, so that the store's `tracks` map reads them without knowing how liveness works.
9. As a maintainer, I want the module to say how many dismissals are live, so that the edit count adds one number.
10. As a maintainer, I want the module to own whether Find duplicates can be pressed, so that "two tracks of 30 s or more and no search running" lives beside the search.
11. As a maintainer, I want the module to own the result line's counts, so that "nothing before the first press" lives beside the search.
12. As a maintainer, I want the module to own the search status and its failure reason, so that the running, idle and failed states are one module's state machine.
13. As a maintainer, I want the module to own the way back of a swap (GLOSSARY.md: Swap), with the watcher that lets it go, so that "the way back holds while both tracks keep their ends and a live match joins them" lives next to the matches.
14. As a maintainer, I want the module to answer which track and moment a swap goes to, by track index and offset, so that the store only turns that into a track and selects it.
15. As a maintainer, I want selecting the swap's target, the discard question it may open, and clamping to the track's end to stay in the store, so that selection stays in one place.
16. As a maintainer, I want the store to tell the module about a swap only after the selection actually happened, so that a swap the discard question held back leaves no way back.
17. As a maintainer, I want a dismissal to name its pair by the start split ids of both tracks, so that a stale track can never dismiss a pair it no longer is.
18. As a maintainer, I want a dismissal of a pair that is no live match, or is already dismissed, refused inside the module, so that callers need no check of their own.
19. As a maintainer, I want the store to keep building each track's matches with the earlier track's name, so that naming stays where names live.
20. As a maintainer, I want the store to keep deriving the `duplicate` inclusion from the live full matches and the inclusion stored on the split, so that inclusion stays where the stored inclusion lives.
21. As a maintainer, I want leaving out a duplicate to keep bringing it back through a dismissal, so that one press is still enough.
22. As a widget author, I want `findDuplicates`, `dismissMatch`, `canFindDuplicates`, `duplicateResult`, `duplicateSearchStatus`, `duplicateSearchFailure`, `swapTarget` and `swapTrack` unchanged on the split store, so that no widget or widget spec changes.
23. As a user, I want Find duplicates to find the same duplicates and partial matches as before, so that the refactor costs me nothing.
24. As a user, I want a match to last until I dismiss it or either track's ends change, as before.
25. As a user, I want a dismissed match to stay dismissed, and count as one edit, while both tracks keep their ends, as before.
26. As a user, I want the kept copy to stay the one chosen at the last press, even if I leave it out by hand afterwards, as before.
27. As a user, I want `C` to swap to the same moment in the matched track and back again, as before.
28. As a user, I want a search running when I open another file, clear the splits or start over to stop using the CPU, as before.
29. As a test author, I want to test the module with a plain ref of track ends, so that a liveness case changes one track's end rather than moving a split through the store.
30. As a test author, I want each match behaviour tested once, at the interface that owns it, so that the store spec only proves the wiring.
31. As a test author, I want the fake find-matches client shared by the module spec and the store spec, so that both run the real matching in-process.
32. As an agent, I want the module's name and its words to come from the glossary (Match, Kept copy, Duplicate, Partial match, Swap), so that I find it by the domain term.

## Implementation Decisions

- **A composable, not a store.** The matches module is a plain composable in the split slice's model segment. The split store calls it once in its setup and keeps what it returns private. A second Pinia store was rejected: widgets could bypass the split store, and the file's start-over would have to reach into two stores.
- **Inputs.** Exactly two:
  - a reactive list of track ends, one per track: the start split id (none for the first track), the start and end in seconds, and whether the track was left out by hand;
  - a getter for the search input: the loudness curve, its window length and the silence threshold, or none while no file is open.
- **What moves into the module.** The match types and identity helpers (a track as a match records it, a stored match, the pair comparison), the search with its press number and abort, the stored matches, the dismissed pairs, whether a search ran, the status and failure, liveness by index, live dismissals, the way back and its live form, and the watcher that lets the way back go.
- **The module's interface.**
  - Reads:
    - the live matches, by track index: later, earlier, kind and both shared stretches;
    - the live dismissal count;
    - the status (idle, running, failed) and the failure reason;
    - the result: the counts of duplicates and partial matches, or none before the first press;
    - whether a search can be started.
  - Writes:
    - find: runs a search, as the split store's `findDuplicates` does today;
    - dismiss, by the start split ids of the later and the earlier track;
    - drop: forgets every match, dismissal and way back, and stops a running search;
    - the swap's target from a track index and an offset into that track, as the other track's index and an offset into it, or none;
    - remember a swap, by the two track indices.
- **What stays in the split store.**
  - Each track's matches as widgets see them, with the earlier track's number, name and start split id.
  - The `duplicate` inclusion, derived from the live full matches and the inclusion stored on the split.
  - The edit count, which adds the module's live dismissal count.
  - Leaving out a duplicate: it dismisses the full match through the module.
  - `swapTarget` and `swapTrack`: they turn the module's answer into a track and a time clamped to its end, select it, check the selection happened, and only then remember the swap.
  - `open`, `clearSplits` and `reset` call the module's drop.
- **The split store's interface does not change.** Same members, same signatures, same behaviour. Narrowing it is a later candidate's work (one home for per-track data).
- **Identity.** Reads are by track index, because the store's `tracks` map is by index. A dismissal is by start split ids, because they survive edits and a stale index could name another pair. If per-track data later gets one track key, those ids become that key.
- **The worker and its client do not change.** The module calls the existing find-matches client with the same request.

## Testing Decisions

- **Good tests** go through an interface and check what a caller sees: the live matches, the counts, the status, the swap target, the edit count, the export. They do not read held tracks, press numbers or stored pairs.
- **Two seams.**
  - The matches module's interface, a new seam inside the split slice. A new module spec feeds it a plain ref of track ends and a fixed curve.
  - The split store, the existing seam, for the wiring only.
- **Replace, don't layer.** Each case lives once:
  - The new module spec takes the cases that only exercise the module: what counts as the same recording, partial matches, the result, whether it can be pressed, a failing search, an answer that is not wanted any more, a search an edit overtakes, liveness by changing the track ends, how long a dismissal lasts, a second press, and the swap target.
  - The existing find-duplicates store spec keeps the wiring: the export and the `duplicate` inclusion, copies left out by hand, the edit count, bringing a duplicate back, Clear splits and a new file dropping matches, `swapTrack` with the discard question, and one or two cases where a split edit ends a match, which prove the track ends are wired.
  - No case is copied into both.
- **The fake client is shared.** The store spec already replaces the find-matches client with a fake that copies the request with `structuredClone` and runs the real matching in-process. Both specs use it.
- **Prior art.**
  - The find-duplicates store spec: its recordings, playlists and helpers carry over.
  - The composable specs beside the drags and the playhead frames (`use-range-press`, `use-playhead-frames`), for a composable tested through what it returns, fed plain refs.
- **Widget specs are untouched.** That they still pass is the check that the split store's interface did not change.

## Out of Scope

- A spec of its own for the pure matching function. It has none today, and adding one is a follow-up from the review's "Also noticed".
- Any change to how matches are found, to the worker or to its client.
- Narrowing the split store's returned members, or one track key for per-track data (review candidate 6).
- The edit ledger (review candidate 2). The live dismissal count stays one term of the edit count.
- Moving the swap's selection or the discard question out of the store (review candidate 7).
- Any user-visible change. No changelog line.

## Further Notes

- **Docs that this changes.**
  - The architecture doc's Find duplicates section: the sentence saying a store spec runs the matching through a fake client says the matches spec instead. The store table, the sequence diagram and the state diagram stay, because the module is internal to the split store.
  - The store-wiring skill's pointer to where the fake client lives follows the move.
- **Glossary, already changed in the grilling.**
  - Match: it lasts until dismissed or either track's ends change, and a dismissal lasts, as one edit, while both tracks keep their ends.
  - Kept copy: chosen when Find duplicates was last pressed.
  - Swap: a new term.
- **Checks.** This is a refactor that the existing specs guard. Every spec outside the two match specs passes unchanged.
