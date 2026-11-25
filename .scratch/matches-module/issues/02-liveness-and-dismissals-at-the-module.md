# 02: Liveness and dismissals tested at the module

**What to build:** the rules for how long a match lasts and how long a dismissal lasts (GLOSSARY.md: Match) are tested once, at the matches module, by changing a track's ends in a plain ref, rather than by moving splits through the split store. The find-duplicates store spec keeps only the cases that prove the split store wires the module in. This ticket changes no production code. It finishes "replace, don't layer" for the cases ticket 01 left in the store spec.

**Blocked by:** 01 (The matches module takes over the search).

**Status:** ready-for-agent

Spec: `.scratch/matches-module/spec.md` (Testing Decisions).

- [ ] The module spec covers liveness. A match ends when either track's ends change: its start moves, its end moves, or a new end appears inside it. It holds while they don't.
- [ ] The module spec covers dismissals:
  - a dismissal lasts, and counts in the live dismissal count, while both tracks keep their ends;
  - two dismissals count as two;
  - a pair that is no live match, or is already dismissed, is refused;
  - a second press leaves a live dismissed pair out, and finds it again once a track of the pair has changed;
  - a dismissed pair does not join its recording through a third copy;
  - a dismissed last copy stays out of a second press.
- [ ] The kept copy stays the one chosen at the last press when its track is later marked left out by hand in the track ends (GLOSSARY.md: Kept copy).
- [ ] The find-duplicates store spec keeps only the wiring:
  - the export and the `duplicate` inclusion;
  - copies left out by hand;
  - a dismissal counted in the edit count;
  - bringing a duplicate back;
  - Clear splits and a new file dropping matches and dismissals;
  - one or two cases where moving or adding a split ends a match.
- [ ] No case is in both specs, and none is lost: each removed store case has its counterpart in the module spec, or is one of the wiring cases kept.
- [ ] Checkpoint checks pass.
