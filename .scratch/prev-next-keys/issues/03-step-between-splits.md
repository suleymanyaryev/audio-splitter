# 03: Step between splits in the Split view

**What to build:** In the Split view with a selected split, `]` selects the next split and `[` the previous one, with the same selection a click makes: the zoom window centres on the new split, and the track list and the whole-file view follow. An audition that was on (playing or loading) starts again across the new split; none starts when none was on. The keys use the physical-key rule from ticket 01. Spec: `.scratch/prev-next-keys/spec.md`.

**Blocked by:** 01 (Step between tracks in the Track view)

**Status:** ready-for-agent

- [ ] `]` selects the next split and `[` the previous one; the zoom window centres on it and the zoom title shows its time.
- [ ] The split store has `selectAdjacentSplit(step)`, which goes through the existing split selection and returns whether the selection changed.
- [ ] An audition playing or loading before the step starts again across the new split; with none on, none starts.
- [ ] `[` on the first split and `]` on the last change nothing, raise no error, are not taken, and leave an audition that is on untouched.
- [ ] A press with Shift, a repeat, a press in a track name and a press while a dialog is open do nothing.
- [ ] The shortcuts dialog's Split view section lists `[ / ]`: "Select the previous or next split; an audition plays on from the new split".
- [ ] Cases in the Review page spec.
