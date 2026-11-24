# 04: Matches follow the splits

**What to build:** a match lasts only while both its tracks are as they were at the press. Moving or deleting a split at either end of a matched track, or adding a split inside it (by hand or with Find gaps), drops that track's matches and the matches that name it. A duplicate that loses its match is exported again. Matches on other tracks stay, and their words follow the live track numbers. Clear splits and New file drop every match. A second press replaces every match with a fresh result.

**Blocked by:** 02.

**Status:** ready-for-agent

Spec: `.scratch/find-duplicates/spec.md` (stories 20, 21, 58–65, 67 and 68; Implementation Decisions, "The split store", live matches and the duplicate reason).

- [ ] A match is live while both tracks exist with the ends it recorded. Nothing removes matches on an edit; the live list is derived.
- [ ] For each of these on a matched track, both its matches and those naming it go:
  - a split at its start or end is moved;
  - a split at its start or end is deleted;
  - a split is added inside it by hand;
  - Find gaps adds a split inside it;
  - the track is removed (merged).
- [ ] A duplicate that loses its match is included again, unless it was left out by hand. A split inside a duplicate makes two included tracks, and a merge that starts with a duplicate makes an included track.
- [ ] An edit elsewhere keeps the match:
  - the words show the kept copy's live number, so a split added earlier in the file renumbers them;
  - they add the kept copy's own name when it has one ("duplicate of 01 Opening").
- [ ] A late answer:
  - a split moved while the search runs leaves the matches it touches dead when the answer arrives;
  - an answer after New file or after a newer press is dropped.
- [ ] Clear splits and New file drop every match, and the line shows nothing again.
- [ ] A second press replaces every match.
- [ ] Store specs cover each case.
- [ ] `CHANGELOG.md` has the line under Unreleased if the user can see a change.
