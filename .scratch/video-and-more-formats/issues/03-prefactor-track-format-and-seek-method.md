# 03: Prefactor: the probe gives a track format and a seek method

**What to build:** the probe outcome stops using one value for two jobs. It carries the **track format** (the file type tracks are exported in, set by the codec) and the **seek method** (once before the input, or twice, set by the container). Decode, cut and export read whichever they need. Only the three v1 pairs exist, so nothing changes for the user.

See the spec's "The probe outcome splits what one value did".

**Blocked by:** 02

**Status:** resolved

- [x] The probe outcome for `.m4a` is track format `m4a` with seek once; for `.mp3`, `mp3` with seek twice; for `.opus`, `opus` with seek twice.
- [x] The cut picks its seek from the seek method and its extension and tag placement from the track format.
- [x] The decode's slice length still follows the codec (MP3 keeps its longer slices).
- [x] The export widgets still name files by the track format, unchanged.
- [x] Every existing spec passes with no change to what it checks, including the e2e export spec for the three v1 fixtures.

## Comments

- The store's `format` is now typed `TrackFormat` (renamed from `SupportedFormat`) and keeps its name, so the export widgets are untouched. The seek method is a private ref of the store and is not exposed: only `cutTrack` reads it.
- `TrackFormat` still has three values. `ogg` joins in ticket 06.
- Added "Seek method" to GLOSSARY.md, because the code and note 12 now use the term. `docs/architecture.md` says "per seek method" for the cut commands.
- Verified: `pnpm typecheck`, `pnpm test:changed` (858 tests), `pnpm lint:changed` pass; `e2e/export.spec.ts` (3 formats, whole and single) passes, 6 of 6.
- Code review (Standards and Spec axes): no hard findings. Fixed a ragged comment, a stale ".mp3 and .opus" comment and an overclaiming test title. Left alone as judgement calls: `format` and `seek` as two values (they are set by two different things), and `seek: 'once'` repeated in the cut spec's calls.
