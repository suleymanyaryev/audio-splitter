# 05: One resting place per subject

**What to build:** each subject keeps its own resting place (GLOSSARY.md: Playhead, "each view keeps its own"). The audition's is keyed by its split's id, as today. The track's is keyed by its key and ends. The range's is keyed by the range. The shared stretch slot goes. Playing the range, pausing it, showing the Track view and moving its playhead, then showing the Range view again, finds the range's playhead where it was paused.

**Blocked by:** 04.

Status: open

Spec: `.scratch/one-player-interface-that-knows-what-is-on-show/spec.md` (Implementation Decisions: one resting place per subject).

- [ ] Three places, one per subject, each tied to its identity; no shared stretch place remains.
- [ ] A seek, a pause or a stop on one subject never changes another's place.
- [ ] The watchers from ticket 04 clear only their own subject's place.
- [ ] Player spec: range paused, Track view's playhead moved, range resumes at its place; the same with the track and the range swapped; the audition's place across a stretch playing, as today.
- [ ] A view or page spec case covers the range's playhead surviving a visit to the Track view.
- [ ] `docs/architecture.md`'s Player section says each subject keeps its own place.
- [ ] `CHANGELOG.md` under Unreleased: each view keeps its own playhead, so visiting another view leaves it where it was.
