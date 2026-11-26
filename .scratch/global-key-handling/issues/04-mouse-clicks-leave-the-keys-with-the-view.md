# 04: A mouse click leaves the keys with the view

**What to build:** A mouse press on a control no longer leaves the focus on it, so the next key goes to the view on show. After clicking Play, Space pauses instead of pressing Play again. After clicking the `Split | Track | Range` control, the arrows go to the new view instead of switching views again. After dragging the silence threshold, Left moves the playhead instead of nudging the threshold and replacing the edits.

This covers `UiButton`, `UiIconButton`, `UiSegmentedControl`, the `UiSlider` thumb, the track-list row buttons and the track-strip block buttons (the last two are plain buttons outside the kit). A control reached with Tab still takes the focus, shows its focus ring and keeps its native keys.

Reka's slider focuses its thumb itself during a pointer drag, so stopping the browser's focus on the mouse press may not be enough for `UiSlider`; it may have to let go of the thumb's focus when a pointer drag ends. Reka's radio group items in `UiSegmentedControl` get the same check.

**Blocked by:** 02 (Track view and Range view keys), 03 (Split view keys). The kit change stands alone, but these acceptance checks ("the next key acts on the view") only mean something once the views listen on the page.

**Status:** resolved

- [ ] Each kit spec (`UiButton`, `UiIconButton`, `UiSegmentedControl`, `UiSlider`) has a case where a mouse press leaves the focus off the control, and a case where a control focused as by Tab keeps its native keys and focus ring
- [ ] After a pointer drag on a slider thumb ends, the thumb doesn't have the focus
- [ ] In `ReviewPage.spec`, after a mouse click on Play in the Track view, Space pauses the track (no double toggle)
- [ ] In `ReviewPage.spec`, after a mouse click on the segmented control, Left acts on the view now on show
- [ ] In `ReviewPage.spec`, after a mouse click on a track-list row and on a track-strip block, Space acts on the view on show
- [ ] In `ReviewPage.spec`, after a drag on the silence-threshold slider, Left moves the playhead and the threshold stays where the drag left it
- [ ] Task and Checkpoint checks pass, then the Final tier (`pnpm verify`, `pnpm lint`, `pnpm knip`, `pnpm depcruise`) as the last ticket of the spec
