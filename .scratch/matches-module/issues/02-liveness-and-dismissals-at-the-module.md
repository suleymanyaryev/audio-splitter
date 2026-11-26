# 02: Liveness and dismissals tested at the module

**What to build:** the rules for how long a match lasts and how long a dismissal lasts (GLOSSARY.md: Match) are tested once, at the matches module, by changing a track's ends in a plain ref, rather than by moving splits through the split store. The find-duplicates store spec keeps only the cases that prove the split store wires the module in. This ticket changes no production code. It finishes "replace, don't layer" for the cases ticket 01 left in the store spec.

**Blocked by:** 01 (The matches module takes over the search).

**Status:** resolved

Spec: `.scratch/matches-module/spec.md` (Testing Decisions).

- [x] The module spec covers liveness. A match ends when either track's ends change: its start moves, its end moves, or a new end appears inside it. It holds while they don't.
- [x] The module spec covers dismissals:
  - a dismissal lasts, and counts in the live dismissal count, while both tracks keep their ends;
  - two dismissals count as two;
  - a pair that is no live match, or is already dismissed, is refused;
  - a second press leaves a live dismissed pair out, and finds it again once a track of the pair has changed;
  - a dismissed pair does not join its recording through a third copy;
  - a dismissed last copy stays out of a second press.
- [x] The kept copy stays the one chosen at the last press when its track is later marked left out by hand in the track ends (GLOSSARY.md: Kept copy).
- [x] The find-duplicates store spec keeps only the wiring:
  - the export and the `duplicate` inclusion;
  - copies left out by hand;
  - a dismissal counted in the edit count;
  - bringing a duplicate back;
  - Clear splits and a new file dropping matches and dismissals;
  - one or two cases where moving or adding a split ends a match.
- [x] No case is in both specs, and none is lost: each removed store case has its counterpart in the module spec, or is one of the wiring cases kept.
- [x] Checkpoint checks pass.

## Comments

- Moving a split through Find splits, deleting one and removing a track no longer have store cases: the module covers the rule with `splitTrack` and `mergeWithNext`, and the store keeps two split-edit wiring cases (`addSplitAt` and a moved start split). The `duplicate` inclusion after a merge comes from the same live matches those cases read.
- 'lets the kept copy be left out after the press without moving any match' is now 'writes none of the copies when the kept copy is left out after the press': its match assertion moved to the module's kept-copy case.
- Code review left as judgement calls: some module cases check several refusals or steps in one case; the repeated `trackEnds.value[i]!` chains in edits stay inline.
