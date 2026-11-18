# 04: The Range view

**What to build:** dropping a range switches the zoom panel to its Range view: the range's waveform stretched across a 160 px canvas whatever its length, with the lands and splits inside it, and the title `start – end · length` with hundredths in the panel's headline style. A `Split | Range` control in the panel's title row switches between the zoom view and the Range view; "Range" is disabled while there is no range. Selecting a split (a split line or plain click on the whole-file view, a track-list row, a track-strip block) or moving the zoom window switches back to Split. The zoom window's outline is drawn on the whole-file view only in Split; the range overlay in both. "New file" clears the range.

**Blocked by:** 03 (Drag a range on the whole-file view).

**Status:** resolved

Spec: `.scratch/select-section-and-play/spec.md` (stories 13–23, 61–62)

- [ ] The split store holds the panel's view (`split` or `range`): a new range switches to `range`; every split selection and `moveZoomTo` switch to `split`; `reset` returns to `split`.
- [ ] The Range view draws bars merged from the peaks over the range's buckets, the lands and the split lines in the range, on a time-to-x axis for the range; nothing is decoded.
- [ ] The `Split | Range` control follows DESIGN.md; if it becomes a new kit component it gets its spec and its AGENTS row.
- [ ] The review page swaps the zoom view and the Range view on the store's view, and titles the panel by a pure function (prior art: the zoom title).
- [ ] Specs: the store's view switching; the range axis, title and bars helpers; the review page's control (enabled state, switching) and the swap.
- [ ] CHANGELOG line; AGENTS.md rows for the split store, the split-zoom widget, the whole-file view and the review page.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or concept note each part rests on.
