# Keys that work wherever the focus is

Status: resolved

Vocabulary is in `GLOSSARY.md`. While this was grilled, the glossary settled **Split view** as the name of the zoom panel's view of the zoom window ("zoom view" is now under _Avoid_). The decision and its rejected options are in `docs/adr/0002-keys-belong-to-the-view-on-show.md`.

## Problem Statement

The review screen's keys only work while the Split view's handle, the Track view or the Range view has the focus. Most of what I do on the screen moves the focus somewhere else: clicking the whole-file view, a row in the track list, a block in the track strip, the loudness settings or a button. After that, Space, Enter, the arrows, Home, Delete and Escape quietly do nothing, or press the last button I clicked again. I have to click back into the view before the keys work, and I usually notice only after a key has failed. Some buttons hand the focus back to the view after they act, but every other click still loses it.

## Solution

The keys belong to the view on show in the zoom panel (the Split view, the Track view or the Range view), wherever the focus is on the review screen. Clicking with the mouse leaves the keys with the view. The keys still step aside where they would get in the way:

- while I type in a text field, such as a track name,
- while a dialog is open,
- while I hold Ctrl, Cmd or Alt, which the browser keeps,
- while a control I reached with Tab uses that key itself, such as Space or Enter on a button, or the arrows on the slider.

What each key does in each view doesn't change. The shortcuts dialog's rows stay as they are.

## User Stories

### Keys follow the view on show

1. As a reviewer, I want Space to play or stop in the view on show wherever the focus is, so that I never have to click the view before listening.
2. As a reviewer, I want Left and Right (and Shift with them) to move the selected split in the Split view after I clicked a track-list row, so that I can fine-tune the split I just picked from the list.
3. As a reviewer, I want Left and Right to move the playhead in the Track view and in the Range view after I clicked anywhere else on the screen, so that moving through the sound never depends on where I last clicked.
4. As a reviewer, I want Enter and Shift+Enter to add a pending split in the Track view, or a split in the Range view, after I clicked a button in the zoom panel's title row, so that I can keep marking while I listen.
5. As a reviewer, I want Delete and Backspace to delete the selected split in the Split view, or the selected pending split in the Track view, wherever the focus is, so that deleting doesn't need a click first.
6. As a reviewer, I want Escape to let go of the selected pending split in the Track view wherever the focus is, so that letting go always works.
7. As a reviewer, I want Home to go back to the start of the track or the range wherever the focus is, so that replaying from the start always works.
8. As a reviewer, I want the keys to switch to the new view as soon as the `Split | Track | Range` control, a selection or a dragged range changes which view is on show, so that the keys always do what the view in front of me says.
9. As a reviewer, I want the keys to keep working after I click a track-strip block, so that picking a track there doesn't cost me the keyboard.
10. As a reviewer, I want the keys to keep working after I click or drag on the whole-file view, so that selecting a split or dragging out a range leads straight to keys in the view that opens.
11. As a reviewer, I want the keys to keep working after I drag the silence-threshold or minimum-gap slider, so that Left and Right move the playhead and don't nudge a setting and replace my edits.
12. As a reviewer, I want the keys to keep working after I click the volume slider or the mute button, so that adjusting what I hear doesn't take the keyboard away.
13. As a reviewer, I want the keys to keep working after I apply pending splits and land in the Split view on the first new split, so that I can fine-tune it with the arrows right away.
14. As a reviewer, I want a held Space not to start and stop the sound over and over, and a held Enter not to add many splits, as today, so that page-level keys keep the same repeat rules.
15. As a reviewer, I want a held Left or Right to keep moving, as today, so that I can move a long way by holding the key.

### Where the keys step aside

16. As a reviewer, I want Backspace, the arrows, Space and Home to edit the text while I'm typing a track name, so that renaming a track never deletes a split or starts the sound.
17. As a reviewer, I want Enter and Escape in a track name to save or put back the name, as today, and then hand the keys back to the view, so that I can carry on with the keys right after naming.
18. As a reviewer, I want no view key to act while any dialog is open (the shortcuts dialog, the discard-pending-splits question, the replace-your-edits question, the single-export name dialog), so that a key meant for the dialog never changes my splits behind it.
19. As a reviewer, I want Escape in a dialog to close only the dialog, so that it doesn't also let go of my selected pending split.
20. As a reviewer, I want Enter in the single-export name dialog to confirm the name, as today, so that the dialog's own keys are unchanged.
21. As a reviewer, I want keys pressed with Ctrl, Cmd or Alt to be left to the browser in all three views, so that Cmd+Left, Alt+Left and Cmd+Backspace never move or delete a split.
22. As a reviewer, I want Shift to keep its meanings (a bigger step with the arrows, the playhead with Enter), so that the modifier rule takes nothing away.

