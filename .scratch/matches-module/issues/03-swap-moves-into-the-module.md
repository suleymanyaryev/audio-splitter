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

**Status:** resolved

Spec: `.scratch/matches-module/spec.md` (Implementation Decisions, "What stays in the split store").

- [x] The module answers the swap's target from a track index and an offset into that track, as the other track's index and an offset into it, or none.
- [x] The module remembers a swap by the two track indices. It owns the way back, its live form, and the watcher that lets it go once either track's ends change or no live match joins them.
- [x] Drop also forgets the way back.
- [x] The split store's `swapTarget` and `swapTrack` keep their signatures and behaviour. `swapTrack` remembers the swap only after it checks the selection happened.
- [x] No match state, way back or identity helper is left in the split store.
- [x] The swap-target cases move to the module spec. The find-duplicates store spec covers `swapTrack` selecting the target, and a swap that the discard question held back leaving no way back. Add that second case if no spec has it yet.
- [x] The Track view spec passes unchanged.
- [x] Final tier passes: the Final checks, run once because this ticket closes the spec.

## Comments

- The module's swap reads are `swapTarget(index, offsetSeconds)`, answering `{ other, seconds }` from `lib/swap-moment.ts`, and `rememberSwap(fromIndex, toIndex)`. The store clamps to the track's end and selects.
- The store spec keeps 'selects the target track and gives it back…' and 'keeps the selection when the swap would discard pending splits'; the second already proved no way back is left. 'has no target with no track selected' is the store half of the old "is none" case.
- The store case 'loses the way back on Clear splits and on a new file' moved to the module's drop case: emptying the matches ends the way back either way, so the store case proved nothing of its own.
- Final review fixes: the store's header comment points at `matches.ts` rather than repeat it; `MatchedTrack` is `TrackEnds` without `isLeftOutByHand`; `FOREIGN` lives in `made-up-recordings.ts`; the store spec's two dismiss helpers became `dismissThird`; `LiveMatch` is no longer exported (knip); the store-wiring skill names the composable-inside-a-store pattern.
- Left as the spec decided: the architecture doc's sequence and state diagrams still show the split store, as the module is internal to it; reads are by index and a dismissal by start split ids. `duplicateSearchStatus` and `duplicateSearchFailure` are read-only getters now; nothing wrote them.
- Final tier: `pnpm verify` -> pass (2379 tests, build ok), `pnpm lint` -> pass, `pnpm knip` -> fail: unused `LiveMatch` export, fixed -> pass, `pnpm depcruise` -> pass; verify and depcruise rerun after the fix -> pass.
- Code review of the final state (`c3ae235...97adcfd`): Spec `BLOCKING: 0`, Standards `HARD: 0`. Fixed after it: concept note 11 said `swapTarget` selects; only `swapTrack` does. Left as judgement calls: the store header says `open`, `clearSplits` and `reset` drop every match without naming the way back (`matches.ts` says it); `pressedHolder` and `landing` exist in both specs for their two subjects; `dismissThird` keeps its comment. The Final tier stands: nothing but docs changed after it.
- The closing box was "Final checks pass"; it is relabelled "Final tier passes" to match the run's goal, with the same meaning.
- Code review of the whole spec (`4eb0831...77e2d98`): no bug, and nothing missing. Fixed after it: `rememberSwap` refuses two tracks no live match joins, as `dismiss` refuses a stale pair, so a later search that joins them brings no way back (a module case proves it). `swapTrack` only ever passes a joined pair, so nothing changes for the user. The store spec gets back a case for renaming the kept copy after the press, which the move to the module had lost. Left as judgement calls: the `TrackEnds` name, the one-line `findDuplicates`, `computed` rather than `readonly` for status and failure, the `matches.ts` file name, the glossary rewording.
