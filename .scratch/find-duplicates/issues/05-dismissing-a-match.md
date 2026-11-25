# 05: Dismissing a match

**What to build:** a dismiss button beside each match's words in the track list. Dismissing a duplicate's match exports the track again. A track left out by hand stays out. Bringing a duplicate back with the eye button or `X` dismisses its match. A dismissal is one edit, and a second press does not find a dismissed match again while neither track's ends have changed.

**Blocked by:** 04 (a dismissal lives exactly as long as a match does).

**Status:** resolved

Spec: `.scratch/find-duplicates/spec.md` (stories 42–48; Implementation Decisions, "The split store", `dismissMatch` and bringing a duplicate back, and "Track list").

- [x] The dismiss button:
  - it sits beside the words, can be reached with Tab and has a label naming the track;
  - it stops the row's click.
- [x] A dismissed duplicate is `included` and exported. A dismissed match on a track left out by hand leaves it `by-hand`.
- [x] The left-out toggle on a duplicate:
  - the eye button and `X` in the Track view dismiss its match;
  - leaving a duplicate out by hand is not possible, as it is already out;
  - leaving out a dismissed duplicate sets `by-hand` as today.
- [x] A dismissal stores the pair and both tracks' ends. It is live while those ends are unchanged.
- [x] A live dismissal is one edit: "New file" and "Clear splits" ask, and Clear splits and New file drop it.
- [x] A second press leaves out the pairs dismissed and still live. A dismissed duplicate counts as a non-duplicate, so it can have partial matches once ticket 06 lands.
- [x] The counts in the line drop a dismissed match.
- [x] Store specs and track list specs cover each case.
- [x] `CHANGELOG.md` has the line under Unreleased.

## Comments

Built 2026-11-25. No "By ear" box here, so no browser check.

- **`dismissMatch(startSplitId, keptStartSplitId)`** takes the two tracks by their start splits (null for the first track) and refuses a pair that is no live match, so ticket 06 can dismiss a partial match the same way. `Track.duplicateOf` gained `startSplitId` (the kept copy's start split) for the button and the toggle; ticket 06 replaces that object with the live-matches list.
- **A dismissal is stored like a match**: both tracks with their start split, start and end. It is live while both still hold those ends, so a split moved away and back revives it, as it does a match. The edit count adds the live dismissals, so a dismissal whose tracks changed is no edit of its own (the edit that changed them is).
- **The finding function takes the live dismissals** (`MatchInput.dismissed`, indices with the earlier track as `kept`). A dismissed pair is not compared, so it joins no recording, and it is never given as a match. Only that exact pair: with 01, 03 and 04 the same recording and 03 dismissed against 01, a second press gives 03 no match and 04 still names 01. `liveMatches` also drops a dismissed pair, so an answer that still holds one (a fake that ignores the request) shows none.
- **The eye button and `X` on a duplicate dismiss its match** (`toggleLeftOut` does it for a track whose inclusion is `duplicate`). A track left out by hand that also has a match (inclusion `by-hand`) toggles as before: the first press brings it back to `duplicate`, the second dismisses. That is the spec's "bring back", read per press; say so if it should dismiss at once.
- **The dismiss button** is a `UiIconButton` `sm` (X, "Dismiss the match of track N") beside the words with `-my-1`, so the row grows by a few pixels at most. Not looked at in the browser (no By ear box); DESIGN.md has the line.
- **Specs**: store (`find-duplicates.spec.ts`: dismissing, bringing a duplicate back, edits, Clear splits and New file, a second press), `TrackList.spec.ts` (button, label, stops the click, by-hand, the eye button) and `TrackView.spec.ts` (`X`).
- Docs left to ticket 08. No GLOSSARY or ADR candidates beyond the earlier tickets'; "Dismissed pair" may be worth a line when GLOSSARY.md's Match entry is revisited (it already says a match lasts until dismissed).
