# 06: `carryOver`

**What to build:** "keep sound going across a change of selection" becomes one player verb, `carryOver(change: () => boolean)`. It reads `isActive`, runs `change`, and if `change` returns true and sound was on, plays the new subject from its own place. Three callers use it instead of the read–change–toggle ordering:

- the Split view's step to the previous or next split;
- the Track view's step to the previous or next track;
- the Track view's swap, which seeks to the matched moment inside `change`, after the store has selected the matching track.

A paused subject counts as off, as today: a step lets go of it and starts nothing.

**Blocked by:** 05.

Status: resolved

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: `carryOver`).

- [x] The player returns `carryOver`; no view reads `isActive` or `status` before a step or a swap.
- [x] The three call sites use it; their comments about the ordering go.
- [x] Player spec: on and the change happened plays the new subject; off starts nothing; on but the change refused (first or last, the discard question) starts nothing and leaves the sound as it was; a seek inside the change rests there and plays from it.
- [x] The view specs for stepping and swapping pass unchanged.
- [x] No changelog line.
- [x] Final tier passes: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`, after the code review and its fixes.

## Comments

- The ticket's "view specs pass unchanged" holds for every assertion, but not for the `toggle` spy's set-up: `carryOver` calls the player's own `toggle`, which a spy on the store cannot see. The `spyOnToggle` helpers in the page spec and the Track view spec now also replace `carryOver` with a fake that plays on through the spy; the real `carryOver` is covered in the player spec.
- The two views read `carryOver` through a `hasStepped` flag set inside the `change` they pass, since the callers also return whether the key stepped.
- Review fixes (final tier): `status` reads idle in the Track view while the range holds the stretch, and the other way round (`activeSubject` is a ref the getter reads); `carryOver` returns whether the change happened, so the three callers lose their flag; `toggle` and `dropPlayhead` share `playOnShow`; the architecture doc says the export stops the sound as the view change does; a stale spec title and a redeclared `Clip` type went.
- Left as they are, with the reasons: the writable `status` computed stays because the view specs assign it and ticket 03 asks them to change only in names (the review flags it as a test seam in the public interface; the way out is to make those specs drive the player, a separate change); the track's place is matched on subject and ends, not a key (ticket 05); the volume and speed cases appear in both the module spec and the player spec because the first proves the element and the second the store's wiring; the other review smells (repeated `split === null` branches, the `(isStale, subject)` clump) are judgement calls with no bug behind them.
- Second review round, on the final code: no hard violation and no blocking gap. One stale name in `docs/concepts/10-speed-without-pitch.md` was fixed (docs only, so no code changed after the Final tier). Left, as judgement calls: `carryOver` replays through `toggle`, which would take back a loading subject if a change returned true without reselecting (every real change reselects); the architecture paragraph on resting places is longer than the doc's own rule wants; the `OnShow` fields and the `split === null` branches could be an audition/stretch object; the writable `status` stays until the view specs may change beyond names.
- Third review round, on the final commit: no hard violation. One behaviour difference from the old code, left on purpose: the track watcher no longer skips the reset in the Range view (the old `view !== 'range'` check went with ticket 04), so `resetStretch('track')` also clears the failure line when the selected track's ends change while the Range view is on show. The old reset cleared it on every other path, the range itself is untouched, and a failure line is re-said on the next press, so no code changed. The other round-three findings are judgement calls or docs wording (a loading stretch is taken back, not paused, by a view change; `carryOn` and `carryOver` are close names; `OnShow.owner` derives from `subject`).
