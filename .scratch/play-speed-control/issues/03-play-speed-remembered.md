# 03: Play speed remembered across a reload

**What to build:** the play speed set on the page is still there after a reload, as the volume is. On a first visit, with a broken or out-of-range saved value, or with blocked storage, it starts at 1.0 and the control still works for the session.

**Blocked by:** 02 (the store's play speed)

**Status:** blocked

Spec: `.scratch/play-speed-control/spec.md` (stories 24–27; Implementation Decisions, "Tickets 02 and 03", the saving bullets; Testing Decisions)

- [ ] The play speed is saved on every change under its own storage key, separate from the volume's.
- [ ] Reading it back accepts only a value in range and on the 0.1 grid. Anything else gives 1.0: none saved, not JSON, off the grid, under 0.5, over 2.0, a string, not an object. Every read and write is wrapped, as for the volume.
- [ ] Audition store spec:
  - a change is saved and a fresh store reads it back;
  - a table of bad saved values gives 1.0, like the volume's table;
  - blocked storage gives 1.0 and doesn't throw on save.
- [ ] Checked by hand in Chrome: the play speed is back after a reload. One line is added to note 10's Chrome section.
- [ ] Docs: the README's list of what is remembered adds the play speed. The architecture doc's line on what is saved in `localStorage` adds it too. The audition store's header comment says the play speed is kept between visits.

## Comments
