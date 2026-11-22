# 01: Tracks carry their own name beside the name shown

**What to build:** A prefactor with no visible change, so the prefix can be added in one place (spec: `.scratch/track-name-prefix/spec.md`).

- Zero-padding a track's number and taking the source file's stem move from the track strip widget down to the split entity, with their specs, so the split store can build a default name later.
- Each track the split store lists carries the user's own name, null while unnamed, next to the name shown. The shown name stays what it is today: the own name, or the number.
- The full export and single export stores read the own name from the track, instead of reaching into the track's start split and the first track's name.

Every name on screen, every file name and every tag stays exactly as today.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The split store's tracks give both the own name (null while unnamed) and the shown name; the store spec covers a renamed track, an unnamed one and the first track
- [x] Both export stores take the own name from the track; their specs pass unchanged
- [x] The padding and stem helpers live in the split entity, and no widget keeps a copy
- [x] No user-visible change, so no changelog line
- [x] Checkpoint and `pnpm depcruise` green (helpers moved across layers)
