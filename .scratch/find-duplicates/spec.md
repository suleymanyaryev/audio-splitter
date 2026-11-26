# Find duplicates: matches between tracks that repeat

Status: resolved

From GitHub issue #12, milestone 2 of the [v2 milestones](../audio-splitter-v2/milestones.md#milestone-2-duplicate-tracks). The measurement and every decision of the grilling are in [measurement.md](measurement.md). The words are in the glossary. The grilling added **Match**, **Kept copy**, **Duplicate** and **Partial match**, and changed **Left-out track** and **Edit**. No ADR: every decision is cheap to reverse.

## Problem Statement

A source file I load is often a playlist played two or three times. Splitting it gives me every track two or three times, and today I find the copies by ear and leave them out one by one. In a 3 h file that is a hundred tracks to listen to.

When a split is missing or misplaced in one pass, the tracks of the passes no longer line up. I can't tell that from the track list, and a track holding two pieces goes into my music player as one.

## Solution

- **Find duplicates.** A button beside "Find gaps" compares every track with every earlier one, only when I press it. It says what it found: "3 duplicates, 1 partial match", or "No duplicates found".
- **Duplicates.** A track that is the same recording as an earlier track, from end to end, is a duplicate. It says "duplicate of 01" and is left out of the full export, still in the review and still heard.
- **The kept copy.** Of the copies of one recording, the earliest that I have not left out by hand is kept and exported. Every other copy names it.
- **Partial matches.** A track that shares at least 30 s with an earlier track, but not end to end, has a partial match. It says where: "03 from 1:40" when this track holds 03 from 1:40 on, "part of 03 from 0:30" when this track is the stretch of 03 from 0:30. It stays in the export. It usually means a split is missing or misplaced, and the time tells me where.
- **Any order.** Each pair of tracks is compared on its own, so a second pass in another order is found as well.
- **Dismissing.** I dismiss a match I disagree with. A duplicate is then exported again.
- **Hearing the pair.** The words are a link to the other track. In the Track view, `C` swaps to the same moment in the other track, so I hear the two side by side.
- **After an edit.** Moving, deleting or adding a split at a matched track's ends drops its matches. I press Find duplicates again, which takes about a second on a 3 h file.

## User Stories

### Finding duplicates

1. As a user, I want duplicates looked for only when I press "Find duplicates", so that the app proposes nothing I did not ask for.
2. As a user, I want "Find duplicates" beside "Find gaps", so that I find it where I already find the other detection.
3. As a user, I want the button disabled while fewer than two tracks are 30 s or longer, so that I am not offered a search that cannot find anything.
4. As a user, I want the button to show it is busy while it runs, so that I know my press was taken.
5. As a user, I want the search done in about a second on a 3 h file, so that pressing it again after an edit costs nothing.
6. As a user, I want the page to stay responsive while it runs, so that the player and the views don't freeze.
7. As a user, I want a line saying how many duplicates and partial matches there are, so that I know what to review.
8. As a user, I want "No duplicates found" when there are none, so that I can tell the search ran.
9. As a user, I want that line to stay true after I dismiss a match or an edit drops one, so that it never counts what is no longer there.
10. As a user, I want the search to change no split, no name and no pending split, so that pressing it never costs me work.
11. As a user, I want the search to ask nothing, so that it is one press.

### What counts as a match

12. As a user, I want a repeat found whatever order the second pass plays the tracks in, so that shuffled repeats are caught too.
13. As a user, I want a track and its copy matched even when their splits fall a little differently, so that a split off by a second still finds its copy.
14. As a user, I want a track and its copy matched however loud each one is, so that a copy at another level is still found.
15. As a user, I want two different tracks with a similar beat left unmatched, so that I never lose a track I want.
16. As a user, I want tracks shorter than 30 s left out of the search, so that a short piece is never matched by chance.
17. As a user, I want the quiet ends of each track ignored when comparing, so that fade-ins and fade-outs don't make different tracks look alike.
18. As a user, I want a track compared only with earlier tracks, so that the first copy in the file is the one that stays.

