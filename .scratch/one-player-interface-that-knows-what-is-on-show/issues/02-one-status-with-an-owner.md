# 02: One status with an owner

**What to build:** inside the player store, the two machines' statuses become one status with one owner, the audition or a stretch. Starting one subject takes the status from the other, and stopping, pausing and failing act on the one owner. The rule "at most one of the audition and the stretch is not idle" holds by construction instead of at four sites. Every new press, pause and stop takes its number through one function, so no site increments the press number directly. "The audition still holds its WAV" asks the owner, not the shared URL.

The audition's rules (8 s extent, pause and keep the place on a move, drop the WAV at the end) and the stretch's rules (decode windows, look-ahead, hand-over, keep the WAV at the end) stay as separate functions. The public interface does not change: `status` and `stretchStatus` are derived from the owner for now, and ticket 03 replaces them.

**Blocked by:** 01.

Status: open

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: one status with an owner, press numbers).

- [ ] One status and one owner replace the two status refs inside the store.
- [ ] `status` and `stretchStatus` are still returned, read from the owner, with the same values in every case as today.
- [ ] No site sets both statuses by hand; `fail`, `decode`'s file-replaced branch and `start` act on the owner.
- [ ] One function takes every press number; no direct `press++` remains.
- [ ] The audition's paused-with-WAV check reads the owner.
- [ ] The audition's and the stretch's rules stay separate functions; no flag merges them.
- [ ] The store spec and every view and page spec pass unchanged.
- [ ] No changelog line.
