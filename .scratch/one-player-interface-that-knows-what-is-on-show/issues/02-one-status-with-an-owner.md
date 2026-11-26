# 02: One status with an owner

**What to build:** inside the player store, the two machines' statuses become one status with one owner, the audition or a stretch. Starting one subject takes the status from the other, and stopping, pausing and failing act on the one owner. The rule "at most one of the audition and the stretch is not idle" holds by construction instead of at four sites. Every new press, pause and stop takes its number through one function, so no site increments the press number directly. "The audition still holds its WAV" asks the owner, not the shared URL.

The audition's rules (8 s extent, pause and keep the place on a move, drop the WAV at the end) and the stretch's rules (decode windows, look-ahead, hand-over, keep the WAV at the end) stay as separate functions. The public interface does not change: `status` and `stretchStatus` are derived from the owner for now, and ticket 03 replaces them.

**Blocked by:** 01.

Status: resolved

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: one status with an owner, press numbers).

- [x] One status and one owner replace the two status refs inside the store.
- [x] `status` and `stretchStatus` are still returned, read from the owner, with the same values in every case as today.
- [x] No site sets both statuses by hand; `fail`, `decode`'s file-replaced branch and `start` act on the owner.
- [x] One function takes every press number; no direct `press++` remains.
- [x] The audition's paused-with-WAV check reads the owner.
- [x] The audition's and the stretch's rules stay separate functions; no flag merges them.
- [x] The store spec and every view and page spec pass unchanged.
- [x] No changelog line.

## Comments

- `status` and `stretchStatus` are writable computeds read from the owner, because the view specs assign them directly and must pass unchanged. A write takes the status for that subject; `idle` ends it only when the subject owns it. Ticket 03 removes them.
- "The audition still holds its WAV" is `auditionHoldsWav()`: the owner is the audition and the element has a clip. A paused audition whose split moved is still `paused` but holds none, so the owner alone cannot answer it.