### Keyboard-only use

23. As a keyboard-only user, I want a button I reached with Tab to keep Space and Enter, so that I can press it the way a web page normally works.
24. As a keyboard-only user, I want the arrows, Home, Delete, Backspace and Escape to reach the view while a button I tabbed to has the focus, so that only the keys the button uses stay with it.
25. As a keyboard-only user, I want a slider I reached with Tab to keep its arrows and Home, so that I can still set the silence threshold, the minimum gap length and the volume from the keyboard.
26. As a keyboard-only user, I want the `Split | Track | Range` control to keep its arrow keys when I reached it with Tab, so that I can still switch views from the keyboard.
27. As a keyboard-only user, I want the keys to go back to the view once I Tab off a control or click elsewhere, so that I can always get back to the view without a special key.
28. As a screen-reader user, I want the Split view's split handle to stay focusable and to announce its time, so that I can still find and move the selected split with assistive technology.
29. As a keyboard-only user, I want the Split view's handle, when I tabbed to it, to take the same keys the view takes, so that focusing it never changes what a key does.
30. As a keyboard-only user, I want the Track view and Range view frames to stop being tab stops, so that Tab doesn't stop on something that gives me nothing the keys don't already give.

### Mouse clicks leave the keys alone

31. As a reviewer, I want a mouse click on any button in the zoom panel, the track list, the track strip, the loudness settings or the header not to leave the focus on that button, so that my next Space plays instead of pressing the button again.
32. As a reviewer, I want a mouse click on the segmented control not to keep the focus, so that the arrows go to the new view and don't switch views again.
33. As a reviewer, I want a mouse drag on a slider thumb to leave the keys with the view once the drag ends, so that the slider doesn't keep the arrows.
34. As a reviewer, I want buttons to keep their focus ring when I reach them with Tab, so that keyboard focus stays visible.

### `?` and the "Saved" line

35. As a reviewer, I want `?` to open the shortcuts dialog under the same rules as the other keys (not while typing, not while another dialog is open, not with Ctrl, Cmd or Alt), so that all page-level keys behave alike.
36. As a reviewer, I want the "Saved … in …" line to clear when a view acts on a key, as it does today when I press a key in the panel, so that it goes away once I'm back at work.
37. As a reviewer, I want the "Saved … in …" line to stay after a key no view acts on (Tab, or a letter), so that moving around the page doesn't clear it by accident.
38. As a reviewer, I want a press in the zoom panel to keep clearing the "Saved … in …" line, as today, so that the pointer behaviour is unchanged.

### Scope of the screen

39. As a reviewer, I want the load page to have none of these keys, so that pressing Space while choosing a file does nothing unexpected.
40. As a reviewer, I want Space to keep not scrolling the page, and the arrows to keep not scrolling it, while a view acts on them, so that the screen doesn't jump.

## Implementation Decisions

- **The rule.** One view of the zoom panel is on show at a time, and only that one is mounted. The mounted view owns the review screen's keys. There's no priority order and no memory of a previous view. When the view on show changes, the owner changes with it, because ownership follows mounting.
- **One shared page-level key composable, in a new `shared/lib/keyboard` slice.** A component calls it while mounted with its key handler. The composable listens on the document and applies the shared rules before calling the handler:
  - a key pressed with Ctrl, Cmd or Alt never reaches the handler; Shift does,
  - a key whose target is a text field, select or contenteditable never reaches it,
  - nothing reaches it while any element with the dialog or alertdialog role is on the page,
  - a key never reaches it while a control that uses that key itself has the focus: Space and Enter on a button, the arrows and Home/End on a slider, the arrows on a radio group.
  
  The component can pass its own root element. Anything inside that root is never treated as "a control that uses the key", so the Split view's `role="slider"` handle doesn't count. The handler signals whether it acted, which lets the screen clear the "Saved" line (see below), and which decides `preventDefault`.
