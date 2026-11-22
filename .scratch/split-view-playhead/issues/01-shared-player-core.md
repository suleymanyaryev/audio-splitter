# 01: Prefactor: shared player core

**What to build:** No behaviour changes. The player store has two ways of listening, the audition and a stretch (the range, or the selected track). Pull out the parts both need, so the audition can gain pause and seek in tickets 02–05 without copying the stretch's code (spec: `.scratch/split-view-playhead/spec.md`, first Implementation Decision):

- the one hidden audio element, made on the first press, with the volume applied,
- holding a decoded WAV and releasing it (only one WAV is held at a time),
- turning a time in the file into a position in the held WAV, and the sound's position back into a file time,
- starting the element, and wording a refusal as a failure unless the press went stale,
- the press number that makes a clip arriving for an older press be dropped.

Range, track and audition playing, the window ahead for long tracks, volume and failures all behave exactly as before. Where the core lives (a plain module the store uses, or private functions grouped inside the store) is the implementer's call. Keep the store's public surface unchanged.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The parts listed above exist once and both listening paths use them
- [x] The store's public surface is unchanged, and no other file has to change
- [x] The existing audition store, Split view, Track view, Range view and review page specs pass unchanged
- [x] `pnpm cpd` reports no new clone in the player store
- [x] No `CHANGELOG.md` line: nothing the user can see changes

## Comments

- The audio element, hold/release, `offsetOf` and `playElement` were already single shared functions in `audition.ts`. The work was the two remaining duplicates: the press number (`beginPress()`, used by `start`, `playStretch` and `carryOn`) and the sound's file position (`stretchPosition` became `soundPosition`, which `playheadSeconds` now uses too). The core stays as private functions in the store.
- Checks: `pnpm vitest run src/widgets/split-zoom src/pages/review -> pass` (462), `pnpm lint:changed -> pass`, `pnpm typecheck -> pass`, `pnpm cpd -> no clone mentions audition.ts`, `pnpm test -> pass` (1685). Code-review: Standards and Spec both found no violation.
- The goal text expects a `Final tier passes` box and a "step 5" in the implement skill. Neither exists in these tickets or in `.agents/skills/implement/SKILL.md`, which instead says to code-review after each ticket. The Final tier runs on ticket 06 anyway.
- The planning files (spec, tickets, GLOSSARY.md) were staged before the run, so this commit carries them to keep one commit per ticket and a clean tree.
