# 04: Step from the zoom centre with no split selected

**What to build:** In the Split view with no selected split (after a click on empty ground in the whole-file view), `]` selects the first split after the zoom window's centre and `[` the last split before it, so the keys start from where the user is looking. With no split in that direction, or no splits in the source file, nothing happens and the key is not taken. Spec: `.scratch/prev-next-keys/spec.md`.

**Blocked by:** 03 (Step between splits in the Split view)

**Status:** ready-for-agent

- [ ] With no selected split, `]` selects the first split after the zoom window's centre and centres the window on it.
- [ ] With no selected split, `[` selects the last split before the zoom window's centre.
- [ ] No split in that direction: nothing changes and the key is not taken.
- [ ] A source file with no splits: nothing changes and the key is not taken.
- [ ] Cases in the Review page spec, reaching the no-selection state the way the user does.