### Duplicates and the kept copy

19. As a user, I want a full copy of an earlier track to say "duplicate of 01", so that I know which track it repeats.
20. As a user, I want the number in those words to be the track's place in the file as it is now, so that it still points at the right track after I add a split elsewhere.
21. As a user, I want the kept copy's own name in the words when it has one ("duplicate of 01 Opening"), so that I recognise the piece without selecting it.
22. As a user, I want every copy of a recording to name the same kept copy, not the copy before it, so that a piece played four times reads as one kept copy and three duplicates.
23. As a user, I want the kept copy to be the earliest copy I have not left out by hand, so that the export never loses a piece because I left out its first copy.
24. As a user, I want no match at all when every copy of a recording is left out by hand, so that the app does not override my choice.
25. As a user, I want the kept copy to carry no words, so that the list stays quiet where nothing needs my attention.
26. As a user, I want a duplicate left out of the full export, so that the folder holds each piece once.
27. As a user, I want a duplicate to stay in the track list and the track strip and to be heard like any track, so that I can check it before I trust it.
28. As a user, I want a duplicate drawn like a left-out track in the track strip, with its words in the tooltip, so that the strip shows what the export skips.
29. As a user, I want a duplicate to still be exportable on its own with "Export track…", so that leaving it out only affects the full export.
30. As a user, I want the full export to number the files without holes where duplicates were, so that the folder reads 01, 02, 03.
31. As a user, I want a track I left out by hand to keep that reason when it is found to be a duplicate, gaining only the words, so that a dismissal later does not bring back a track I removed myself.
32. As a user, I want leaving the kept copy out by hand after the search to change nothing else, so that what I do to one track does not move another.
33. As a user, I want a duplicate to show only its full match, so that the partial matches its kept copy already shows are not repeated on it.

### Partial matches

34. As a user, I want a track that shares at least 30 s with an earlier track to have a partial match, so that a missing or misplaced split is not missed.
35. As a user, I want a track that holds an earlier track to say "03 from 1:40", so that I know where in this track the missing split goes.
36. As a user, I want a track that is part of an earlier track to say "part of 03 from 0:30", so that I know which stretch of the other track it is.
37. As a user, I want the shared stretch on both sides in a tooltip, so that I can check both times.
38. As a user, I want a track to show several partial matches when it holds several earlier tracks, so that a track missing a split shows both pieces it holds.
39. As a user, I want a partial match to leave the track in the export, so that nothing I have not checked disappears.
40. As a user, I want a partial match never to name a duplicate, so that every match points at a track the export writes.
41. As a user, I want a partial match not to change the track strip, so that the strip still shows only what the export skips.

### Dismissing

42. As a user, I want a dismiss button beside a match's words in the track list, so that I can reject a match I disagree with.
43. As a user, I want a dismissed duplicate exported again, so that a wrong match never costs me a track.
44. As a user, I want a dismissed match on a track I left out by hand to leave the track out, so that my own choice holds.
45. As a user, I want bringing a duplicate back (the eye button, or `X` in the Track view) to dismiss its match, so that the button that says "bring back" does what it says.
46. As a user, I want a dismissal counted as one edit, so that "New file" and "Clear splits" ask before they throw it away.
47. As a user, I want the matches the search finds not counted as edits, so that "New file" right after a search asks nothing.
48. As a user, I want a match I dismissed to stay dismissed when I press Find duplicates again, as long as neither track's ends changed, so that I don't reject it twice.

### Hearing the pair

