# 04: Matches follow the splits

**What to build:** a match lasts only while both its tracks are as they were at the press. Moving or deleting a split at either end of a matched track, or adding a split inside it (by hand or with Find gaps), drops that track's matches and the matches that name it. A duplicate that loses its match is exported again. Matches on other tracks stay, and their words follow the live track numbers. Clear splits and New file drop every match. A second press replaces every match with a fresh result.

**Blocked by:** 02.

**Status:** resolved

Spec: `.scratch/find-duplicates/spec.md` (stories 20, 21, 58–65, 67 and 68; Implementation Decisions, "The split store", live matches and the duplicate reason).

- [x] A match is live while both tracks exist with the ends it recorded. Nothing removes matches on an edit; the live list is derived.
- [x] For each of these on a matched track, both its matches and those naming it go:
  - a split at its start or end is moved;
  - a split at its start or end is deleted;
  - a split is added inside it by hand;
  - Find gaps adds a split inside it;
  - the track is removed (merged).
- [x] A duplicate that loses its match is included again, unless it was left out by hand. A split inside a duplicate makes two included tracks, and a merge that starts with a duplicate makes an included track.
- [x] An edit elsewhere keeps the match:
  - the words show the kept copy's live number, so a split added earlier in the file renumbers them;
  - they add the kept copy's own name when it has one ("duplicate of 01 Opening").
- [x] A late answer:
  - a split moved while the search runs leaves the matches it touches dead when the answer arrives;
  - an answer after New file or after a newer press is dropped.
- [x] Clear splits and New file drop every match, and the line shows nothing again.
- [x] A second press replaces every match.
- [x] Store specs cover each case.
- [x] `CHANGELOG.md` has the line under Unreleased if the user can see a change.

## Comments

Built 2026-11-25. Almost all of this was already true from ticket 02: live matches are derived (`liveMatches` in `split.ts`) and the duplicate reason is derived, so no edit removes anything. This ticket added the specs for every case and the one missing piece, the kept copy's own name in the words.

- **`Track.duplicateOf` is now `{ number, ownName } | null`** (was a number), so the words can say "duplicate of 01 Opening". `duplicateWords(kept, trackCount)` takes that object. Ticket 06 turns this into the live matches list the spec describes.
- **An edit to a track also kills the match of the track that names it.** Moving the start split of 03 changes 02 too, so 04 (a duplicate of 02) loses its match as well. The specs say so; it follows from "both tracks keep the ends they recorded".
- **A match revives if the ends come back** (a split moved away and back, an undone cut). That is the derived rule, and the ticket's first box.
- **Late answers**: specs cover a split moved, a split added inside, `clearSplits`/`open`/`reset` (ticket 02's) and an older press overtaken by a newer one.
- No GLOSSARY or ADR candidates beyond ticket 02's. Docs left to ticket 08. No "By ear" box here.
