# 03: Prefactor: the probe gives a track format and a seek method

**What to build:** the probe outcome stops using one value for two jobs. It carries the **track format** (the file type tracks are exported in, set by the codec) and the **seek method** (once before the input, or twice, set by the container). Decode, cut and export read whichever they need. Only the three v1 pairs exist, so nothing changes for the user.

See the spec's "The probe outcome splits what one value did".

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The probe outcome for `.m4a` is track format `m4a` with seek once; for `.mp3`, `mp3` with seek twice; for `.opus`, `opus` with seek twice.
- [ ] The cut picks its seek from the seek method and its extension and tag placement from the track format.
- [ ] The decode's slice length still follows the codec (MP3 keeps its longer slices).
- [ ] The export widgets still name files by the track format, unchanged.
- [ ] Every existing spec passes with no change to what it checks, including the e2e export spec for the three v1 fixtures.