49. As a user, I want a match's words to be a link that selects the other track in the Track view, so that I can hear the track it names.
50. As a user, I want `C` in the Track view to swap to the same moment in the other track of the match, so that I hear the two side by side.
51. As a user, I want `C` to keep playing when the track was playing, so that the swap is a comparison by ear, not a stop.
52. As a user, I want `C` on a track with several partial matches to use the one whose shared stretch holds the playhead, so that it swaps to the piece I am hearing.
53. As a user, I want `C` outside every shared stretch to jump to the start of the nearest one, so that the key always takes me somewhere useful.
54. As a user, I want `C` pressed again on the kept copy to take me back to the track I came from, so that I can go back and forth.
55. As a user, I want `C` to do nothing on a track with no match and no way back, so that it never jumps somewhere unrelated.
56. As a user, I want the Track view's title to give the match's words, so that I see what I am comparing while I listen.
57. As a user, I want `C` in the shortcuts dialog, so that I can find the key.

### After an edit

58. As a user, I want a matched track's matches dropped when a split at either of its ends moves or is deleted, so that a match never describes a track that no longer exists.
59. As a user, I want a matched track's matches dropped when a split is added inside it, by me or by Find gaps, so that the halves don't carry a match that was for the whole.
60. As a user, I want the matches that name a track dropped when that track's ends change, so that no match points at a stretch that has moved.
61. As a user, I want a duplicate that loses its match exported again, unless I left it out by hand, so that an edit never hides a track silently.
62. As a user, I want a merged or cut track never to inherit the duplicate reason, so that only a live match leaves a track out as a duplicate.
63. As a user, I want matches on other tracks kept when I edit one track, so that one fix does not undo the whole review.
64. As a user, I want a split moved while the search runs to drop the matches it touches when the result arrives, so that a late result never matches tracks that have changed.
65. As a user, I want a second press to replace every match with a fresh result, so that the result after a fix is complete.
66. As a user, I want a second press to pick the kept copy again from the left-out state as it is now, so that a track I left out since is no longer kept.
67. As a user, I want "Clear splits" and "New file" to drop every match and every dismissal, so that nothing is left over for the next start.
68. As a user, I want a result that arrives after "New file" or a newer press thrown away, so that an old result never shows.

## Implementation Decisions

### The sliding correlation (shared audio maths)

- **A new pure function** next to the median and the loudness builder. Given two stretches of a loudness curve and a minimum overlap, it slides the shorter along the longer one window at a time. At each offset it computes Pearson's r over the overlap, if the overlap is at least the minimum. It returns the best r, its offset and the overlap's length.
- **Hand-written**, as `AGENTS.md` asks for signal maths: a plain loop with running sums, no FFT and no library. The FFT is left to the spectrum milestone, which teaches it.
- **Ties** go to the earliest offset, so the result is the same on every run.
- **A flat stretch** (no variance, so r would divide by zero) scores no match.

### Finding matches (split slice, lib)

