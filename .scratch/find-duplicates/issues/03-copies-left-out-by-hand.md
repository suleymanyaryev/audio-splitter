# 03: Copies left out by hand

**What to build:** the user's own left-out choices shape the result. The kept copy is the earliest copy the user has not left out by hand. A copy already left out by hand keeps that reason and only gains its "duplicate of" words. When every copy of a recording is left out by hand, none of them gets a match. Leaving the kept copy out after the press changes nothing else, and the next press picks the kept copy again from the left-out state as it is then.

**Blocked by:** 02.

**Status:** ready-for-agent

Spec: `.scratch/find-duplicates/spec.md` (stories 23, 24, 31, 32 and 66; Implementation Decisions, "Finding matches", the kept copy).

- [ ] With 01 left out by hand, 12 is the kept copy, and 23 and 34 name 12.
- [ ] A copy left out by hand before the press:
  - it shows "duplicate of 01";
  - its inclusion stays `by-hand`;
  - it looks and exports like any track left out by hand.
- [ ] A group whose every member is left out by hand gives no match, and the counts leave it out.
- [ ] Leaving the kept copy out by hand after the press:
  - it is allowed;
  - it moves no match;
  - so the export may write none of the copies.
- [ ] A second press after that makes the next copy not left out by hand the kept copy.
- [ ] Store specs cover each case.
- [ ] `CHANGELOG.md` has the line under Unreleased if the user can see a change.
