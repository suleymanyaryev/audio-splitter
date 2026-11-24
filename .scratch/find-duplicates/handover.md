# Handover: find-duplicates (uncommitted)

## State
- Resolved: 01 (506d5cf, note confirmed by the user), 02 (31ac11c), 03 (93e2285), 04 (a3eb860), 05 (190f892), 06 (92bd6af), 07 (29eaa03). Spec/tickets in 963fbb7.
- Frontier: 08 (last) (needs 02+06), 08 last; the user accepted the 03 reading (by-hand copy before the kept copy gets no match). Then 05 (needs 04), 07 (needs 02+06), 08 last (needs 03, 05, 07).
- Final ticket 08 runs code-review, the grouped fixes and the Final tier, and ends with a user-confirmation box (milestone) the worker cannot tick.

## Facts for workers
- The Skill tool refuses `/implement` (disable-model-invocation): read `.agents/skills/implement/SKILL.md` and follow it.
- No CONTEXT.md; the domain doc is `GLOSSARY.md` (+ `docs/adr/`). Tickets use bold `**Status:**` / `**Blocked by:**`.
- `samples/` is absent in the worktree; use `/Users/suleyman/Projects/misc/audio-splitter/samples/` (git-ignored, read only).
- Numbers: `.scratch/find-duplicates/measurement.md`; the idea: `docs/concepts/11-finding-repeats.md`.

## Decisions / notes from the 01 worker (the user confirmed the note)
- measurement.md says track 24 is 122.0 s; re-measured 130.5 s. The note uses 130.5 s.
- 0.95 and 2 s reasoning is in the note; user confirmed it.
- 200 ms copy averaging: mean of dB vs mean of power both keep the groups (0.983/0.865 dB, 0.982/0.863 power). Ticket 02 picks one and records it in the note/ticket Comments.
- A 30 s partial match can score 0.946 (< 0.95); accepted.
- GLOSSARY candidates (unwritten): Offset, Overlap (ticket 01 `## Comments`).

## From the 02 worker (see ticket 02 `## Comments`)
- 200 ms copy averages in dB (not power). Matching uses prefix sums (plain loop took 2.7 s on sample3h, prefix sums 0.84 s): ticket 08 must mention it in note 11 / docs ("a plain loop" is stale).
- Store sends plain numbers to the worker (a Vue proxy broke postMessage silently); fake client uses structuredClone.
- Open: a failed search is silent (idle, last result kept); spec has no failure line. Left as is unless the user wants one.
- "Bring back" on a duplicate row currently marks it left out by hand until ticket 05 makes it dismiss the match. A kept copy left out by hand stays kept until ticket 03.
- code-review runs only in ticket 08 (per the user's goal). docs/architecture.md, README, note 11 "Where it lives" are ticket 08.
- GLOSSARY candidates (unwritten): Offset, Overlap, Stretch, Recording.

## From the 03 worker (see ticket 03 `## Comments`)
- DECIDED (user ok'd current behaviour): a track left out by hand that sits BEFORE the kept copy (e.g. 01 left out, 12 kept) gets no match now (glossary: a match names an earlier track). Spec "Finding matches" read literally gives it "duplicate of 12". One-line change: the `kept < index` condition in src/entities/split/lib/find-matches.ts. Affects ticket 07 (`C` from 01 to 12).
- Counts: a by-hand copy after the kept copy still counts as a duplicate; a recording with every copy left out by hand counts none.

## From the 04 worker (ticket 04 `## Comments`)
- Track.duplicateOf is now { number, ownName } | null; ticket 06 replaces it with the spec's live-matches list.
- Moving the split that starts track 3 also changes track 2, so a duplicate of 2 loses its match (by design). A match returns if ends are restored (liveness is derived).

## From the 05 worker (ticket 05 `## Comments`)
- `dismissMatch(startSplitId, keptStartSplitId)` in split.ts refuses a non-live pair; ticket 06 should reuse it for partial matches. A dismissal is stored with both tracks' ends and is live while they are unchanged. `find-matches.ts` gets `MatchInput.dismissed`.
- Track.duplicateOf gained startSplitId (06 replaces it anyway).
- Open (minor): a track left out by hand that also has a match: first eye/X press brings it back to `duplicate`, second dismisses. Kept as worker's reading of "bring back".
- New dismiss X button in the track list was not looked at in a browser; ticket 08's by-ear check should.

## From the 06 worker (ticket 06 `## Comments`)
- FoundMatch is now {later, earlier, kind: full|holds|part-of, laterShared, earlierShared}. Track.duplicateOf replaced by Track.matches (TrackMatch in match-words.ts): ticket 07's swap target reads it. matchWords/matchTooltip replace duplicateWords; formatTenths in shared/lib/time.
- Worker's reading (not in spec, flag to user at the end): wording for a pair overlapping only at the ends: shared stretch after own extra material = "holds" ("03 from 1:32"); shared stretch at own start while the other has more before = "part of"; both start together = longer one holds. Times in each track's own time, quiet lead included.
- Added a dismiss button for partial matches (story 42); label "Dismiss the match of track N with track M". Count line counts matches, not tracks.
- Tooltip on partial words is hover-only until 07 makes the words a link.
- Ticket 08 by-ear: shuffled-file check, the dismiss X buttons (05, 06), prefix-sums mention, architecture.md, README, note 11 "Where it lives".

## From the 07 worker (ticket 07 `## Comments`)
- `pnpm lint` FAILS on src/entities/split/lib/find-matches.ts:166 (sonarjs/cognitive-complexity 33 of 15), from ticket 06 (92bd6af). Ticket 08 must fix it in code (no eslint.config changes, no suppressions); it is the current work's failure.
- Not looked at in a browser: track-list match link, Track view title with two matches ("01 from 0:02, part of 02 from 0:12.4": wrapping, keyboard tooltip), `C` and playing on across the swap (listening only). Ticket 08 by-ear covers these.
- Worker's readings (flag to user at the end): `C` returns to the origin before looking at own matches; only `C` records the way back (the link doesn't); "nearest shared stretch" by distance from the playhead, target is that stretch's start in the other track even if behind the playhead; title joins matches with ", "; `C` ignored with modifiers; swap blocked if it would discard pending splits.
- GLOSSARY candidates (unwritten): Offset, Overlap, Stretch, Recording, Dismissed pair, Way back, Shared stretch, partial-match wording (holds/part-of).

## Ticket 08 worker done, awaiting the user (UNCOMMITTED in the tree)
- Docs, lint fix (find-matches.ts split up), code-review fixes and Final tier (verify, lint, knip, depcruise, build: all pass) are in the working tree, not committed.
- Left for the user: listen to tracks 08 and 11 of sample1.m4a; `C` while playing (same moment, and back); shuffled sample (samples/sample1-shuffled.m4a: expect 21 duplicates, 2 partial matches, 06 from 0:30.2, 11 from 0:04.4); Track view title wrapping; dismiss X buttons.
- After the user confirms: tick "The user has confirmed the milestone", set ticket 08 `**Status:** resolved`, one commit for ticket 08 (not handover.md), then print grep Status + git log + git status.