- **A pure function** that takes the loudness curve, its window length, the silence threshold and the tracks: their ends, whether each is left out by hand, and the dismissed pairs. It returns the matches. All of the rules below are in it, so the store and the worker share one function.
- **The curve compared** is a 200 ms copy of the loudness curve: four 50 ms windows averaged, with every value under −60 dB counted as −60. The measurement found the same groups as at 50 ms, at a tenth of the time.
- **Each track's stretch** leaves off the windows under the silence threshold at both ends. A track whose stretch is under 30 s is not compared.
- **Every pair** of compared tracks goes through the sliding correlation with a 30 s minimum overlap.
- **A match** is a pair with r ≥ 0.95. It is full when the shared stretch covers both stretches to within 2 s at each end, and partial otherwise.
- **The kept copy.** Full matches put tracks into groups: tracks joined through any chain of full matches are one group. In each group, the kept copy is the earliest track not left out by hand. Every other member is a duplicate whose match names the kept copy. A group with every member left out by hand gives no match.
- **Partial matches** are made only from a track that is not a duplicate to an earlier track that is not a duplicate. A track can have several. A duplicate gets no partial match.
- **Dismissed pairs** give no match. A dismissed duplicate is not a duplicate, so it counts as a non-duplicate for the partial-match rule.
- **Each match records** the two tracks by their start split (the file's start for the first track), both tracks' ends as they were, whether it is full, r, and the shared stretch on each side, in seconds from each track's start, to 0.2 s.
- **The thresholds** live in a config file of their own beside the gap defaults, with a comment pointing at concept note 11: 0.95, 30 s, 2 s, the 200 ms step and the −60 dB floor.

### The worker

- **One new worker entry** in the split slice. It receives the curve and the tracks, runs the finding function, and posts the matches back. It holds no logic of its own, because a worker entry triggers the full test suite and its logic must be importable by specs.
- **A small client module** beside it starts the worker, sends one request and resolves with its answer. It is the one module that store specs replace, with a fake that runs the same finding function in-process.
- **The curve is copied** to the worker per press (about 0.9 MB for a 3 h file at 50 ms). The worker is terminated when its answer arrives.

### The split store

- **New state:** the matches of the last press, the dismissed pairs, and the search status (`idle` or `running`).
- **Live matches** are a derived list. A stored match is live while both its tracks still exist with the same ends and the pair is not dismissed. Edits never need to find and remove matches. A match whose tracks changed, including while the search ran, is simply no longer live.
- **The duplicate reason is derived, not stored.** The split keeps `included` or `by-hand`. A track's inclusion is `by-hand` when its split says so, `duplicate` when it has a live full match, and `included` otherwise. So a split or a merge never carries the duplicate reason, and a dropped match brings the track back by itself. This replaces the plan, in the current comment on the inclusion type, to store the duplicate reason on the split.
- **Track fields.** Each track gains its live matches, each with the other track and the words' parts: the kind, the other track's live number and own name, and the "from" time. The export number skips duplicates as it skips tracks left out by hand.
- **`findDuplicates`** is enabled while at least two tracks are 30 s or longer and no search is running. It takes a number, like a player press. It sends the curve, the silence threshold, the tracks and the live dismissals to the worker client. When the answer arrives for the latest number and the same file, it replaces the stored matches. Splits, names, pending splits and the selection are untouched, and nothing asks.
- **The result counts** (duplicates, partial matches) are derived from the live matches. The line shows nothing before the first press.
- **`dismissMatch`** stores the pair, with both tracks' ends, as dismissed. It is one edit while it is live: the edit count gains a set of dismissed pairs beside the renamed and left-out keys.
- **Bringing a duplicate back** with the left-out toggle dismisses its match instead of toggling the reason. The toggle on a dismissed duplicate leaves it out by hand, as on any track.
- **The swap target.** A getter gives, for the selected track and a playhead time, the track and time `C` goes to: the match whose shared stretch holds the time, or the start of the nearest shared stretch. On the kept copy, it is the track the last swap came from while that match is live, or none.
- **Reset, Clear splits and opening a file** clear the matches, the dismissals and the swap's way back, and stop listening for a running search's answer.

### Loudness-curve widget

- **The button** "Find duplicates" sits beside "Find gaps" in the settings row. It is disabled from the store's getter and busy while the status is `running`. The result line ("3 duplicates, 1 partial match", "No duplicates found") sits beside it.

### Track list, track strip and Track view

- **Track list.** The row of a track with a live match shows the words, one per match, as a link that selects the other track, with a dismiss button. The tooltip gives the shared stretch on both sides. The buttons stop the row's click, as the row's other buttons do. A duplicate's row looks left out.
- **Track strip.** A duplicate's block looks left out, and its tooltip adds the words. A partial match changes nothing.
- **Track view.** The title adds the words of the selected track's match. `C` selects the swap target and moves the playhead there. If the track was playing, it plays on from there. The audition store needs only what it has: selecting another track ends the stretch, and the view starts it again at the new playhead.
- **Shortcuts dialog.** `C` joins the Track view's section.

### Docs that this changes

- **Concept note 11**, `docs/concepts/11-finding-repeats.md`, is written and confirmed before any code. It covers the sliding correlation, Pearson's r, the loop at 19:42.3, the separation, the 30 s table, the 200 ms copy, and why the FFT waits.
- **`docs/architecture.md`:** the split store's row (matches), the second worker, and the search's flow and status.
- **`README.md`:** the Review step gains finding duplicates, and the concept-note list gains note 11.
- **`CHANGELOG.md`:** one line under Unreleased.

## Testing Decisions

- **A good test** goes through the public seam and checks what the user would notice: which tracks are duplicates of which, what the words say, what the export skips, what an edit drops. It does not check how the matches are stored or how a live match is computed.
- **Three seams.** The split store is the main one. The sliding correlation is the second, for the maths. The existing component specs are the third, for what is seen and pressed. No new component seams, and no e2e spec.
- **The sliding correlation** gets its own spec, with numbers that can be checked by hand:
  - a stretch against itself gives r = 1 at offset 0;
  - a stretch inside a longer one gives r = 1 at its true offset;
  - the same shape 6 dB louder still gives r = 1;
  - a mirrored shape gives a negative r;
  - an overlap under the minimum is never scored;
  - a flat stretch scores no match.
    Prior art: the specs of the median and the loudness builder.
- **The split store** spec builds curves from small helpers, as the existing `curveOf` does. The fake worker client runs the real finding function in-process. It covers:
  - the thresholds, full against partial, and the 30 s skip;
  - a second pass in another order;
  - the kept copy, including with copies left out by hand;
  - the words, and the live number after a split elsewhere;
  - partial matches holding two tracks, and never naming a duplicate;
  - dismissing, and the left-out toggle on a duplicate;
  - edits that drop matches, and a result that arrives after a split moved;
  - Clear splits and New file;
  - a second press with remembered dismissals, and edit counting;
  - the export numbers;
  - the swap target.
    Prior art: the Find gaps and left-out tests in the split store's spec.
- **The finding function** is tested through the store, not on its own: its rules are the store's behaviour. A separate spec is added only for a rule the store cannot reach.
- **The worker client** has no spec: it is a few lines around `postMessage`.
- **Component specs** cover the following, each next to the existing tests of its component:
  - the button's disabled and busy states and the result line (the loudness settings);
  - the words, the tooltip, the link and the dismiss button (the track list);
  - the left-out look and the tooltip of a duplicate (the track strip);
  - the title, `C`, and playing on after a swap (the Track view);
  - the `C` entry (the shortcuts dialog).
- **By ear, in the browser:**
  - `sample1.m4a` gives 23 duplicates in 11 groups and no partial match;
  - `sample3h.m4a` gives the same 11 groups;
  - a shuffled file, made once with native ffmpeg from the tracks of `sample1.m4a` in another order, with two tracks cut 30 s short, gives the same groups and two partial matches at the right times. It is kept in `samples/`, which is git-ignored.

## Out of Scope

- A spectral fingerprint. The loudness curve separated repeats from different tracks on the samples. The spectrum comes with milestone 7.
- An FFT-based correlation.
- A stretch shared in the middle of both tracks, such as a medley quoting another piece. The whole overlap is scored at each offset, so this is not found.
- A slider or setting for the thresholds.
- Finding duplicates by itself, on load or after an edit.
- Matching against tracks of another source file.
- Cancelling a running search.
- Fixing a partial match for the user. The user adds or moves the split, then presses again.
- Keeping matches across a reload (milestone 5).

## Further Notes

- **Decided while writing this spec**, not in the grilling, so they are open to veto:
  - bringing a duplicate back with the left-out toggle dismisses its match;
  - `C` keeps playing across the swap;
  - `C` on the kept copy goes back;
  - shared-stretch times are to 0.2 s.
- **The thresholds come from one soundtrack and one master.** The duplicates scored 0.987 and up, and different tracks 0.831 and under. Other music may sit closer. The concept note should say so, and the calibration should be repeated when a file does not fit.
- **The closest different pair on the sample** is 08 and 11 at r = 0.831, well under 0.95. Worth one listen during the by-ear check.
- **The order the work runs in**, per `AGENTS.md`: concept note 11, a stop for confirmation, then the build, then a stop for the milestone's confirmation.
