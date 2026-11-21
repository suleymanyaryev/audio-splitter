# 04: Next to Silence layout and states

**What to build:** the screens get Next to Silence's room and rhythm, and every control behaves the same way. 32 px page margins, 24 px gutters and a 56 px header; small corners; the split's time as the one large 32 px figure; consistent hover, focus, active and disabled states; and a selected split lit in rust in the whole-file view, the track list and the strip at once. Covers the load screen, the review screen and the dialogs. Build it through the `impeccable` skill against the direction contract and the chosen sketch (`.impeccable/mocks/decision/assigned.html`).

**Blocked by:** 03

**Status:** ready-for-agent

Spec: `.scratch/ui-polish/spec.md` (stories 19–23, 31–40; Implementation Decisions, "Issue 2")

- [ ] Radii 3 px on controls and 4 px on panels; 32 px page margins, 24 px gutters, 16 px panel padding, a 56 px header; the 4 px base unit stays.
- [ ] The split's time in the Split view is one 32 px figure, from a new text-size token.
- [ ] Only pressable things are slate: Play is the zoom panel's one filled control, and "Export to folder…" is the strongest button on the screen.
- [ ] The track strip: slate blocks on the sea-mist ground with a rust rule at each split.
- [ ] Selecting a split shows rust in the whole-file view, the track list's row and the strip's split item at once.
- [ ] Colour transitions of about 120 ms on controls and on selection, off under `prefers-reduced-motion`.
- [ ] Hover, focus, active and disabled look the same on every kit component; nothing below 12 px; the focus ring visible on every ground and surface in both themes.
- [ ] Canvas drawing and layout inside a canvas unchanged.
- [ ] Every existing spec stays green; a spec checking a class this changes is updated to the new class, not loosened.
- [ ] Checked by hand in Chrome (`playwright-cli` skill) with a sample loaded, in both themes: the load screen, the review screen in all three views, the dialogs, and Tab through every control.
- [ ] `DESIGN.md`'s layout, shapes, motion and components sections describe the result; CHANGELOG: the Changed line from 03 widened to cover the layout, or a second line.
