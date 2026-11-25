# 03: The swap and its way back move into the module

**What to build:** `C` in the Track view swaps to the same moment in the track the selected one matches, and back again (GLOSSARY.md: Swap), exactly as before. The matches part of that rule now lives in the matches module:

- which live match the swap follows;
- the moment it lands on;
- the way back, and when that is let go.

The split store keeps the selection part:

- turning the answer into a track;
- clamping to the track's end;
- selecting it, which the discard question may hold back;
- remembering the swap only once the selection happened.

**Blocked by:** 01 (The matches module takes over the search), 02 (Liveness and dismissals tested at the module). 02 does not gate it in code, but both edit the same two specs, so they run one after the other.

**Status:** ready-for-agent

Spec: `.scratch/matches-module/spec.md` (Implementation Decisions, "What stays in the split store").

- [ ] The module answers the swap's target from a track index and an offset into that track, as the other track's index and an offset into it, or none.
- [ ] The module remembers a swap by the two track indices. It owns the way back, its live form, and the watcher that lets it go once either track's ends change or no live match joins them.
- [ ] Drop also forgets the way back.
- [ ] The split store's `swapTarget` and `swapTrack` keep their signatures and behaviour. `swapTrack` remembers the swap only after it checks the selection happened.
- [ ] No match state, way back or identity helper is left in the split store.
- [ ] The swap-target cases move to the module spec. The find-duplicates store spec covers `swapTrack` selecting the target, and a swap that the discard question held back leaving no way back. Add that second case if no spec has it yet.
- [ ] The Track view spec passes unchanged.
- [ ] Final checks pass, run once because this ticket closes the spec.
