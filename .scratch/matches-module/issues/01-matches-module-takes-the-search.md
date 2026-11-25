# 01: The matches module takes over the search

**What to build:** matches (GLOSSARY.md: Match) get their own module inside the split slice, and the split store hands it everything about Find duplicates except the swap. The module is a plain composable that the split store calls once in its setup and keeps private. It is fed the track ends and a getter for the search input, and it owns:

- the search, with its press number and abort;
- the stored matches and the dismissed pairs;
- liveness, by track index;
- the status, the failure reason and the result;
- whether a search can be started;
- drop.

The split store keeps its interface: same members, same signatures, same behaviour, so no widget changes. The way back of a swap (GLOSSARY.md: Swap) stays in the store for now, reading the module's live matches; ticket 03 moves it.

**Blocked by:** None (can start immediately).

**Status:** resolved

Spec: `.scratch/matches-module/spec.md` (Implementation Decisions, Testing Decisions).

- [x] A matches module exists in the split slice's model segment, named after the glossary term, as a composable, not a Pinia store.
- [x] Its inputs are exactly two:
  - a reactive list of track ends: start split id, start, end, and whether the track was left out by hand;
  - a getter for the search input (curve, window length, silence threshold), or none while no file is open.
- [x] Its reads are:
  - the live matches by track index (later, earlier, kind, both shared stretches);
  - the live dismissal count;
  - the status and the failure reason;
  - the result (the two counts, or none before the first press);
  - whether a search can be started.
- [x] Its writes are:
  - find;
  - dismiss, by the start split ids of the later and the earlier track, refusing a pair that is no live match or is already dismissed;
  - drop, which also stops a running search.
- [x] Nothing outside the module sees held tracks, stored pairs or press numbers. The match types and identity helpers move out of the split store.
- [x] The split store builds each track's matches, derives the `duplicate` inclusion, adds the live dismissal count to the edit count, and calls drop from `open`, `clearSplits` and `reset`.
- [x] The split store still returns `findDuplicates`, `dismissMatch`, `canFindDuplicates`, `duplicateResult`, `duplicateSearchStatus` and `duplicateSearchFailure` unchanged, and leaving out a duplicate still brings it back through a dismissal.
- [x] The fake find-matches client moves to a test helper that both the module spec and the find-duplicates store spec import.
- [x] A new module spec, fed a plain ref of track ends and a fixed curve, takes these cases from the find-duplicates store spec, which drops them:
  - what counts as the same recording;
  - partial matches;
  - the result;
  - whether it can be pressed;
  - a search that fails;
  - an answer that is not wanted any more;
  - a search that an edit overtakes;
  - a second press.
- [x] No case is copied into both specs. Every widget spec passes unchanged.
- [x] `docs/architecture.md`, Find duplicates section: the sentence saying a store spec runs the matching through a fake client now names the matches spec. The store-wiring skill's pointer to the fake follows it.
- [x] Checkpoint checks pass.

## Comments

- The module is `src/entities/split/model/matches.ts`, `useMatches`, named after the glossary's Match like `split.ts` after Split.
- Its find write is `search()`: unicorn's `no-unused-builtin-method-return` reads `await matches.find()` as an array's `find`. Same behaviour as the ticket's "find".
- Until ticket 03 the way back stays in the store with a small lookup of its own (`indexOfKept`), and the store's `dropMatches` calls the module's drop and clears the way back, as before.
- `canFindDuplicates` now needs the whole search input (curve, window length, threshold), not only the curve. `open` sets all three together and `reset` clears all three, so nothing changes.
- The test fake lives in `model/__tests__/fake-find-matches-client.ts`, and the made-up recordings both specs use in `model/__tests__/made-up-recordings.ts`.
- Code review left as judgement calls: `TrackEnds` also carries `isLeftOutByHand`; `dismiss` takes two positional ids; the architecture diagram still shows the store running the search, kept as the spec says since the module is private to `split`. Ticket 03 is the place to settle the way back's type.
- A running search stopping on open, Clear splits and reset is proven at the module's `drop`; the store spec proves the three call it by the matches going.
