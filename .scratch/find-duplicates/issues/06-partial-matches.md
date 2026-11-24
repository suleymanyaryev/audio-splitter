# 06: Partial matches

**What to build:** a track that shares at least 30 s with an earlier track, but not end to end, has a partial match. Its row says "03 from 1:40" when it holds 03 from 1:40 on, or "part of 03 from 0:30" when it is the stretch of 03 from 0:30. A tooltip gives the shared stretch on both sides. The track stays in the export, and the strip does not change. The result line counts partial matches too.

**Blocked by:** 02.

**Status:** ready-for-agent

Spec: `.scratch/find-duplicates/spec.md` (stories 33–41; Implementation Decisions, "Finding matches", partial matches, and "Track list, track strip and Track view").

- [ ] A pair with r ≥ 0.95 whose shared stretch misses an end of either track by more than 2 s is a partial match.
- [ ] It is made only from a track that is not a duplicate to an earlier track that is not a duplicate. A duplicate shows only its full match.
- [ ] A track can have several partial matches: a track missing its split holds both pieces, and shows both.
- [ ] The words:
  - the track holds the other: "03 from 1:40", the time in this track;
  - the track is part of the other: "part of 03 from 0:30", the time in the other track;
  - times are to 0.2 s;
  - the tooltip gives both ranges.
- [ ] A track with a partial match stays `included` and is exported. The strip shows it as it shows any track.
- [ ] The line reads "3 duplicates, 1 partial match", with singular and plural right.
- [ ] Store specs on made-up curves cover:
  - a missing split, holding two earlier tracks;
  - a split placed late, on both sides of it;
  - a duplicate with no partial match;
  - no partial match naming a duplicate.
- [ ] By ear: `sample1.m4a` still has no partial match.
- [ ] `CHANGELOG.md` has the line under Unreleased.
