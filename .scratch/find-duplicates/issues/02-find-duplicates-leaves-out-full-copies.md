# 02: Find duplicates leaves out full copies

**What to build:** a "Find duplicates" button beside "Find gaps". Pressing it compares every track of 30 s or more with every earlier one, in about a second on a 3 h file, without freezing the page. A track that is the same recording as an earlier track from end to end becomes a duplicate. Its row in the track list says "duplicate of 01", its block in the track strip looks left out, and the full export skips it. Every copy of a recording names the earliest copy, the kept copy. On `sample1.m4a` the button says "23 duplicates".

**Blocked by:** 01 (the concept note is confirmed).

**Status:** ready-for-agent

Spec: `.scratch/find-duplicates/spec.md` (stories 1–19, 22 and 25–30; Implementation Decisions, "The sliding correlation", "Finding matches", "The worker", "The split store" and "Loudness-curve widget"). Copies left out by hand are ticket 03, edits are 04, dismissing is 05, partial matches are 06 and hearing the pair is 07.

- [ ] The sliding correlation is a hand-written pure function in the shared audio maths. Its spec checks numbers worked out by hand:
  - a stretch against itself gives r = 1 at offset 0;
  - a stretch inside a longer one gives r = 1 at its true offset;
  - the same shape 6 dB louder still gives r = 1;
  - a mirrored shape gives a negative r;
  - an overlap under the minimum is never scored;
  - a flat stretch scores no match;
  - ties go to the earliest offset.
- [ ] The finding function, in the split slice:
  - it works on the 200 ms copy of the curve, floored at −60 dB;
  - it leaves off each track's quiet ends (under the silence threshold) and skips tracks under 30 s;
  - r ≥ 0.95 is a match, full when it covers both stretches to within 2 s at each end;
  - tracks joined by full matches form a group, whose kept copy is the earliest track. Every other member is a duplicate naming it.
- [ ] The thresholds sit in a config file of their own, with a comment pointing at concept note 11.
- [ ] A thin worker entry runs the finding function. A small client module sends one request and resolves with the answer, and the worker is terminated after it. Store specs replace the client with an in-process fake running the same function.
- [ ] The split store:
  - It holds the matches of the last press, each with both tracks' start splits and ends as they were.
  - A split keeps `included` or `by-hand`. A track's inclusion is `duplicate` while it has a live full match.
  - `findDuplicates` takes a number, and only the latest press's answer for the same file is kept. It changes no split, name, pending split or selection, and asks nothing.
  - It is enabled while at least two tracks are 30 s or longer and no search runs.
  - The result counts are derived from the live matches.
- [ ] The button and the line:
  - The button is disabled from the store's getter and busy while the search runs.
  - The line says "N duplicates", or "No duplicates found", and shows nothing before the first press.
- [ ] The track list row of a duplicate gives "duplicate of 01" and looks left out. The kept copy has no words.
- [ ] The track strip shows a duplicate as left out, and its tooltip gives the words.
- [ ] The full export skips duplicates and numbers its files without holes. "Export track…" still works on a duplicate.
- [ ] Finding matches is no edit, so "New file" right after a press asks nothing.
- [ ] Store specs cover the thresholds, the 30 s skip, a second pass in another order, the kept copy, the counts and the export numbers, on curves from small helpers.
- [ ] By ear: `sample1.m4a` gives 23 duplicates in 11 groups.
- [ ] `CHANGELOG.md` has the line under Unreleased.
