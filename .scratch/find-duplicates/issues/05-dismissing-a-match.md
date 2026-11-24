# 05: Dismissing a match

**What to build:** a dismiss button beside each match's words in the track list. Dismissing a duplicate's match exports the track again. A track left out by hand stays out. Bringing a duplicate back with the eye button or `X` dismisses its match. A dismissal is one edit, and a second press does not find a dismissed match again while neither track's ends have changed.

**Blocked by:** 04 (a dismissal lives exactly as long as a match does).

**Status:** ready-for-agent

Spec: `.scratch/find-duplicates/spec.md` (stories 42–48; Implementation Decisions, "The split store", `dismissMatch` and bringing a duplicate back, and "Track list").

- [ ] The dismiss button:
  - it sits beside the words, can be reached with Tab and has a label naming the track;
  - it stops the row's click.
- [ ] A dismissed duplicate is `included` and exported. A dismissed match on a track left out by hand leaves it `by-hand`.
- [ ] The left-out toggle on a duplicate:
  - the eye button and `X` in the Track view dismiss its match;
  - leaving a duplicate out by hand is not possible, as it is already out;
  - leaving out a dismissed duplicate sets `by-hand` as today.
- [ ] A dismissal stores the pair and both tracks' ends. It is live while those ends are unchanged.
- [ ] A live dismissal is one edit: "New file" and "Clear splits" ask, and Clear splits and New file drop it.
- [ ] A second press leaves out the pairs dismissed and still live. A dismissed duplicate counts as a non-duplicate, so it can have partial matches once ticket 06 lands.
- [ ] The counts in the line drop a dismissed match.
- [ ] Store specs and track list specs cover each case.
- [ ] `CHANGELOG.md` has the line under Unreleased.
