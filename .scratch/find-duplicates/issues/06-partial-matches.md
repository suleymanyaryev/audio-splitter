# 06: Partial matches

**What to build:** a track that shares at least 30 s with an earlier track, but not end to end, has a partial match. Its row says "03 from 1:40" when it holds 03 from 1:40 on, or "part of 03 from 0:30" when it is the stretch of 03 from 0:30. A tooltip gives the shared stretch on both sides. The track stays in the export, and the strip does not change. The result line counts partial matches too.

**Blocked by:** 02.

**Status:** resolved

Spec: `.scratch/find-duplicates/spec.md` (stories 33–41; Implementation Decisions, "Finding matches", partial matches, and "Track list, track strip and Track view").

- [x] A pair with r ≥ 0.95 whose shared stretch misses an end of either track by more than 2 s is a partial match.
- [x] It is made only from a track that is not a duplicate to an earlier track that is not a duplicate. A duplicate shows only its full match.
- [x] A track can have several partial matches: a track missing its split holds both pieces, and shows both.
- [x] The words:
  - the track holds the other: "03 from 1:40", the time in this track;
  - the track is part of the other: "part of 03 from 0:30", the time in the other track;
  - times are to 0.2 s;
  - the tooltip gives both ranges.
- [x] A track with a partial match stays `included` and is exported. The strip shows it as it shows any track.
- [x] The line reads "3 duplicates, 1 partial match", with singular and plural right.
- [x] Store specs on made-up curves cover:
  - a missing split, holding two earlier tracks;
  - a split placed late, on both sides of it;
  - a duplicate with no partial match;
  - no partial match naming a duplicate.
- [x] By ear: `sample1.m4a` still has no partial match.
- [x] `CHANGELOG.md` has the line under Unreleased.

## Comments

Built 2026-11-25. By ear in the real browser (dev server, `playwright-cli`): `sample1.m4a` with Find gaps (33 splits) and Find duplicates says "23 duplicates", no partial match, the same 11 groups. Deleting the split between 14 and 15 and pressing again says "21 duplicates, 2 partial matches", and the merged track 14 reads "03 from 0:04.4" and "04 from 1:40.4" (the 4.4 s is the quiet lead of the track, in this track's time).

- **`Track.duplicateOf` is replaced by `Track.matches`** (`TrackMatch` in `match-words.ts`): the live matches of the track, in track order, each with the kind (`duplicate`, `holds`, `part-of`), the other track's live number, own name and start split, and the shared stretch `here` and `there` in seconds from each track's start. Ticket 07's swap target can read it. `duplicateWords` is now `matchWords`, and `matchTooltip` words the tooltip.
- **`FoundMatch` is `{ later, earlier, kind, laterShared, earlierShared }`**, with `kind` `full`, `holds` or `part-of`; `MatchInput.dismissed` is `{ later, earlier }`. The old `duplicate`/`kept` names did not fit a partial match, whose other track is no kept copy. The spec's recorded r is not kept: nothing reads it.
- **Question the spec leaves open, read as follows (veto it if wrong):** a pair that overlaps only at the ends (neither track holds the other's whole stretch) has to be worded as one of the two forms. The track whose shared stretch starts after more than 2 s of its own material holds the other ("03 from 1:32": the end of a track that is the start of 03). The track whose shared stretch starts at its start, while the other has more before it, is part of the other. When both start together, the one that goes on longer holds the other ("02 from 0:00" for a track that is 02 and more). Times are in each track's own time, quiet lead included. A split placed 30 s late therefore gives the long track both "01 from 0:02" and "02 from 0:42", and the short one "part of 02 from 0:32".
- **The count line counts matches, not tracks**: a track holding two earlier tracks adds 2 partial matches. A line with only one kind says only that kind ("1 partial match"); neither says "No duplicates found".
- **Each partial match has its dismiss button**, as the spec's story 42 says ("beside a match's words"), though this ticket's boxes do not list it; `dismissMatch` already takes any live pair. The button's label is now "Dismiss the match of track N with track M", since a track can have several. A dismissed pair is skipped by the next press and makes neither a partial match nor a duplicate; a dismissed duplicate counts as a non-duplicate for the partial rule.
- **A duplicate shows no tooltip** (its match is the whole of both); only partial words have one. The words are a plain `p` for now, so the tooltip opens on hover only: ticket 07 makes them a link, which brings the keyboard.
- **The tooltip of the Find duplicates button** now says "...from end to end or in part".
- **The name column at 1280 px cuts "03 from 0:04.4" to "03 from 0…"** (the column is about 90 px, as ticket 02 found); the tooltip has the rest. Not widened here.
- Specs: store (`find-duplicates.spec.ts` "partial matches"), `format-tenths.spec.ts`, `format-readout.spec.ts`, `LoudnessSettings.spec.ts`, `TrackList.spec.ts`, `TrackStrip.spec.ts`. The finding function is tested through the store.
- Docs left to ticket 08 (`docs/architecture.md`, README, note 11 "Where it lives"); DESIGN.md changed.

GLOSSARY candidates (not written): **Partial match** wording (`holds` / `part-of`, "from" in this track's or the other's time); **Dismissed pair** (ticket 05's). No ADR.
