# 04: Move the playhead with the pointer

**What to build:** In the Split view, a click anywhere off the split line moves the playhead there, and a drag moves it along. While the pointer is held, a playing audition pauses, and it plays on from where the pointer is let go. A paused or idle audition stays so. A press within reach of the split line still moves the split (spec: user stories 7–14).

- The time comes from the pointer, snapped to 10 ms as split drags already are, and held to the audition's extent: a click outside the 8 s lands on its nearest edge, and a drag past an edge parks there.
- Only the primary button acts. There is no double-click action and no mark in the Split view.
- A lost release (a move with no button held, or lost pointer capture) lets go as the Track view does.
- The store gains a grab and a drop for the audition: grab pauses a playing audition, and drop plays on only if it was playing and is still paused (a view switch or another sound may have taken over).
- The cursor shows a resize cursor over the split line as today.

**Blocked by:** 03 (Step the playhead with the keys), for the audition's seek and the playhead slider.

**Status:** resolved

- [x] A click off the split line moves the playhead there, playing or not
- [x] A drag moves the playhead along and parks it at the audition's edges
- [x] A press near the split line still moves the split, and never moves the playhead
- [x] Holding the pointer pauses a playing audition; letting go plays on from the drop
- [x] A paused or idle audition is not started by a click or drag
- [x] A lost release lets go
- [x] Audition store spec and Split view spec cover the above
- [x] Shortcuts dialog rows for click and drag; `CHANGELOG.md` line updated

## Comments

- The press, lost-release (move with no button held, lost pointer capture) and primary-button guards now cover the split drag too, since the playhead and the split share one handler in `use-split-drag.ts`. A non-primary press on the split line no longer starts a split drag.
- While the audition is loading, a grab does nothing: the press only moves the resting place, and the decode that finishes starts from it. Not started by the pointer itself.
- A drag parked on the audition's right edge and released while it was playing plays from the start: a place at the end has nothing to hear, as for the stretch ("a playhead left at the very end plays from the start").
- Left alone from the code-review: the grab/drop pair repeats the stretch's (two flags, two copies, the repo's precedent), `held` has no `pointerId` (a second finger drops the first's drag, as in the Track view), and `architecture.md` is unchanged because no store, connection, flow or status changed.
- Fixed from the code-review: `use-split-drag.ts` had no direct spec for the playhead branch; 10 tests added to `lib/__tests__/use-split-drag.spec.ts`.
- Checks: `pnpm test` -> pass (1758, before the lib spec); after it `pnpm vitest run src/widgets/split-zoom/lib -> pass` (87), `pnpm test:changed -> pass`, `pnpm lint:changed -> pass`, `pnpm typecheck -> pass`.
