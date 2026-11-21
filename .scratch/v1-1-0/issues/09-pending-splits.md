# 09: Pending splits

**What to build:** in the Track view the user marks where new tracks should start, as **pending splits**, and applies them together. "Add pending split" (enabled with a mark) and Enter add one at the mark and select it; Shift+Enter adds one where the playhead is, without selecting it, so tapping along a playing track takes every tap. A pending split is refused within 1 s of another or of the track's ends. A press within 6 px of one selects it: it is drawn as selected, "Delete pending split" appears, Delete or Backspace deletes it, Escape or a click elsewhere deselects it, and "Add pending split" is disabled meanwhile. "Apply", enabled while any exist, turns them all into splits (each an added split) and shows the Split view with the first new split selected and centred. Pending splits are drawn only in the Track view, kept across view switches while the track stays selected, and, until ticket 10, dropped silently when the track stops being selected or its ends change. "Export track…" is disabled while the track has pending splits.

**Blocked by:** 08 (Track view: mark and double-click), 06 (Single export of a track)

**Status:** resolved

Spec: `.scratch/v1-1-0/spec.md` (stories 24, 76–93)

- [ ] The split store holds the pending splits of the selected track and an optional selected one: add at a time with or without selecting, the 1 s rule, refused at the mark while one is selected, delete, deselect, apply; emptied when the selection stops being that track, its start or end split moves or goes, a detection runs, or the store resets.
- [ ] The press helper's order gains pending splits: playhead, else a pending split (select), else the mark (deselecting).
- [ ] The Track view draws pending splits in a look no split, mark or playhead has, the selected one heavier, and takes Enter, Shift+Enter, Delete, Backspace and Escape; held keys add one only.
- [ ] The Track view's title row: Add pending split (Enter), Apply, Delete pending split (Delete, only while one is selected), as icon buttons with tooltips; Export track… disabled with the tooltip "Apply or delete pending splits first".
- [ ] The shortcuts dialog's Track view section follows.
- [ ] Specs: the split store's pending-split rules, apply and emptying; the press helper's order; the Track view's keys; the review page's buttons and enabled states.
- [ ] Checked by hand in Chrome: tapping Shift+Enter along a playing track over 10 min, then Apply.
- [ ] DESIGN.md gains the pending split's look; `docs/architecture.md` follows; CHANGELOG line under Unreleased (Added).
