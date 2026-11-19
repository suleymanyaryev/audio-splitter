# 03: Select a track and see it in the Track view

**What to build:** a click on a track's block in the strip, on its row in the Track list, on its number button, or focusing its name field selects that **track**, the first track included. The selected track's block and row are marked (the row scrolled into view), the whole-file view outlines its stretch, and the zoom panel switches to the new **Track view**: the track stretched across a 160 px canvas whatever its length, with its bars, gaps and two end splits, and the playhead at its start. The panel's title reads `name · start – end` with hundredths, and the control becomes `Split | Track | Range`, each segment disabled when it has nothing to show. A split and a track are never selected together: selecting either clears the other. Nothing plays yet (ticket 04).

**Blocked by:** 01 (One selection in the split store)

**Status:** resolved

Spec: `.scratch/split-markers-ranges-and-tracks-separation/spec.md` (stories 1–16, 36, 62, 64–66, 69–71)

- [ ] The split store selects a track (keyed by its start split, none for the first), derives the selected track from the live tracks so it follows a moved split, and switches the view to `track` without moving the zoom window's centre. `isTrackSelected` answers from the selection. Showing `track` with no selected track is refused.
- [ ] Selecting a split or moving the zoom window clears a selected track and switches to `split`; a detection clears it and selects the first split.
- [ ] The strip: every block, the first included, is a button that selects its track; the selected one has the 2 px `on-track` border.
- [ ] The Track list: row click, number button and name field focus select the track; the selected row is marked and scrolled into view. The trash button still deletes the start split for now (ticket 07 moves it).
- [ ] The Track view sits in the split-zoom widget beside the zoom view and the Range view, sharing their canvas helpers; a press near its end splits does not select them.
- [ ] The review page swaps three views on the store's view; the title row in Track has the control only until ticket 04 adds its buttons. The title comes from a pure title function.
- [ ] The control widens to three options; the Split segment with a track selected shows the zoom window where it was, with no split selected.
- [ ] The whole-file view outlines the selected track's stretch while the view is `track`; the zoom outline stays drawn only in `split`; its click and range drag are unchanged.
- [ ] Specs: the split store's track selection, view switching and detection rule; the track title helper; the strip's and the list's ARIA and store calls; the review page's three views and the control's disabled segments.
- [ ] CHANGELOG line under Unreleased; Milestone 9 added to the milestones doc; `docs/architecture.md` follows.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or spec decision each part rests on.
