# 04: Step from the zoom centre with no split selected

**What to build:** In the Split view with no selected split (after a click on empty ground in the whole-file view), `]` selects the first split after the zoom window's centre and `[` the last split before it, so the keys start from where the user is looking. With no split in that direction, or no splits in the source file, nothing happens and the key is not taken. Spec: `.scratch/prev-next-keys/spec.md`.

**Blocked by:** 03 (Step between splits in the Split view)

**Status:** resolved

- [x] With no selected split, `]` selects the first split after the zoom window's centre and centres the window on it.
- [x] With no selected split, `[` selects the last split before the zoom window's centre.
- [x] No split in that direction: nothing changes and the key is not taken.
- [x] A source file with no splits: nothing changes and the key is not taken.
- [x] Cases in the Review page spec, reaching the no-selection state the way the user does.

## Comments

- `selectAdjacentSplit` in the split store now takes the neighbour from the selected split, or, with none selected, from the zoom window's centre: the first split strictly after it for `]`, the last strictly before it for `[`. A split exactly at the centre is neither, so `]` skips it and `[` does not find it. It still goes through `selectSplit`, so the window centres on the split, and returns whether the selection changed.
- The handler in `SplitZoom.vue` is unchanged: an audition cannot be on with no selected split (the audition store's sync watch on the selected split ends it when the selection goes), so there is nothing to carry over from that state. A step from the centre therefore starts no sound, as in the spec's "none on, none starts".
- The specs reach the state with `moveZoomTo`, the store action the existing "no split selected" cases use for a click on empty ground in the whole-file view. They cover a centre before, between and past the splits, one lying on a split, and a file with all splits deleted.
- The shortcuts row (`[ / ]`: "Select the previous or next split; an audition plays on from the new split") is still true, so it is unchanged. The CHANGELOG line from tickets 01 to 03 is extended by one sentence, not duplicated.
