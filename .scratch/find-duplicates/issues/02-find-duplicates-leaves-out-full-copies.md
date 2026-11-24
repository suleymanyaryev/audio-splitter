# 02: Find duplicates leaves out full copies

**What to build:** a "Find duplicates" button beside "Find gaps". Pressing it compares every track of 30 s or more with every earlier one, in about a second on a 3 h file, without freezing the page. A track that is the same recording as an earlier track from end to end becomes a duplicate. Its row in the track list says "duplicate of 01", its block in the track strip looks left out, and the full export skips it. Every copy of a recording names the earliest copy, the kept copy. On `sample1.m4a` the button says "23 duplicates".

**Blocked by:** 01 (the concept note is confirmed).

**Status:** resolved

Spec: `.scratch/find-duplicates/spec.md` (stories 1–19, 22 and 25–30; Implementation Decisions, "The sliding correlation", "Finding matches", "The worker", "The split store" and "Loudness-curve widget"). Copies left out by hand are ticket 03, edits are 04, dismissing is 05, partial matches are 06 and hearing the pair is 07.

- [x] The sliding correlation is a hand-written pure function in the shared audio maths. Its spec checks numbers worked out by hand:
  - a stretch against itself gives r = 1 at offset 0;
  - a stretch inside a longer one gives r = 1 at its true offset;
  - the same shape 6 dB louder still gives r = 1;
  - a mirrored shape gives a negative r;
  - an overlap under the minimum is never scored;
  - a flat stretch scores no match;
  - ties go to the earliest offset.
- [x] The finding function, in the split slice:
  - it works on the 200 ms copy of the curve, floored at −60 dB;
  - it leaves off each track's quiet ends (under the silence threshold) and skips tracks under 30 s;
  - r ≥ 0.95 is a match, full when it covers both stretches to within 2 s at each end;
  - tracks joined by full matches form a group, whose kept copy is the earliest track. Every other member is a duplicate naming it.
- [x] The thresholds sit in a config file of their own, with a comment pointing at concept note 11.
- [x] A thin worker entry runs the finding function. A small client module sends one request and resolves with the answer, and the worker is terminated after it. Store specs replace the client with an in-process fake running the same function.
- [x] The split store:
  - It holds the matches of the last press, each with both tracks' start splits and ends as they were.
  - A split keeps `included` or `by-hand`. A track's inclusion is `duplicate` while it has a live full match.
  - `findDuplicates` takes a number, and only the latest press's answer for the same file is kept. It changes no split, name, pending split or selection, and asks nothing.
  - It is enabled while at least two tracks are 30 s or longer and no search runs.
  - The result counts are derived from the live matches.
- [x] The button and the line:
  - The button is disabled from the store's getter and busy while the search runs.
  - The line says "N duplicates", or "No duplicates found", and shows nothing before the first press.
- [x] The track list row of a duplicate gives "duplicate of 01" and looks left out. The kept copy has no words.
- [x] The track strip shows a duplicate as left out, and its tooltip gives the words.
- [x] The full export skips duplicates and numbers its files without holes. "Export track…" still works on a duplicate.
- [x] Finding matches is no edit, so "New file" right after a press asks nothing.
- [x] Store specs cover the thresholds, the 30 s skip, a second pass in another order, the kept copy, the counts and the export numbers, on curves from small helpers.
- [x] By ear: `sample1.m4a` gives 23 duplicates in 11 groups.
- [x] `CHANGELOG.md` has the line under Unreleased.

## Comments

Built 2026-11-25. Checked by ear on `sample1.m4a` in the real browser (dev server and a production build, `playwright-cli`): the button says "23 duplicates" in 214 ms, tracks 12 to 22 name 01 to 11, 23 to 33 name 01 to 11 and 34 names 01, so 11 groups. The same function on the real curves in a spec-less script: `sample1.m4a` 23 duplicates in 11 groups in 0.10 s (copies 0.983 and up, different tracks 0.868 at most), `sample3h.m4a` 91 duplicates in the same 11 groups in 0.84 s (Node 24).

**The 200 ms copy averages in dB** (the mean of the floored dB values), not in power. Both keep the groups (concept note: 0.983 and 0.865 against 0.982 and 0.863). dB is a mean with no `Math.pow` or `Math.log10`, and keeps "a louder copy is the same curve plus a constant" exact. `coarse-curve.ts` says so.

Decisions the ticket left open:

- **The quiet ends are trimmed on the 200 ms copy**, not on the 50 ms curve: one curve is compared and trimmed. The sample's groups and the margins above are the same.
- **The offset is signed**: where `stretch`'s first window sits in `along`, negative when it hangs over the start, so two tracks whose ends overlap are scored too. The slide goes from the offset with 30 s of overlap at the start to the one with 30 s at the end.
- **Running totals.** `slidingCorrelation` takes Σa, Σb, Σa² and Σb² from running totals (prefix sums), so each offset costs one pass, for Σab. A plain five-sum loop took 2.7 s on `sample3h.m4a`; this one 0.84 s, which is the note's "about a second". Concept note 11 says "a plain loop"; ticket 08's "Where it lives in the code" should say the totals.
- **Only full matches are made here.** The finding function returns `{ duplicate, kept }` track indices, with no `isFull`, r or shared stretch: tickets 03 (left out by hand), 05 (dismissed pairs) and 06 (partial matches, shared stretch) add what they need. A kept copy left out by hand is still the kept copy until 03.
- **Live matches are derived here**, as the spec has it, because a duplicate must stop being one when an edit changes a track. Ticket 04 still owns its specs for edits, and I added only one (a split inside a copy).
- **Late answers** (a newer press, `clearSplits`, `open`, `reset`) are dropped by one number, and `clearSplits`/`open`/`reset` also drop the matches, so tickets 04's "New file" and "Clear splits" lines already hold.
- **A failed search** (the worker throws) is silent: the status goes back to idle and the last result stays. No failure line is in the spec.
- **The request holds plain numbers.** `postMessage` refused a track that held its Vue split (found in the browser, since a fake client does not clone). The store spec's fake now copies the request with `structuredClone`, and `store-wiring` says so.
- **`toggleLeftOut` on a duplicate** still toggles the stored reason, so "Bring back" on a duplicate leaves it out by hand. Ticket 05 makes it dismiss the match.
- **The loudness panel's row wraps** (`flex-wrap`): the new button and line made it 271 px too wide at 1280 px, the window Playwright opens, and the whole page scrolled sideways. The track list shows the words under the name, since the name column is about 90 px at 1280 px.
- **DESIGN.md and the `store-wiring` skill** changed (the loudness row, the track-list row, the strip's description, the worker pattern). `docs/architecture.md`, README and concept note 11's last section are left to ticket 08.

GLOSSARY candidates (not written): **Offset** and **Overlap** (ticket 01's), **Stretch** (the part of a track that is compared: its 200 ms curve without the quiet ends), **Recording** (the tracks joined through full matches; its first track is the kept copy). No ADR: every decision is cheap to reverse.