- **`?` moves onto the composable.** The shortcuts dialog's `?` composable becomes a thin caller of the shared one, and its "typing" and "dialog open" checks move into the shared slice. AGENTS.md's slice list gains one line for `shared/lib/keyboard`.
- **The three views** (`SplitZoom`, `TrackView`, `RangeView` in `split-zoom`) register their existing key handlers through the composable instead of an element `keydown`. What each key does doesn't change. The Split view's handler gains the Ctrl/Cmd/Alt rule the Track and Range views already had, which the composable now applies to all three.
- **The focus hand-back code goes.** The Review page no longer hands focus back after a button acts: the stretch-view focus helper, the Split view's exposed focus of its handle, both views' exposed `focus`, and the deferred focus after applying pending splits are all removed. The Track and Range frames lose `tabindex="0"`, and the Split frame loses `tabindex="-1"`. The Split view's handle keeps `tabindex="0"`, `role="slider"` and its `aria-value*`.
- **A mouse press doesn't leave focus on a control.** This applies to `UiButton`, `UiIconButton`, `UiSegmentedControl`, the `UiSlider` thumb, the track-list row buttons and the track-strip block buttons. A control reached with Tab still takes focus, shows its focus ring and keeps its native keys. The track-list rows and track-strip blocks are plain buttons outside the kit, so they follow the same rule.
- **The "Saved … in …" line.** It clears on a press inside the zoom panel (unchanged) and on a key the view on show acted on. The keydown-capture on the zoom panel is replaced by the view reporting that it acted. A key no view acted on leaves the line in place.
- **Keyboard-only users** keep native behaviour on a control they tabbed to. Space and Enter stay with a focused button until they Tab off or click elsewhere. There's no special key for "give the keys back".
- **Docs.** The `canvas-view` skill's keyboard section, which says keys go to a focusable `role="slider"` element and that a page button hands the keyboard back through `defineExpose`, is rewritten to describe the composable and the view-on-show rule. `docs/architecture.md` and `README.md` say nothing about keys and stay as they are. `CHANGELOG.md` gets a line under `## [Unreleased]`: the review screen's keys work without clicking the view first.

## Testing Decisions

- A good test presses a key the way the user does and checks what the user sees or hears: a split moved or deleted, a pending split added, the sound started, a dialog closed, the "Saved" line gone. It never checks which listener ran or whether `focus()` was called.
- **`ReviewPage.spec` is the main seam.** It mounts the whole review screen attached to the document and already dispatches `?` on the page. New cases dispatch keys on the page with the focus in different places:
  - after a mouse press on a title-row button, a track-list row, a track-strip block and a slider, the view on show acts,
  - in a track name, Backspace edits the text and the split stays,
  - with each dialog open, the view does nothing and Escape closes only the dialog,
  - on a button reached with Tab, Space and Enter press the button and the arrows reach the view,
  - in the Split view, Cmd+Backspace and Alt+Left change nothing,
  - after a view switch (the segmented control, a track-list row, applying pending splits), the keys belong to the new view,
  - a key the view acts on clears the "Saved" line, and Tab or a letter doesn't.
- **The three view specs** (`SplitZoom.spec`, `TrackView.spec`, `RangeView.spec`) keep every existing key case, now dispatched on the document instead of on the frame or handle. They stay the owners of what each key does.
- **The kit specs** (`UiButton`, `UiIconButton`, `UiSegmentedControl`, `UiSlider`) each gain a case that a mouse press doesn't leave the focus on the control, and a case that a control focused as by Tab keeps its native keys. jsdom doesn't move focus on a mouse press by itself, so "doesn't take focus" is checked through what the component does with the press (and, for the slider, through the focus after a drag ends), not through jsdom's default.
- **The shared composable's spec** takes over `use-question-mark-key.spec` (prior art: it already covers typing and dialog-open with a mounted host component). It adds the Ctrl/Cmd/Alt rule, the Tab-focused-control rule per role, the own-root exemption, and that unmounting stops the handler.
- No new Playwright spec. The flows are covered by jsdom specs at the page seam, and `pnpm test:e2e` isn't part of this work's Final checks.

## Out of Scope

- New keys or new meanings for existing keys, in any view.
- Keys for the whole-file view or the track list (moving between splits or tracks from the keyboard).
- A priority stack or scopes for keys, for when two mounted parts of the screen want the same key.
- A key that gives the keys back to the view from a focused control (Escape-to-blur).
- Changes to the shortcuts dialog's rows or a note about focus in it.
- The load page.

## Further Notes

- Reka's slider focuses its thumb itself during a pointer drag, so stopping the browser's own focus on a mouse press may not be enough for `UiSlider`. The kit may have to let go of the thumb's focus when a pointer drag ends. The `UiSlider` spec case covers this whichever way it's done. Reka's radio group items in `UiSegmentedControl` should be checked the same way.
- Safari never focuses a button on a mouse click, so after this change Safari, Chrome and Firefox behave alike.
- Delete and Backspace now act without any focus. Text fields and dialogs are the only places they stay out, which is why the typing rule and the dialog rule are part of the composable and not left to each view.
