# 07: Mark and Add split in the Range view

**What to build:** a click in the Range view places the mark, a 1 px dashed ink line (the threshold line's dash), and focuses the view; it leaves playback alone. A click within 6 px of a split line selects that split instead (and switches to Split). Left and Right move the mark 100 ms, Shift+Left and Shift+Right 1 s, held inside the range. "Add split" in the Range view's title row, or Enter on the focused view, adds a split at the mark: it follows the 1 s rule from neighbours and the file's ends, is not selected, counts as an edit, and leaves the user in the Range view with playback going and the mark in place. A new range has no mark ("Add split" disabled) and a new drag clears it.

**Blocked by:** 04 (The Range view).

**Status:** ready-for-agent

Spec: `.scratch/select-section-and-play/spec.md` (stories 32–47)

- [ ] The split store holds the mark (seconds or none): none on a new range, held inside the range, kept after adding a split, cleared by `reset`; adding at the mark is its own action with a derived `canAddSplitAtMark`, separate from "Add split" at the window's centre.
- [ ] The Range view is focusable with slider-style ARIA on the mark; Left/Right/Shift and Enter work there.
- [ ] If ticket 06 has landed, the press order is playhead, then a split line, then the mark.
- [ ] Specs: the store's mark and add-at-mark rules (prior art: the split store spec); the press composable; the Range view's keys and ARIA; the review page's "Add split" enabled state in each view.
- [ ] CHANGELOG line; AGENTS.md rows for the split store, the split-zoom widget and the review page.
- [ ] Before committing, the diff is walked through in chat: what changed, why, and which glossary term or concept note each part rests on.
