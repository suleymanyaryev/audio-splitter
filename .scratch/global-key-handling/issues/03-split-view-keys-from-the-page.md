# 03: Split view keys work wherever the focus is

**What to build:** In the Split view, Left/Right (Shift for the bigger step), Delete/Backspace and Space move, delete and audition the selected split wherever the focus is on the review screen: after a click on a track-list row, on a split line in the whole-file view, or right after applying pending splits lands on the first new split. A key pressed with Ctrl, Cmd or Alt now does nothing in the Split view, as in the other two views (Cmd+Backspace no longer deletes a split, Alt+Left no longer moves it).

The view registers its handler through the page-level keys composable (ticket 01), passing its frame as its own root, so the split handle (a `role="slider"`) is never treated as a control that keeps the arrows. The handle stays focusable with its `aria-value*` for screen readers. The Review page stops handing focus to the handle: the view's exposed `focusHandle`, its callers (Add split, Delete split) and the deferred focus after applying pending splits all go, and so does the frame's `tabindex="-1"`.

The `canvas-view` skill's keyboard section is rewritten to describe the page-level composable and the view-on-show rule, instead of keys going to a focused `role="slider"` and a page button handing the keyboard back through `defineExpose`.

**Blocked by:** 01 (Page-level keys composable)

**Status:** resolved

- [ ] Every existing key case in the Split view spec passes with the key dispatched on the document instead of the handle
- [ ] In `ReviewPage.spec`, after a click on a split's track-list row with the focus on the body, Left moves the selected split 10 ms and Shift+Right 100 ms
- [ ] After applying pending splits, Right moves the first new split without anything being focused
- [ ] After Add split or Delete split, the arrows move the newly selected split
- [ ] Cmd+Backspace and Alt+Left change nothing in the Split view
- [ ] With the handle focused by Tab, Left and Right move the split exactly as with the focus elsewhere
- [ ] The handle keeps `tabindex="0"`, `role="slider"` and its `aria-value*`; the Review page has no focus hand-back to it
- [ ] The `canvas-view` skill's keyboard section matches the new model
- [ ] Task and Checkpoint checks pass
