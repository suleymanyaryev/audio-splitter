# 04: First track after analysis

**What to build:** a freshly analysed file opens with track 1 selected in the Track view, ready to play, instead of the first split. A change of the silence threshold or the minimum gap length selects track 1 too: the Range view stays if it is on show, otherwise the Track view is shown. The zoom window starts at the file's start, so switching to the Split view shows the opening seconds with no split selected.

**Blocked by:** None (can start immediately)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 10–13)

- [ ] Detection selects track 1 (the first track, keyed by the file's start) and sets the zoom window's centre to the file's start.
- [ ] The first detection shows the Track view; a later one keeps the Range view if it is on show and shows the Track view otherwise.
- [ ] A file with no gaps (one track over the whole file) opens the same way.
- [ ] Specs (split store): the selection, window and view after the first and a later detection, with and without a range on show; the existing detection specs updated from "first split selected". Review page: the Track view after mount.
- [ ] CHANGELOG line under Unreleased (Changed).
