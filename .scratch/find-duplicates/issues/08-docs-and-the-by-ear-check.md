# 08: Docs and the by-ear check

**What to build:** the docs describe the app with Find duplicates in it, and the milestone is checked by ear on the samples, ready for the user's confirmation.

**Blocked by:** 03, 05, 07.

**Status:** resolved

Spec: `.scratch/find-duplicates/spec.md` (Implementation Decisions, "Docs that this changes"; Testing Decisions, "By ear, in the browser").

- [x] `docs/architecture.md`:
  - the split store's row holds the matches;
  - the second worker beside ffmpeg's;
  - the search's flow and its status.
- [x] `README.md`: the Review step names finding duplicates. Its "Not in v1" line stays, as it is about v1.
- [x] Concept note 11's "Where it lives in the code" names the modules as built.
- [x] `CHANGELOG.md`: the lines of tickets 02 to 07 read as one feature under Unreleased.
- [ ] By ear, through the `playwright-cli` skill:
  - [x] `sample1.m4a` gives 23 duplicates in 11 groups and no partial match;
  - [x] `sample3h.m4a` gives the same 11 groups;
  - [ ] tracks 08 and 11 are listened to, as the closest different pair (left for the user: the worker cannot listen).
- [x] The shuffled sample:
  - it is made once with native ffmpeg from the tracks of `sample1.m4a` in another order, with two tracks cut 30 s short, and kept in `samples/`;
  - it gives the same groups, and two partial matches at the right times.
- [x] The Final checks pass: `pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`.
- [ ] The user has confirmed the milestone.

## Comments

Worked 2026-11-25. The status stays `ready-for-agent` and the last box open until the user confirms the milestone. Nothing is committed or staged.

**Docs.** `docs/architecture.md` (the `split` row holds matches, a "Find duplicates" section with the search's sequence and status, one bullet on matches stored as found), `README.md` (the Review step), note 11 ("a plain loop" reworded; "As built" paragraph on the running totals, 0.84 s against 2.7 s for all five sums in the inner loop on `sample3h.m4a`; "Where it lives in the code" filled in), `CHANGELOG.md` (the six lines of tickets 02 to 07 rewritten into six that read as one feature, in glossary words). Note 11's "Time" table still carries the spike's 0.95 s for 200 ms on `sample3h.m4a` (a plain loop, as measured then); the as-built figure is 0.84 s and the 2.7 s is ticket 02's plain five-sum loop, so the two plain-loop figures differ and were left as measured.

**By ear, in a real browser (`playwright-cli`, Chrome, dev server).**

- `sample1.m4a`, Find gaps (33 splits) then Find duplicates: "23 duplicates", the track list names 01 to 11 as kept copies, so 11 groups, no partial match.
- `sample3h.m4a`: "91 duplicates", 102 tracks, the kept copies are 001 to 011 (11 groups), no partial match.
- Shuffled sample, made once with native ffmpeg from `sample1.m4a`'s 34 tracks in a seeded random order (seed 7), kept as `samples/sample1-shuffled.m4a` (git-ignored): the track of original 25 lost its first 30 s of music (now track 06), the track of original 1 lost its last 30 s (now track 11). Find gaps gives 33 splits and Find duplicates "21 duplicates, 2 partial matches" (23 less the two cut tracks): track 18 says "06 from 0:30.2" (tooltip "0:30.2 to 1:32.4 here, 0:01.2 to 1:03.4 in track 06"; the cut is 30.9 s into its track's time, so 0.7 s under, inside the 0.65 s alignment slack of the note, plus the 0.2 s step) and track 20 says "11 from 0:04.4" (its music starts 4.4 s in, which is where the stretch both share starts). The duplicates name the same kept copies as before, adjusted for the order.
- The dismiss X: on a partial match (track 14 of `sample1.m4a` with its split 14|15 deleted: "21 duplicates, 2 partial matches", the title "03 from 0:04.4, 04 from 1:40.4"; X gives "21 duplicates, 1 partial match" and the title loses that word) and on a duplicate (12: "20 duplicates", its row then shows "Leave out track 12", so it is exported again). Both look right, the X sits beside the words and does not grow the row.
- The match link: clicking "06 from 0:30.2" selects track 6 in the Track view; the tooltip opens on hover and on keyboard focus.
- The Track view title with two matches ("sample1-14 · 0:23:34.28 – 0:26:44.70 · 03 from 0:04.4, 04 from 1:40.4") wraps onto three lines at 1600 px; the buttons stay on the right and the waveform sits 28 px lower, nothing is cut or overflows.
- `C` from track 18 with the playhead before the shared stretch lands at the start of the stretch in track 06 (1.2 s); `C` again goes back to 18.
- The console held no errors. **Not listened to, because the worker cannot listen:** tracks 08 and 11 (the closest different pair, r 0.831), `C` and playing on across the swap, and whether the swap's moment sounds the same in both tracks. Those two boxes are the user's.

