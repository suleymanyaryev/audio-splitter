# 08: Docs and the by-ear check

**What to build:** the docs describe the app with Find duplicates in it, and the milestone is checked by ear on the samples, ready for the user's confirmation.

**Blocked by:** 03, 05, 07.

**Status:** ready-for-agent

Spec: `.scratch/find-duplicates/spec.md` (Implementation Decisions, "Docs that this changes"; Testing Decisions, "By ear, in the browser").

- [ ] `docs/architecture.md`:
  - the split store's row holds the matches;
  - the second worker beside ffmpeg's;
  - the search's flow and its status.
- [ ] `README.md`: the Review step names finding duplicates. Its "Not in v1" line stays, as it is about v1.
- [ ] Concept note 11's "Where it lives in the code" names the modules as built.
- [ ] `CHANGELOG.md`: the lines of tickets 02 to 07 read as one feature under Unreleased.
- [ ] By ear, through the `playwright-cli` skill:
  - `sample1.m4a` gives 23 duplicates in 11 groups and no partial match;
  - `sample3h.m4a` gives the same 11 groups;
  - tracks 08 and 11 are listened to, as the closest different pair.
- [ ] The shuffled sample:
  - it is made once with native ffmpeg from the tracks of `sample1.m4a` in another order, with two tracks cut 30 s short, and kept in `samples/`;
  - it gives the same groups, and two partial matches at the right times.
- [ ] The Final checks pass: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [ ] The user has confirmed the milestone.
