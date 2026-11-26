# 06: `carryOver`

**What to build:** "keep sound going across a change of selection" becomes one player verb, `carryOver(change: () => boolean)`. It reads `isActive`, runs `change`, and if `change` returns true and sound was on, plays the new subject from its own place. Three callers use it instead of the read–change–toggle ordering:

- the Split view's step to the previous or next split;
- the Track view's step to the previous or next track;
- the Track view's swap, which seeks to the matched moment inside `change`, after the store has selected the matching track.

A paused subject counts as off, as today: a step lets go of it and starts nothing.

**Blocked by:** 05.

Status: open

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: `carryOver`).

- [ ] The player returns `carryOver`; no view reads `isActive` or `status` before a step or a swap.
- [ ] The three call sites use it; their comments about the ordering go.
- [ ] Player spec: on and the change happened plays the new subject; off starts nothing; on but the change refused (first or last, the discard question) starts nothing and leaves the sound as it was; a seek inside the change rests there and plays from it.
- [ ] The view specs for stepping and swapping pass unchanged.
- [ ] No changelog line.
