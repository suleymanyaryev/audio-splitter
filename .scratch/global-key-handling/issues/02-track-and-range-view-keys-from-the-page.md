# 02: Track view and Range view keys work wherever the focus is

**What to build:** In the Track view and the Range view, the existing keys (Space, Enter, Shift+Enter, Left/Right with Shift, Home, and in the Track view Delete/Backspace and Escape on the selected pending split) act wherever the focus is on the review screen: after a click on the whole-file view, a track-list row, a track-strip block or the loudness settings. They still stay out while a track name is being typed or a dialog is open. What each key does doesn't change.

The two views register their handlers through the page-level keys composable (ticket 01), passing their frame as their own root. The Review page stops handing focus back after its title-row buttons act. The stretch-view focus helper, both views' exposed `focus`, and the frames' `tabindex="0"` all go.

The "Saved … in …" line clears on a key the view on show acted on, replacing the zoom panel's keydown capture. A press in the panel still clears it, and a key no view acts on (Tab, a letter) leaves it.

`CHANGELOG.md` gets a line under `## [Unreleased]`: the review screen's keys work without clicking the view first.

**Blocked by:** 01 (Page-level keys composable)

**Status:** resolved

- [ ] Every existing key case in the Track view and Range view specs passes with the key dispatched on the document instead of the frame
- [ ] In `ReviewPage.spec`, with the Track view on show and the focus on the body after a click on a track-list row, Space plays the track and Enter adds a pending split at the mark
- [ ] In `ReviewPage.spec`, with the Range view on show, Left moves the playhead and Enter adds a split at the mark without the frame ever being focused
- [ ] Backspace typed in a track name edits the name and leaves the selected pending split in place
- [ ] With the discard-pending-splits question open, Escape closes only the question and the pending split stays selected
- [ ] After a single export, a key the view acts on clears the "Saved … in …" line, and Tab doesn't
- [ ] The Track and Range frames are no longer tab stops, and the Review page has no focus hand-back for them
- [ ] The `CHANGELOG.md` line is added
- [ ] Task and Checkpoint checks pass