**Code review** (code-review skill, two sub-agents, over `git diff 0a47160` including the working tree). Fixed in one group each:

- `pnpm lint` failure in `find-matches.ts`: `findMatches` split into `candidateOf`, `candidatesOf`, `recordingRoots`, `keptCopies`, `duplicatesOf` and `partialMatchesOf` with a small `Scale`, the sliding and the Pearson maths untouched; specs unchanged and green.
- Glossary avoid-words ("repeat", "copy" for a track) in the CHANGELOG, README, the button's tooltip and four comments.
- A held `C` on a track with no target was swallowed by the page (story 55): now only taken when a target exists (`TrackView.vue`, with a spec).
- A duplicate's shared stretch was the whole of both stretches, so `C` landed up to 2 s off for a track cut short or late: it now keeps the aligned stretch of the scored pair (`duplicatesOf`, with a spec in `find-duplicates.spec.ts`).
- Comment wrapping in `TrackView.vue`, `TrackList.vue`, `TrackStrip.vue`, `split.ts`; a grammar slip and the long-title note in `DESIGN.md`; two behaviour bullets out of `docs/architecture.md`.

Left as is (judgement calls, say so if you want any):

- Story 45: a track left out by hand that also has a match needs two presses (first to `duplicate`, then to dismiss). Ticket 05 raised it; still unanswered.
- The spec's recorded r is not kept (nothing reads it); a duplicate's row has no tooltip.
- `kind` is `full` in the finding function and `duplicate` in `TrackMatch`, with a mapping in `split.ts`; one vocabulary would be a refactor.
- `split.ts` grew by about 430 lines; the swap logic (`swapTarget`, `wayBack`) is pure and could move to `lib/`. Helpers `heldOf` and `asPressed` build the same shape. Not done now.
- `swapTarget` is exported and only specs call it beside `swapTrack`.
- A failed search is silent (status back to idle), and the worker client handles no `messageerror`; the store-wiring skill's job pattern has more statuses.
- DESIGN.md, the store-wiring skill and the shortcuts dialog's "Click a match's words" row go beyond the spec's list of docs; each came with its ticket.

**Final tier:** `pnpm verify -> pass`, `pnpm lint -> pass` (it failed on `find-matches.ts:166` at the start, fixed in code; one `unicorn/prefer-simple-condition-first` in my own `TrackView.vue` edit fixed), `pnpm knip -> pass`, `pnpm depcruise -> pass`, `pnpm build -> pass`. `pnpm test:e2e` not run: the plan names no browser flow that unit tests cannot cover.

GLOSSARY candidates (not written): **Offset**, **Overlap**, **Stretch** (the part of a track that is compared: its 200 ms curve without the quiet ends), **Shared stretch**, **Recording** (the tracks joined through full matches; its first track is the kept copy), **Dismissed pair**, **Way back** (the swap's memory of where `C` came from), the partial-match words (`holds` / `part-of`, "from" in this track's time). No ADR candidate: every decision is cheap to reverse.

- Orchestrator: the user said to continue and will review after everything is finished, so the milestone box stays unticked until they have. The listening items (tracks 08 and 11, `C` while playing) and the three open questions in the worker report are theirs.
